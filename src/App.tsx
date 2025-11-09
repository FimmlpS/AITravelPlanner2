import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, message } from 'antd'
import { HomeOutlined, CalendarOutlined, DollarOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'
import './App.css'
import TravelPlannerForm from './components/TravelPlannerForm'
import TravelPlanDetail from './components/TravelPlanDetail'
import { useAppDispatch, useAppSelector } from './store'
import { fetchTravelPlans } from './store/slices/travelSlice'

const { Header, Content, Sider } = Layout
const { Title } = Typography

function App() {
  const [activeTab, setActiveTab] = useState('1');
  const dispatch = useAppDispatch();
  const { currentPlan } = useAppSelector(state => state.travel);

  // 初始化时加载用户行程
  useEffect(() => {
    dispatch(fetchTravelPlans()).unwrap()
      .catch(error => {
        console.error('加载行程失败:', error);
      });
  }, [dispatch]);

  // 处理行程生成后的回调
  const handlePlanGenerated = () => {
    message.success('行程已生成，现在为您显示详情');
    setActiveTab('1');
  };

  // 处理菜单选择
  const handleMenuSelect = ({ key }: { key: string }) => {
    setActiveTab(key);
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    if (activeTab === '1') {
      return (
        <div className="content-container">
          <Title level={2}>欢迎使用AI旅行规划师</Title>
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
          <Title level={2}>设置</Title>
          <p>这里将显示应用设置。</p>
          {/* 后续将实现设置功能 */}
        </div>
      );
    }
    return null;
  };

  return (
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
              { key: '4', icon: <SettingOutlined />, label: '设置' },
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
  )
}

export default App
