import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import travelReducer from './slices/travelSlice';
import userReducer from './slices/userSlice';

// 未来会添加更多的slice
const store = configureStore({
  reducer: {
    travel: travelReducer,
    user: userReducer,
    // 这里将添加各个功能模块的reducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 使用自定义的hooks来避免每次都导入类型
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <TSelected>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector(selector);

export default store;