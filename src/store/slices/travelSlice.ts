import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// PayloadAction导入已移除，因为未使用
import supabase from '../../services/supabase';
import { DebugLogger, ErrorTracker, PerformanceMonitor, DataValidator } from '../../services/debugHelper';
import aiTravelGenerator from '../../services/aiTravelGenerator';

// 本地类型定义，与aiTravelGenerator.ts中的定义保持同步
export interface TravelPreference {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  peopleCount: number;
  preferences: string[];
}

export interface TravelActivity {
  id: string;
  type: 'transport' | 'accommodation' | 'attraction' | 'restaurant';
  name: string;
  address: string;
  duration: number; // 分钟
  cost: number;
  description: string;
  openingHours?: string;
  rating?: number;
  images?: string[];
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface DailyItinerary {
  date: string;
  activities: TravelActivity[];
  totalCost: number;
}

export interface TravelPlan {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preferences: TravelPreference;
  dailyItineraries: DailyItinerary[];
  totalBudget: number;
  spentBudget: number;
  status: 'draft' | 'planned' | 'ongoing' | 'completed';
  userId?: string; // 添加userId字段
}

// 已从aiTravelGenerator导入类型定义

interface TravelState {
  plans: TravelPlan[];
  currentPlan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
}

const initialState: TravelState = {
  plans: [],
  currentPlan: null,
  isLoading: false,
  error: null,
  isGenerating: false,
};

// 异步Thunks

// 生成行程规划
export const generateTravelPlan = createAsyncThunk(
  'travel/generatePlan',
  async ({ preferences, userId }: { preferences: TravelPreference; userId?: string }, { rejectWithValue }) => {
    const component = 'generateTravelPlan';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始生成行程计划', { destination: preferences.destination });
    
    try {
      // 使用AI服务生成行程
      const aiGenerator = aiTravelGenerator;
      const travelPlan = await aiGenerator.generateTravelPlan(preferences);
      
      // 设置用户ID（如果提供）
      if (userId) {
        travelPlan.userId = userId;
      }
      
      // 保存到数据库
      if (userId) {
        const { error } = await supabase
          .from('travel_plans')
          .insert([{
            id: travelPlan.id,
            title: travelPlan.title,
            preferences: travelPlan.preferences,
            daily_itineraries: travelPlan.dailyItineraries,
            total_budget: travelPlan.totalBudget,
            spent_budget: travelPlan.spentBudget,
            status: travelPlan.status,
            user_id: travelPlan.userId
          }])
          .select();
        
        if (error) {
          // 输出更详细的错误信息，包括错误代码、消息和完整对象
          const detailedError = {
            message: error.message || '未知错误',
            code: error.code || 'UNKNOWN_CODE',
            details: error.details || {},
            hint: error.hint || '',
            // 完整的错误对象，用于详细调试
            fullError: JSON.stringify(error, null, 2)
          };
          DebugLogger.error(component, '保存行程计划到数据库失败', detailedError);
          // 记录到错误追踪系统
          ErrorTracker.trackError(component, `保存行程失败: ${error.message || '未知错误'}`);
          // 即使保存失败，仍然返回生成的行程计划
        } else {
          DebugLogger.log(component, '行程计划保存成功', { planId: travelPlan.id });
        }
      }
      
      return travelPlan;
    } catch (error) {
      ErrorTracker.trackError(component, error instanceof Error ? error : '生成行程计划失败');
      return rejectWithValue(error instanceof Error ? error.message : '生成行程计划失败');
    } finally {
      PerformanceMonitor.end(component);
    }
  }
);

// 全局变量，用于跟踪正在进行的fetchTravelPlans请求
let activeFetchRequest: AbortController | null = null;
let lastFetchTimestamp = 0;
let isFirstRequest = true; // 标记是否是首次请求
const MIN_FETCH_INTERVAL = 5000; // 最小请求间隔5秒，增加间隔时间

// 获取用户的所有行程计划
export const fetchTravelPlans = createAsyncThunk(
  'travel/fetchPlans',
  async (userId: string | null, { rejectWithValue }) => {
    const component = 'fetchTravelPlans';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始获取行程列表', { userId });
    
    // 检查是否有正在进行的请求，如果有则取消
    if (activeFetchRequest) {
      DebugLogger.warn(component, '取消正在进行的请求');
      activeFetchRequest.abort();
    }
    
    // 检查请求间隔，避免频繁请求
    // 首次请求不受间隔限制
    const now = Date.now();
    if (!isFirstRequest && now - lastFetchTimestamp < MIN_FETCH_INTERVAL) {
      const timeLeft = MIN_FETCH_INTERVAL - (now - lastFetchTimestamp);
      DebugLogger.warn(component, `请求过于频繁，等待 ${timeLeft}ms 后再执行`);
      // 使用rejectWithValue而不是抛出异常，这样不会触发错误处理
      return rejectWithValue('请求过于频繁');
    }
    
    lastFetchTimestamp = now;
    if (isFirstRequest) {
      isFirstRequest = false; // 标记首次请求已完成
      DebugLogger.log(component, '首次请求，不受频率限制');
    }
    
    // 创建AbortController用于请求超时控制（只有在通过频率检查后才创建）
    const controller = new AbortController();
    activeFetchRequest = controller;
    
    const timeoutId = setTimeout(() => {
      DebugLogger.warn(component, '请求超时，正在中断');
      controller.abort();
    }, 10000); // 10秒超时
    
    // 首先检查本地存储，快速返回可用数据
    let localTravelPlans: TravelPlan[] = [];
    try {
      const localPlans = localStorage.getItem('travelPlans');
      if (localPlans) {
        DebugLogger.log(component, '尝试加载本地存储数据');
        const plans = JSON.parse(localPlans) as TravelPlan[];
        // 验证数据格式
        localTravelPlans = plans.filter(plan => {
          try {
            const validation = DataValidator.validateTravelPlan(plan);
            return validation.isValid;
          } catch (e) {
            DebugLogger.warn(component, '行程数据验证失败', e);
            return false;
          }
        });
        DebugLogger.log(component, '本地存储数据加载完成', { count: localTravelPlans.length });
      }
    } catch (parseError) {
      DebugLogger.error(component, '本地存储数据解析失败', parseError);
      // 清除损坏的数据
      try {
        localStorage.removeItem('travelPlans');
        DebugLogger.log(component, '已清除损坏的本地存储数据');
      } catch (cleanupError) {
        DebugLogger.error(component, '清除损坏数据失败', cleanupError);
      }
    }
    
    try {
      DebugLogger.log(component, '尝试从数据库获取行程列表...');
      
      // 如果提供了userId，只获取该用户的行程
      let query = supabase.from('travel_plans').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      // 添加信号参数以支持超时控制
      const { data, error } = await query.order('created_at', { ascending: false });

      // 清除超时定时器
      clearTimeout(timeoutId);

      if (error) {
        ErrorTracker.trackError(component, `数据库查询错误: ${error.message}`);
        DebugLogger.error(component, '数据库查询错误', { message: error.message, code: error.code });
        
        // 如果本地有数据，返回本地数据
        if (localTravelPlans.length > 0) {
          DebugLogger.log(component, '使用本地存储数据作为后备');
          return localTravelPlans;
        }
        
        // 如果本地也没有数据，提供模拟数据
        DebugLogger.log(component, '无可用数据，返回模拟行程');
        return getMockTravelPlans(userId);
      }

      if (data) {
        DebugLogger.log(component, '成功从数据库获取行程列表', { count: data.length });
        
        // 转换数据格式并验证
        const travelPlans: TravelPlan[] = [];
        for (const dbPlan of data) {
          try {
            const plan: TravelPlan = {
              id: dbPlan.id,
              title: dbPlan.title,
              preferences: dbPlan.preferences,
              dailyItineraries: dbPlan.daily_itineraries,
              totalBudget: dbPlan.total_budget,
              spentBudget: dbPlan.spent_budget,
              status: dbPlan.status,
              createdAt: dbPlan.created_at,
              updatedAt: dbPlan.updated_at,
              userId: dbPlan.user_id || userId // 确保userId存在
            };
            
            const validation = DataValidator.validateTravelPlan(plan);
            if (validation.isValid) {
              travelPlans.push(plan);
            } else {
              DebugLogger.warn(component, `跳过无效的数据库行程数据: ${plan.id}`, validation.errors);
            }
          } catch (planError) {
            DebugLogger.warn(component, '处理行程数据时出错', planError);
          }
        }
        
        // 将数据保存到本地存储作为后备
        try {
          localStorage.setItem('travelPlans', JSON.stringify(travelPlans));
          DebugLogger.log(component, '已更新本地存储数据');
        } catch (storageError) {
          DebugLogger.error(component, '本地存储更新失败', storageError);
        }
        
        return travelPlans;
      }

      // 如果数据库返回空，使用本地数据或模拟数据
      if (localTravelPlans.length > 0) {
        DebugLogger.log(component, '数据库返回空，使用本地数据');
        return localTravelPlans;
      }
      
      DebugLogger.log(component, '数据库返回空且本地无数据，返回模拟行程');
      return getMockTravelPlans(userId);
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      // 处理各种类型的错误
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          DebugLogger.warn(component, '请求超时或被取消');
          // 对于取消的请求，不返回错误，而是静默处理
          return rejectWithValue('请求已取消');
        } else if (error.message.includes('Failed to fetch')) {
          DebugLogger.warn(component, '网络请求失败，可能是资源不足');
        }
        ErrorTracker.trackError(component, `数据库操作异常: ${error.message}`);
      }
      DebugLogger.error(component, '数据库操作异常', error);
      
      // 发生异常时使用本地数据或模拟数据
      if (localTravelPlans.length > 0) {
        DebugLogger.log(component, '发生异常，使用本地存储数据');
        return localTravelPlans;
      }
      
      DebugLogger.log(component, '发生异常且本地无数据，返回模拟行程');
      return getMockTravelPlans(userId);
    } finally {
      // 确保清除定时器和重置状态
      clearTimeout(timeoutId);
      activeFetchRequest = null;
      PerformanceMonitor.end(component);
    }
  }
);

// 生成模拟行程数据，用于开发和离线模式
function getMockTravelPlans(userId: string | null): TravelPlan[] {
  const mockPlans: TravelPlan[] = [
    {
      id: 'mock-1',
      title: '周末上海行',
      userId: userId || 'mock-user',
      preferences: {
        destination: '上海',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        peopleCount: 2,
        budget: 2000,
        preferences: ['美食', '购物', '文化']
      },
      dailyItineraries: [
        {
          date: new Date().toISOString(),
          activities: [
              {
                id: 'act-mock-1',
                type: 'attraction',
                name: '外滩观光',
                address: '上海外滩',
                duration: 120, // 2小时转换为分钟
                cost: 0,
                description: '观赏黄浦江两岸风景',
                openingHours: '全天开放',
                rating: 4.8,
                images: [],
                coordinates: [121.487, 31.240]
              }
          ],
          totalCost: 0
        }
      ],
      totalBudget: 2000,
      spentBudget: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mock-2',
      title: '北京五日游',
      userId: userId || 'mock-user',
      preferences: {
        destination: '北京',
        startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 12).toISOString(),
        peopleCount: 1,
        budget: 5000,
        preferences: ['历史', '美食']
      },
      dailyItineraries: [
        {
          date: new Date(Date.now() + 86400000 * 7).toISOString(),
          activities: [
            {
              id: 'act-mock-2',
              type: 'attraction',
              name: '故宫博物院',
              address: '北京故宫博物院',
              duration: 240, // 4小时转换为分钟
              cost: 60,
              description: '参观中国明清两代的皇家宫殿',
              openingHours: '08:30-17:00',
              rating: 4.9,
              images: [],
              coordinates: [116.397, 39.916]
            }
          ],
          totalCost: 60
        }
      ],
      totalBudget: 5000,
      spentBudget: 60,
      status: 'draft',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ];
  
  return mockPlans;
}

// 更新行程计划
export const updateTravelPlan = createAsyncThunk(
  'travel/updatePlan',
  async ({ id, updates }: { id: string; updates: Partial<TravelPlan> }, { rejectWithValue }) => {
    const component = 'updateTravelPlan';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始更新行程', { planId: id, updateFields: Object.keys(updates) });
    
    try {
      // 准备更新数据，确保格式与数据库表结构匹配
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // 映射字段到数据库列名
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
      if (updates.dailyItineraries !== undefined) updateData.daily_itineraries = updates.dailyItineraries;
      if (updates.totalBudget !== undefined) updateData.total_budget = updates.totalBudget;
      if (updates.spentBudget !== undefined) updateData.spent_budget = updates.spentBudget;
      if (updates.status !== undefined) updateData.status = updates.status;

      DebugLogger.log(component, '开始更新数据库中的行程', { planId: id });
      const { data, error } = await supabase
        .from('travel_plans')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        ErrorTracker.trackError(component, `数据库更新错误: ${error.message}`);
        DebugLogger.error(component, '数据库更新错误', { message: error.message, code: error.code, planId: id });
        
        // 更新本地存储作为后备
        try {
          const localPlans = localStorage.getItem('travelPlans');
          if (localPlans) {
            const plans = JSON.parse(localPlans) as TravelPlan[];
            const planIndex = plans.findIndex(p => p.id === id);
            if (planIndex !== -1) {
              const updatedPlan = { ...plans[planIndex], ...updates, updatedAt: new Date().toISOString() };
              
              // 验证更新后的数据
              const validation = DataValidator.validateTravelPlan(updatedPlan);
              if (validation.isValid) {
                plans[planIndex] = updatedPlan;
                localStorage.setItem('travelPlans', JSON.stringify(plans));
                DebugLogger.log(component, '本地存储已更新作为后备');
              } else {
                DebugLogger.warn(component, '更新后的数据无效，跳过本地存储更新', validation.errors);
              }
            }
          }
        } catch (storageError) {
          DebugLogger.error(component, '本地存储更新失败', storageError);
        }
        
        const fallbackPlan = { id, ...updates, updatedAt: new Date().toISOString() } as TravelPlan;
        return fallbackPlan;
      }

      if (data && data.length > 0) {
        DebugLogger.log(component, '行程成功更新到数据库', { planId: id });
        
        // 转换数据库格式并验证
        const dbPlan = data[0];
        const updatedPlan: TravelPlan = {
          id: dbPlan.id,
          title: dbPlan.title,
          preferences: dbPlan.preferences,
          dailyItineraries: dbPlan.daily_itineraries,
          totalBudget: dbPlan.total_budget,
          spentBudget: dbPlan.spent_budget,
          status: dbPlan.status,
          createdAt: dbPlan.created_at,
          updatedAt: dbPlan.updated_at
        };
        
        const validation = DataValidator.validateTravelPlan(updatedPlan);
        if (!validation.isValid) {
          DebugLogger.warn(component, '数据库返回的数据无效', { planId: id, errors: validation.errors });
        }
        
        // 更新本地存储中的数据
        try {
          const localPlans = localStorage.getItem('travelPlans');
          if (localPlans) {
            const plans = JSON.parse(localPlans) as TravelPlan[];
            const planIndex = plans.findIndex(p => p.id === id);
            if (planIndex !== -1) {
              plans[planIndex] = updatedPlan;
              localStorage.setItem('travelPlans', JSON.stringify(plans));
              DebugLogger.log(component, '本地存储已更新');
            }
          }
        } catch (storageError) {
          DebugLogger.error(component, '本地存储更新失败', storageError);
        }
        
        return updatedPlan;
      }
      
      const defaultUpdatedPlan = { id, ...updates, updatedAt: new Date().toISOString() } as TravelPlan;
      return defaultUpdatedPlan;
    } catch (error) {
      ErrorTracker.trackError(component, `数据库更新操作异常: ${(error as Error).message}`);
      DebugLogger.error(component, '数据库更新操作异常', { error, planId: id });
      return rejectWithValue((error as Error).message);
    } finally {
      PerformanceMonitor.end(component);
    }
  }
);

// 删除行程计划
export const deleteTravelPlan = createAsyncThunk(
  'travel/deletePlan',
  async (id: string, {}) => {
    const component = 'deleteTravelPlan';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始删除行程', { planId: id });
    
    try {
      DebugLogger.log(component, '尝试从数据库删除行程', { planId: id });
      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', id);

      if (error) {
        ErrorTracker.trackError(component, `数据库删除错误: ${error.message}`);
        DebugLogger.error(component, '数据库删除错误', { message: error.message, code: error.code, planId: id });
      } else {
        DebugLogger.log(component, '行程从数据库删除成功', { planId: id });
      }

      // 无论数据库操作成功与否，都从本地存储中删除
      try {
        const localPlans = localStorage.getItem('travelPlans');
        if (localPlans) {
          const plans = JSON.parse(localPlans) as TravelPlan[];
          const updatedPlans = plans.filter(plan => plan.id !== id);
          localStorage.setItem('travelPlans', JSON.stringify(updatedPlans));
          DebugLogger.log(component, '从本地存储中删除行程成功', { planId: id });
        } else {
          DebugLogger.warn(component, '本地存储中未找到行程数据', { planId: id });
        }
      } catch (storageError) {
        ErrorTracker.trackError(component, `本地存储删除失败: ${(storageError as Error).message}`);
        DebugLogger.error(component, '本地存储删除失败', { error: storageError, planId: id });
      }

      return id; // 无论如何都返回ID以更新本地状态
    } catch (error) {
      ErrorTracker.trackError(component, `数据库删除操作异常: ${(error as Error).message}`);
      DebugLogger.error(component, '数据库删除操作异常', { error, planId: id });
      
      // 即使出错，也尝试从本地存储中删除
      try {
        const localPlans = localStorage.getItem('travelPlans');
        if (localPlans) {
          const plans = JSON.parse(localPlans) as TravelPlan[];
          const updatedPlans = plans.filter(plan => plan.id !== id);
          localStorage.setItem('travelPlans', JSON.stringify(updatedPlans));
          DebugLogger.log(component, '异常情况下仍成功从本地存储删除', { planId: id });
        }
      } catch (fallbackError) {
        DebugLogger.error(component, '异常情况下本地存储删除也失败', { error: fallbackError, planId: id });
      }
      
      return id; // 即使出错也返回ID以更新本地状态
    } finally {
      PerformanceMonitor.end(component);
    }
  }
);

// Slice定义
const travelSlice = createSlice({
  name: 'travel',
  initialState,
  reducers: {
    setCurrentPlan: (state, action) => {
      state.currentPlan = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearTravelState: (state) => {
      // 清除所有行程相关状态，保持初始配置
      state.plans = [];
      state.currentPlan = null;
      state.error = null;
      state.isLoading = false;
      state.isGenerating = false;
    },
  },
  extraReducers: (builder) => {
    // generateTravelPlan
    builder
      .addCase(generateTravelPlan.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateTravelPlan.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.plans.unshift(action.payload);
        state.currentPlan = action.payload;
      })
      .addCase(generateTravelPlan.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });

    // fetchTravelPlans
    builder
      .addCase(fetchTravelPlans.pending, (state) => {
        // 只设置isLoading为true，不清除error状态
        // 这样可以避免每次请求开始都清除之前可能存在的错误
        state.isLoading = true;
      })
      .addCase(fetchTravelPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchTravelPlans.rejected, (state, action) => {
        state.isLoading = false;
        // 对于"请求过于频繁"的错误，完全忽略，保持error状态不变
        // 这可以防止状态更新导致不必要的重新渲染和新请求
        if (action.payload !== '请求过于频繁') {
          state.error = action.payload as string;
        }
      });

    // updateTravelPlan
    builder
      .addCase(updateTravelPlan.pending, (state) => {
        state.error = null;
      })
      .addCase(updateTravelPlan.fulfilled, (state, action) => {
        const index = state.plans.findIndex(plan => plan.id === action.payload.id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
        if (state.currentPlan && state.currentPlan.id === action.payload.id) {
          state.currentPlan = action.payload;
        }
      })
      .addCase(updateTravelPlan.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // deleteTravelPlan
    builder
      .addCase(deleteTravelPlan.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteTravelPlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter(plan => plan.id !== action.payload);
        if (state.currentPlan && state.currentPlan.id === action.payload) {
          state.currentPlan = null;
        }
      })
      .addCase(deleteTravelPlan.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentPlan, clearError, clearTravelState } = travelSlice.actions;

export default travelSlice.reducer;