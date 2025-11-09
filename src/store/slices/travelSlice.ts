import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// PayloadAction导入已移除，因为未使用
import supabase from '../../services/supabase';
import { DebugLogger, ErrorTracker, PerformanceMonitor, DataValidator } from '../../services/debugHelper';

// 类型定义
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
}

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
  async (preferences: TravelPreference, { rejectWithValue }) => {
    const component = 'generateTravelPlan';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始生成行程计划', { destination: preferences.destination });
    
    try {
      // 这里应该调用OpenAI API生成行程
      // 由于API密钥尚未提供，这里使用模拟数据
      const mockPlan: TravelPlan = {
        id: `plan-${Date.now()}`,
        title: `${preferences.destination} ${preferences.startDate} 旅行计划`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences,
        dailyItineraries: [
          {
            date: preferences.startDate,
            activities: [
              {
                id: 'act-1',
                type: 'transport',
                name: '机场到酒店',
                address: '',
                duration: 60,
                cost: 200,
                description: '从机场乘坐出租车到酒店',
              },
              {
                id: 'act-2',
                type: 'accommodation',
                name: '市中心酒店',
                address: preferences.destination + '市中心',
                duration: 1440,
                cost: 800,
                description: '舒适的市中心酒店，方便出行',
              },
              {
                id: 'act-3',
                type: 'restaurant',
                name: '当地特色餐厅',
                address: preferences.destination + '美食街',
                duration: 90,
                cost: 300,
                description: '品尝当地特色美食',
              },
            ],
            totalCost: 1300,
          },
        ],
        totalBudget: preferences.budget,
        spentBudget: 1300,
        status: 'planned',
      };

      // 计算总天数并生成多天行程
      const startDate = new Date(preferences.startDate);
      const endDate = new Date(preferences.endDate);
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      for (let i = 1; i <= dayCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        mockPlan.dailyItineraries.push({
          date: currentDate.toISOString().split('T')[0],
          activities: [
            {
              id: `act-${i}-1`,
              type: 'attraction',
              name: `当地景点 ${i}`,
              address: preferences.destination + `景区 ${i}`,
              duration: 180,
              cost: 150,
              description: `当地著名景点 ${i}`,
              openingHours: '09:00-17:00',
              rating: 4.5,
            },
            {
              id: `act-${i}-2`,
              type: 'restaurant',
              name: `特色餐厅 ${i}`,
              address: preferences.destination + `餐厅 ${i}`,
              duration: 90,
              cost: 250,
              description: `提供当地特色菜肴的餐厅 ${i}`,
            },
          ],
          totalCost: 400,
        });

        mockPlan.spentBudget += 400;
      }

      // 验证输入数据
      const validationResult = DataValidator.validateTravelPlan(mockPlan);
      
      if (!validationResult.isValid) {
        const errorMsg = `数据验证失败: ${validationResult.errors.join(', ')}`;
        ErrorTracker.trackError(component, errorMsg);
        DebugLogger.error(component, errorMsg);
        return rejectWithValue(errorMsg);
      }

      // 确保数据格式与数据库表结构匹配
      const planData = {
        title: mockPlan.title,
        preferences: mockPlan.preferences,
        daily_itineraries: mockPlan.dailyItineraries,
        total_budget: mockPlan.totalBudget,
        spent_budget: mockPlan.spentBudget,
        status: mockPlan.status,
        created_at: mockPlan.createdAt,
        updated_at: mockPlan.updatedAt
      };

      // 保存到Supabase数据库
      try {
        DebugLogger.log(component, '开始保存行程到数据库...', { title: planData.title });
        const { data, error } = await supabase
          .from('travel_plans')
          .insert([planData])
          .select();

        if (error) {
          ErrorTracker.trackError(component, `数据库保存错误: ${error.message}`);
          DebugLogger.error(component, '数据库保存错误', { message: error.message, code: error.code });
          
          // 发生错误时仍返回模拟数据，确保应用可以继续运行
          // 保存到本地存储作为后备
          try {
            const localPlans = localStorage.getItem('travelPlans') || '[]';
            const plans = JSON.parse(localPlans) as TravelPlan[];
            plans.push(mockPlan);
            localStorage.setItem('travelPlans', JSON.stringify(plans));
            DebugLogger.log(component, '使用模拟数据并保存到本地存储');
          } catch (localStorageError) {
            DebugLogger.error(component, '本地存储写入失败', localStorageError);
          }
          
          return mockPlan;
        }

        if (data && data.length > 0) {
          DebugLogger.log(component, '行程成功保存到数据库', { planId: data[0].id });
          
          // 返回数据库中的计划数据
          const result = {
            ...mockPlan,
            id: data[0].id
          };
          
          // 更新本地存储
          try {
            const localPlans = localStorage.getItem('travelPlans') || '[]';
            const plans = JSON.parse(localPlans) as TravelPlan[];
            plans.push(result);
            localStorage.setItem('travelPlans', JSON.stringify(plans));
            DebugLogger.log(component, '本地存储已更新');
          } catch (localStorageError) {
            DebugLogger.error(component, '本地存储更新失败', localStorageError);
          }
          
          return result;
        }
        
        // 如果没有返回数据，保存到本地存储
        try {
          const localPlans = localStorage.getItem('travelPlans') || '[]';
          const plans = JSON.parse(localPlans) as TravelPlan[];
          plans.push(mockPlan);
          localStorage.setItem('travelPlans', JSON.stringify(plans));
          DebugLogger.log(component, '保存模拟数据到本地存储');
        } catch (localStorageError) {
          DebugLogger.error(component, '本地存储写入失败', localStorageError);
        }
        
        return mockPlan;
      } catch (supabaseError) {
        ErrorTracker.trackError(component, `数据库操作异常: ${(supabaseError as Error).message}`);
        DebugLogger.error(component, '数据库操作异常', { message: (supabaseError as Error).message });
        
        // 发生异常时仍返回模拟数据，确保应用可以继续运行
        // 保存到本地存储作为后备
        try {
          const localPlans = localStorage.getItem('travelPlans') || '[]';
          const plans = JSON.parse(localPlans) as TravelPlan[];
          plans.push(mockPlan);
          localStorage.setItem('travelPlans', JSON.stringify(plans));
        } catch (localStorageError) {
          DebugLogger.error(component, '本地存储写入失败', localStorageError);
        }
        
        return mockPlan;
      }
    } catch (error) {
      ErrorTracker.trackError(component, (error as Error).message);
      DebugLogger.error(component, '生成行程时发生错误', error);
      return rejectWithValue((error as Error).message);
    } finally {
      PerformanceMonitor.end(component);
    }
  }
);

// 获取用户的所有行程计划
export const fetchTravelPlans = createAsyncThunk(
  'travel/fetchPlans',
  async (_, {}) => {
    const component = 'fetchTravelPlans';
    PerformanceMonitor.start(component);
    DebugLogger.log(component, '开始获取行程列表');
    
    try {
      DebugLogger.log(component, '尝试从数据库获取行程列表...');
      const { data, error } = await supabase
        .from('travel_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        ErrorTracker.trackError(component, `数据库查询错误: ${error.message}`);
        DebugLogger.error(component, '数据库查询错误', { message: error.message, code: error.code });
        
        // 尝试从本地存储获取数据作为后备
        try {
          const localPlans = localStorage.getItem('travelPlans');
          if (localPlans) {
            DebugLogger.log(component, '使用本地存储的行程数据作为后备');
            const plans = JSON.parse(localPlans) as TravelPlan[];
            // 验证数据格式
            const validPlans = plans.filter(plan => {
              const validation = DataValidator.validateTravelPlan(plan);
              if (!validation.isValid) {
                DebugLogger.warn(component, `跳过无效的行程数据: ${plan.id}`, validation.errors);
              }
              return validation.isValid;
            });
            return validPlans;
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
        
        return []; // 返回空数组
      }

      if (data) {
        DebugLogger.log(component, '成功从数据库获取行程列表', { count: data.length });
        
        // 转换数据格式并验证
        const travelPlans: TravelPlan[] = [];
        for (const dbPlan of data) {
          const plan: TravelPlan = {
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
          
          const validation = DataValidator.validateTravelPlan(plan);
          if (validation.isValid) {
            travelPlans.push(plan);
          } else {
            DebugLogger.warn(component, `跳过无效的数据库行程数据: ${plan.id}`, validation.errors);
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

      return [];
    } catch (error) {
      ErrorTracker.trackError(component, `数据库操作异常: ${(error as Error).message}`);
      DebugLogger.error(component, '数据库操作异常', error);
      
      // 发生异常时尝试从本地存储获取数据
      try {
        const localPlans = localStorage.getItem('travelPlans');
        if (localPlans) {
          DebugLogger.log(component, '使用本地存储的行程数据作为后备');
          const plans = JSON.parse(localPlans) as TravelPlan[];
          // 验证数据格式
          const validPlans = plans.filter(plan => {
            const validation = DataValidator.validateTravelPlan(plan);
            return validation.isValid;
          });
          return validPlans;
        }
      } catch (fallbackError) {
        DebugLogger.error(component, '本地存储后备获取失败', fallbackError);
      }
      
      return [];
    } finally {
      PerformanceMonitor.end(component);
    }
  }
);

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
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTravelPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchTravelPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
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

export const { setCurrentPlan, clearError } = travelSlice.actions;

export default travelSlice.reducer;