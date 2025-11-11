import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import store from './store'
import { initDatabase, initDatabaseFallback } from './services/initDatabase'
import './index.css'
import App from './App.tsx'

// 开发环境下引入调试工具
if (import.meta.env.DEV) {
  // @ts-ignore
  import('./services/browserDebug.js').catch((err: any) => {
    console.warn('调试工具加载失败:', err);
  });
}

// 应用初始化组件
const AppWithInit = () => {
  useEffect(() => {
    // 初始化数据库
    const setupDatabase = async () => {
      try {
        // 首先尝试使用RPC方法初始化数据库
        const success = await initDatabase();
        
        if (!success) {
          // 如果RPC方法失败，使用备用方法
          await initDatabaseFallback();
        }
      } catch (error) {
        console.error('数据库初始化失败:', (error as Error).message);
        // 即使数据库初始化失败，应用仍然可以运行（使用模拟数据）
      }
    };
    
    setupDatabase();
  }, []);
  
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={zhCN}>
        <AppWithInit />
      </ConfigProvider>
    </Provider>
  </StrictMode>,
)
