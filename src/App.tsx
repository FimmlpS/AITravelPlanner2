import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, Typography, message, Button } from 'antd'
import { HomeOutlined, CalendarOutlined, DollarOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons'
import './App.css'
import TravelPlannerForm from './components/TravelPlannerForm'
import TravelPlanDetail from './components/TravelPlanDetail'
import TravelPlanList from './components/TravelPlanList'
import ExpenseStatistics from './components/ExpenseStatistics'
import AuthPage from './pages/AuthPage'
import { useAppDispatch, useAppSelector } from './store'
import { fetchTravelPlans, clearTravelState } from './store/slices/travelSlice'
import { fetchCurrentUser, logoutUser } from './store/slices/userSlice'

const { Header, Content, Sider } = Layout
const { Title } = Typography

// 主应用组件，包含所有受保护的内容
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('1');
  const dispatch = useAppDispatch();
  const { currentPlan } = useAppSelector(state => state.travel);
  const { user } = useAppSelector(state => state.user);

  // 当用户已认证时加载行程
  const loadUserTravelPlans = () => {
    if (user) {
      dispatch(fetchTravelPlans(user.id)).unwrap()
        .catch(error => {
          console.error('加载行程失败:', error);
          // 只有在非"请求过于频繁"的错误时才显示错误消息
          if (error !== '请求过于频繁') {
            message.error('加载行程失败，请稍后重试');
          }
        });
    }
  };

  // 在受保护组件内加载行程数据
  useEffect(() => {
    loadUserTravelPlans();
  }, [dispatch, user]);

  const [apiResponseData, setApiResponseData] = useState<any>(null);

  // 处理行程生成后的回调
  const handlePlanGenerated = (responseData?: any) => {
    if (responseData) {
      setApiResponseData(responseData);
    }
    message.success('行程已生成，现在为您显示详情');
    setActiveTab('1');
  };

  // 处理菜单选择
  const handleMenuSelect = ({ key }: { key: string }) => {
    setActiveTab(key);
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      // 清除行程状态
      dispatch(clearTravelState());
      // 即使登出API调用失败，我们也希望用户能够退出登录
      await dispatch(logoutUser()).unwrap();
      message.success('已成功登出');
    } catch (error) {
      // 即使有错误，也不显示错误消息，因为我们的auth.ts已经处理了这种情况
      // 我们仍然希望用户能够退出登录，所以不阻止导航
      console.warn('登出过程中出现问题，但继续登出流程:', error);
      message.success('已成功登出');
    }
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    if (activeTab === '1') {
      return (
        <div className="content-container">
          <div className="flex justify-between items-center mb-4">
            <Title level={2} className="mb-0">欢迎使用AI旅行规划师，{user?.name || user?.email}</Title>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={loadUserTravelPlans}
            >
              刷新行程
            </Button>
          </div>
          <p>请输入您的旅行需求，AI将为您生成个性化的旅行计划。</p>
          
          {/* 行程规划表单 */}
          <TravelPlannerForm onPlanGenerated={handlePlanGenerated} />
          
          {/* API响应数据展示区域 */}
          {apiResponseData && (
            <div className="mt-6 bg-gray-50 p-4 rounded border border-gray-200">
              <Title level={3}>API响应数据</Title>
              <div className="overflow-auto max-h-96">
                <pre className="text-sm">{JSON.stringify(apiResponseData, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* 行程详情（如果有生成的行程） */}
          {currentPlan && (
            <div className="mt-6">
              <Title level={3}>行程详情</Title>
              <TravelPlanDetail />
            </div>
          )}
        </div>
      );
    } else if (activeTab === '2') {
      return (
        <div className="content-container">
          <div className="flex justify-between items-center mb-4">
            <Title level={2} className="mb-0">我的行程</Title>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={loadUserTravelPlans}
            >
              刷新行程
            </Button>
          </div>
          <TravelPlanList onSelectPlan={(plan) => {
            message.success(`已选择行程: ${plan.title}`);
            // 可以在这里添加额外的处理，比如滚动到详情部分
          }} />
          {currentPlan && (
            <div className="mt-8">
              <Title level={3}>行程详情</Title>
              <TravelPlanDetail />
            </div>
          )}
        </div>
      );
    } else if (activeTab === '3') {
      return (
        <div className="content-container">
          <ExpenseStatistics />
        </div>
      );
    } else if (activeTab === '4') {
      return (
        <div className="content-container">
          <Title level={2}>个人中心</Title>
          <div>
            <h3>用户信息</h3>
            <p>用户名：{user?.name}</p>
            <p>邮箱：{user?.email}</p>
            <button type="button" className="ant-btn ant-btn-primary ant-btn-dangerous" onClick={handleLogout}>
              登出
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout className="app-layout">
      <Header className="header">
        <div className="logo">AI旅行规划师</div>
        <div className="user-info">
          <span>欢迎，{user?.name || user?.email}</span>
        </div>
      </Header>
      <Layout>
        <Sider width={250} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            style={{ height: '100%', borderRight: 0 }}
            onSelect={handleMenuSelect}
            items={[
              { key: '1', icon: <HomeOutlined />, label: '首页' },
              { key: '2', icon: <CalendarOutlined />, label: '我的行程' },
              { key: '3', icon: <DollarOutlined />, label: '费用统计' },
              { key: '4', icon: <UserOutlined />, label: '个人中心' },
            ]}
          />
        </Sider>
        <Layout>
          <Content className="content">
            {renderMainContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

// 认证路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(state => state.user);
  
  // 在ProtectedRoute中检查用户登录状态，而不是在App根组件中
  useEffect(() => {
    // 检查用户登录状态
    dispatch(fetchCurrentUser());
  }, [dispatch]);
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route 
          path="/app/*" 
          element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

