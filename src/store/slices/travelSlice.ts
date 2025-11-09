import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabase from '../../services/supabase';

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

      // 尝试保存到Supabase，但如果失败则直接返回模拟数据
      try {
        const { data, error } = await supabase
          .from('travel_plans')
          .insert([mockPlan])
          .select();

        if (error) {
          console.warn('Supabase保存失败，使用模拟数据：', error.message);
          return mockPlan; // 返回模拟数据
        }

        return data[0] as TravelPlan;
      } catch (supabaseError) {
        console.warn('Supabase操作异常，使用模拟数据：', (supabaseError as Error).message);
        return mockPlan; // 返回模拟数据
      }
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// 获取用户的所有行程计划
export const fetchTravelPlans = createAsyncThunk(
  'travel/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase获取数据失败，返回空数组：', error.message);
        return []; // 返回空数组而不是抛出错误
      }

      return data as TravelPlan[];
    } catch (error) {
      console.warn('Supabase操作异常，返回空数组：', (error as Error).message);
      return []; // 返回空数组而不是拒绝
    }
  }
);

// 更新行程计划
export const updateTravelPlan = createAsyncThunk(
  'travel/updatePlan',
  async ({ id, updates }: { id: string; updates: Partial<TravelPlan> }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data[0] as TravelPlan;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// 删除行程计划
export const deleteTravelPlan = createAsyncThunk(
  'travel/deletePlan',
  async (id: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
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