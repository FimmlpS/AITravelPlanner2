import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, Typography, message } from 'antd'
import { HomeOutlined, CalendarOutlined, DollarOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'
import './App.css'
import TravelPlannerForm from './components/TravelPlannerForm'
import TravelPlanDetail from './components/TravelPlanDetail'
import AuthPage from './pages/AuthPage'
import { useAppDispatch, useAppSelector } from './store'
import { fetchTravelPlans } from './store/slices/travelSlice'
import { fetchCurrentUser, logoutUser } from './store/slices/userSlice'

const { Header, Content, Sider } = Layout
const { Title } = Typography

function App() {
  const [activeTab, setActiveTab] = useState('1');
  const dispatch = useAppDispatch();
  const { currentPlan } = useAppSelector(state => state.travel);
  const { isAuthenticated, user } = useAppSelector(state => state.user);

  // 初始化时检查用户登录状态和加载数据
  useEffect(() => {
    // 检查用户登录状态
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // 当用户已认证时加载行程
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchTravelPlans()).unwrap()
        .catch(error => {
          console.error('加载行程失败:', error);
        });
    }
  }, [dispatch, isAuthenticated]);

  // 处理行程生成后的回调
  const handlePlanGenerated = () => {
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
      await dispatch(logoutUser()).unwrap();
      message.success('已成功登出');
    } catch (error) {
      message.error('登出失败，请稍后重试');
    }
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    if (activeTab === '1') {
      return (
        <div className="content-container">
          <Title level={2}>欢迎使用AI旅行规划师，{user?.name || user?.email}</Title>
          <p>请输入您的旅行需求，AI将为您生成个性化的旅行计划。</p>
          
          {/* 行程规划表单 */}
          <TravelPlannerForm onPlanGenerated={handlePlanGenerated} />
          
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
          <Title level={2}>我的行程</Title>
          <p>这里将显示您的所有旅行计划。</p>
          {/* 后续将实现行程列表功能 */}
          {currentPlan ? (
            <TravelPlanDetail />
          ) : (
            <p>暂无行程计划，请先创建一个旅行计划。</p>
          )}
        </div>
      );
    } else if (activeTab === '3') {
      return (
        <div className="content-container">
          <Title level={2}>费用统计</Title>
          <p>这里将显示您的旅行费用统计。</p>
          {/* 后续将实现费用统计功能 */}
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

  // 认证路由组件
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/auth" replace />;
    }
    return <>{children}</>;
  };

  // 主应用组件
  const MainApp = () => (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="logo">AI旅行规划师</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[activeTab]}
          onSelect={handleMenuSelect}
          items={[
            { key: '1', icon: <HomeOutlined />, label: '首页' },
            { key: '2', icon: <CalendarOutlined />, label: '行程管理' },
            { key: '3', icon: <DollarOutlined />, label: '预算管理' },
            { key: '4', icon: <UserOutlined />, label: '个人中心' },
          ]}
        />
      </Header>
      <Layout>
        <Sider width={250} className="app-sider" theme="light">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onSelect={handleMenuSelect}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              { key: '1', icon: <HomeOutlined />, label: '快速规划' },
              { key: '2', icon: <CalendarOutlined />, label: '我的行程' },
              { key: '3', icon: <DollarOutlined />, label: '费用统计' },
              { key: '4', icon: <UserOutlined />, label: '个人中心' },
            ]}
          />
        </Sider>
        <Layout className="app-content-wrapper">
          <Content className="app-content">
            {renderMainContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );

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
  )
}

export default App
