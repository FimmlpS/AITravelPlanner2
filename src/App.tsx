import { Layout, Menu, Typography } from 'antd'
import { HomeOutlined, CalendarOutlined, DollarOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'
import './App.css'
import TravelPlannerForm from './components/TravelPlannerForm'

const { Header, Content, Sider } = Layout
const { Title } = Typography

function App() {
  // 处理行程生成后的回调
  const handlePlanGenerated = () => {
    // 这里可以添加行程生成后的逻辑，例如跳转到行程详情页
    console.log('行程已生成');
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="logo">AI旅行规划师</div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
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
            defaultSelectedKeys={['1']}
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
            <div className="content-container">
              <Title level={2}>欢迎使用AI旅行规划师</Title>
              <p>请输入您的旅行需求，AI将为您生成个性化的旅行计划。</p>
              
              {/* 行程规划表单 */}
              <TravelPlannerForm onPlanGenerated={handlePlanGenerated} />
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App
