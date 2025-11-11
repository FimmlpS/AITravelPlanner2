import React, { useState, useEffect, useCallback, useRef } from 'react';
import { List, Card, Button, Typography, Empty, Tag, Space, Popconfirm, message, Spin } from 'antd';
import { CalendarOutlined, DollarOutlined, UserOutlined, DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchTravelPlans, deleteTravelPlan, setCurrentPlan } from '../store/slices/travelSlice';
import type { TravelPlan } from '../store/slices/travelSlice';

const { Title, Text, Paragraph } = Typography;

interface TravelPlanListProps {
  onSelectPlan?: (plan: TravelPlan) => void;
}

const TravelPlanList: React.FC<TravelPlanListProps> = ({ onSelectPlan }) => {
  const dispatch = useAppDispatch();
  const { plans, isLoading } = useAppSelector(state => state.travel);
  const { isAuthenticated, user } = useAppSelector(state => state.user);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  
  // 防止重复请求的标记
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_INTERVAL = 5000; // 5秒内不重复加载，增加间隔时间
  const firstLoadRef = useRef(true); // 标记是否是首次加载
  
  // 防抖的加载函数
  const loadTravelPlans = useCallback(() => {
    // 检查是否在加载中
    if (isLoadingRef.current) {
      console.log('正在加载行程中，避免重复请求');
      return;
    }
    
    // 检查认证状态
    if (!isAuthenticated || !user) {
      console.log('用户未认证，跳过行程加载');
      return;
    }
    
    // 检查时间间隔，避免频繁请求
    // 首次加载不受间隔限制
    const now = Date.now();
    if (!firstLoadRef.current && now - lastLoadTimeRef.current < LOAD_INTERVAL) {
      console.log('请求过于频繁，跳过行程加载');
      return;
    }
    
    console.log('开始加载行程...');
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    
    dispatch(fetchTravelPlans(user.id)).unwrap()
      .catch(error => {
        console.error('加载行程失败:', error);
        // 避免频繁显示错误消息
        if (!isLoadingRef.current) return;
        
        // 只有在非"请求过于频繁"的错误时才显示错误消息
        if (error !== '请求过于频繁') {
          message.error('加载行程失败，请稍后重试');
        } else {
          console.log('请求过于频繁，静默处理');
        }
      })
      .finally(() => {
        // 确保无论成功失败都重置加载状态
        console.log('行程加载完成');
        isLoadingRef.current = false;
        firstLoadRef.current = false; // 标记首次加载已完成
      });
  }, [dispatch, isAuthenticated, user]);
  
  // 当认证状态或用户变化时重新加载行程
  useEffect(() => {
    // 只有在用户已认证且有用户信息时才加载
    if (isAuthenticated && user) {
      console.log('用户状态变化，触发行程加载');
      // 重置首次加载标记，以便新用户登录时能立即加载数据
      firstLoadRef.current = true;
      loadTravelPlans();
    }
    
    // 清理函数，防止组件卸载后仍在加载
    return () => {
      isLoadingRef.current = false;
    };
  }, [isAuthenticated, user, loadTravelPlans]); // 显式包含所有依赖
  
  // 处理选择行程
  const handleSelectPlan = (plan: TravelPlan) => {
    dispatch(setCurrentPlan(plan));
    onSelectPlan?.(plan);
    message.success(`已选择行程: ${plan.title}`);
  };
  
  // 处理删除行程
  const handleDeletePlan = async (planId: string, planTitle: string) => {
    try {
      await dispatch(deleteTravelPlan(planId)).unwrap();
      message.success(`成功删除行程: ${planTitle}`);
      // 如果删除的是当前展开的行程，清除展开状态
      if (expandedPlanId === planId) {
        setExpandedPlanId(null);
      }
    } catch (error) {
      console.error('删除行程失败:', error);
      message.error('删除行程失败，请稍后重试');
    }
  };
  
  // 切换行程详情展开状态
  const toggleExpand = (planId: string) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // 获取行程状态对应的标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'planned':
        return 'blue';
      case 'ongoing':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'default';
    }
  };
  
  // 获取行程状态对应的中文名称
  const getStatusName = (status: string) => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'planned':
        return '计划中';
      case 'ongoing':
        return '进行中';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="travel-plan-list loading">
        <Spin size="large" tip="加载行程中..." />
      </Card>
    );
  }
  
  if (plans.length === 0) {
    return (
      <Card className="travel-plan-list empty">
        <Empty description="暂无行程计划" />
        <Paragraph className="text-center mt-4">
          您还没有创建任何行程计划
        </Paragraph>
        <div className="text-center">
          <Button type="primary" onClick={() => document.getElementById('travel-planner-form')?.scrollIntoView({ behavior: 'smooth' })}>
            创建第一个行程
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="travel-plan-list">
      <Card className="plan-list-header">
        <div className="header-content">
          <Title level={3} className="m-0">我的行程列表</Title>
          <Text type="secondary">共 {plans.length} 个行程</Text>
        </div>
        
        {/* 快速选择子列表 - 简化版，减少渲染复杂度 */}
        {plans.length > 0 && (
          <Card className="quick-select-card mt-4">
            <div className="quick-select-header">
              <Text strong>快速选择行程：</Text>
            </div>
            <div className="quick-select-buttons">
              {plans.slice(0, 5).map((plan) => (
                <Button
                  key={plan.id}
                  size="small"
                  className="mr-2 mb-2"
                  onClick={() => handleSelectPlan(plan)}
                  title={`${plan.title} - ${plan.preferences.destination}`}
                >
                  {plan.title.length > 10 ? `${plan.title.substring(0, 10)}...` : plan.title}
                </Button>
              ))}
              {plans.length > 5 && (
                <Text type="secondary">还有 {plans.length - 5} 个行程...</Text>
              )}
            </div>
          </Card>
        )}
      </Card>
      
      {/* 行程详细列表 - 简化版本，避免过度渲染 */}
      {plans.length > 0 && (
        <div className="plan-detail-list mt-4">
          <Title level={4}>行程详情</Title>
          <List
            className="travel-plan-items"
            itemLayout="vertical"
            dataSource={plans}
            renderItem={(plan) => (
              <List.Item
                key={plan.id}
                className={`plan-item ${expandedPlanId === plan.id ? 'expanded' : ''}`}
                extra={
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleSelectPlan(plan)}
                    > 查看详情
                    </Button>
                    <Popconfirm
                      title="确定要删除这个行程吗？"
                      description="此操作不可撤销"
                      onConfirm={() => handleDeletePlan(plan.id, plan.title)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button danger size="small" icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <List.Item.Meta
                  title={
                    <div className="plan-header">
                      <div className="plan-main-info">
                        <Text strong className="plan-title">{plan.title}</Text>
                        <Tag color={getStatusColor(plan.status)} className="ml-2">
                          {getStatusName(plan.status)}
                        </Tag>
                      </div>
                      <Button
                        type="link"
                        icon={<ArrowRightOutlined className={`expand-icon ${expandedPlanId === plan.id ? 'expanded' : ''}`} />}
                        onClick={() => toggleExpand(plan.id)}
                      />
                    </div>
                  }
                  description={
                    <div className="plan-meta">
                      <Space size="middle">
                        <Space size="small">
                          <UserOutlined />
                          <Text type="secondary">{plan.preferences.peopleCount}人</Text>
                        </Space>
                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">{formatDate(plan.preferences.startDate)}</Text>
                        </Space>
                        <Space size="small">
                          <DollarOutlined />
                          <Text type="secondary">¥{plan.totalBudget}</Text>
                        </Space>
                      </Space>
                    </div>
                  }
                />
                
                {/* 展开时显示的详细信息 - 简化版 */}
                {expandedPlanId === plan.id && (
                  <div className="plan-details-expanded">
                    <div className="mt-2">
                      <p><strong>目的地：</strong>{plan.preferences.destination}</p>
                      <p><strong>行程天数：</strong>{plan.dailyItineraries.length} 天</p>
                    </div>
                  </div>
                )}
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
}


export default TravelPlanList;