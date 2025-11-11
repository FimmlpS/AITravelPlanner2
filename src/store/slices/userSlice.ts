import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import authService from '../../services/auth';

// 用户类型定义
export interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

// 注册请求类型
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// 登录请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsConfirmation: boolean;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsConfirmation: false,
}

// 异步Thunks

// 用户注册
export const registerUser = createAsyncThunk(
  'user/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    const result = await authService.register(data);
    if (result.error) {
      return rejectWithValue({
        error: result.error,
        needsConfirmation: result.needsConfirmation || false
      });
    }
    return {
      user: result.user,
      needsConfirmation: result.needsConfirmation
    };
  }
);

// 用户登录
export const loginUser = createAsyncThunk(
  'user/login',
  async (data: LoginRequest, { rejectWithValue }) => {
    const result = await authService.login(data);
    if (result.error) {
      return rejectWithValue({
        error: result.error,
        needsConfirmation: result.needsConfirmation || false
      });
    }
    return {
      user: result.user,
      needsConfirmation: result.needsConfirmation
    };
  }
);

// 用户登出
export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    const result = await authService.logout();
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return true;
  }
);

// 获取当前用户
export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return rejectWithValue('未登录');
    }
    return user;
  }
);

// 更新用户信息
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (data: Partial<Pick<User, 'name'>>, { rejectWithValue }) => {
    const result = await authService.updateUser(data);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.user;
  }
);

// Slice定义
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.needsConfirmation = false;
    },
    clearConfirmationStatus: (state) => {
      state.needsConfirmation = false;
    },
  },
  extraReducers: (builder) => {
    // registerUser
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.needsConfirmation = false;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.needsConfirmation = action.payload.needsConfirmation;
        // 只有当不需要确认时才设置为已认证
        state.isAuthenticated = !action.payload.needsConfirmation;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as { error: string; needsConfirmation: boolean };
        state.error = payload.error;
        state.needsConfirmation = payload.needsConfirmation;
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.needsConfirmation = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.needsConfirmation = action.payload.needsConfirmation;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as { error: string; needsConfirmation: boolean };
        state.error = payload.error;
        state.needsConfirmation = payload.needsConfirmation;
      });

    // logoutUser
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        // 行程相关状态的清除在App.tsx的handleLogout函数中处理
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchCurrentUser
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, _action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        // 不设置error，因为未登录不是错误状态
      });

    // updateUserProfile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, clearError, clearConfirmationStatus } = userSlice.actions;

export default userSlice.reducer;