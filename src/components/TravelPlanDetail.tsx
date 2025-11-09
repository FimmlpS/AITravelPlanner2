import React from 'react';
import { Card, Typography, List, Descriptions, Tag, Button, Empty, Space } from 'antd';
import { CalendarOutlined, DollarOutlined, UserOutlined, ClockCircleOutlined, StarOutlined, CoffeeOutlined, HomeOutlined, CarOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useAppSelector } from '../store';
import { type TravelPlan, type DailyItinerary, type TravelActivity } from '../store/slices/travelSlice';

const { Title, Text, Paragraph } = Typography;


interface TravelPlanDetailProps {
  plan?: TravelPlan | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TravelPlanDetail: React.FC<TravelPlanDetailProps> = ({ plan, onEdit, onDelete }) => {
  const currentPlan = plan || useAppSelector(state => state.travel.currentPlan);

  // 获取活动类型的图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transport':
        return <CarOutlined />;
      case 'accommodation':
        return <HomeOutlined />;
      case 'attraction':
        return <StarOutlined />;
      case 'restaurant':
        return <CoffeeOutlined />;
      default:
        return <StarOutlined />;
    }
  };

  // 获取活动类型的标签颜色
  const getActivityTagColor = (type: string) => {
    switch (type) {
      case 'transport':
        return 'blue';
      case 'accommodation':
        return 'purple';
      case 'attraction':
        return 'green';
      case 'restaurant':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 格式化持续时间
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  if (!currentPlan) {
    return (
      <Card className="travel-plan-detail">
        <Empty description="暂无行程计划" />
        <Paragraph className="text-center">请先生成一个旅行计划</Paragraph>
      </Card>
    );
  }

  return (
    <div className="travel-plan-detail">
      {/* 行程头部信息 */}
      <Card className="plan-header-card">
        <Space direction="vertical" className="w-full">
          <Space className="w-full justify-between" wrap>
            <div>
              <Title level={2} className="m-0">{currentPlan.title}</Title>
              <Text type="secondary">创建于 {new Date(currentPlan.createdAt).toLocaleDateString()}</Text>
            </div>
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                编辑
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
                删除
              </Button>
              <Button icon={<ShareAltOutlined />}>
                分享
              </Button>
            </Space>
          </Space>

          <Descriptions column={2} bordered>
            <Descriptions.Item label="目的地">
              <Tag color="blue" className="mr-1">{currentPlan.preferences.destination}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="时间">
              <CalendarOutlined className="mr-1" /> {currentPlan.preferences.startDate} 至 {currentPlan.preferences.endDate}
            </Descriptions.Item>
            <Descriptions.Item label="预算">
              <DollarOutlined className="mr-1" /> 总预算：¥{currentPlan.totalBudget} | 已规划：¥{currentPlan.spentBudget}
            </Descriptions.Item>
            <Descriptions.Item label="人数">
              <UserOutlined className="mr-1" /> {currentPlan.preferences.peopleCount}人
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Text strong>旅行偏好：</Text>
            {currentPlan.preferences.preferences.map((pref, index) => (
              <Tag key={index} className="mr-1">{pref}</Tag>
            ))}
          </div>
        </Space>
      </Card>

      {/* 每日行程 */}
      <div className="daily-itineraries">
        <Title level={3}>每日行程</Title>
        {currentPlan.dailyItineraries.map((day: DailyItinerary, index: number) => (
          <Card key={index} title={`第${index + 1}天 (${day.date})`} className="daily-itinerary-card mb-4">
            <div className="mb-3">
              <Text type="secondary">当日总费用：</Text>
              <Text strong>¥{day.totalCost}</Text>
            </div>
            
            <List
              itemLayout="vertical"
              dataSource={day.activities}
              renderItem={(activity: TravelActivity) => (
                <List.Item
                  actions={[
                    <Tag key="type" color={getActivityTagColor(activity.type)} icon={getActivityIcon(activity.type)}>
                      {activity.type === 'transport' ? '交通' :
                       activity.type === 'accommodation' ? '住宿' :
                       activity.type === 'attraction' ? '景点' : '餐饮'}
                    </Tag>,
                    <Space key="duration">
                      <ClockCircleOutlined /> {formatDuration(activity.duration)}
                    </Space>,
                    <Text key="cost" strong>¥{activity.cost}</Text>,
                    activity.rating && (
                      <Space key="rating">
                        <StarOutlined />
                        <Text>{activity.rating}</Text>
                      </Space>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={activity.name}
                    description={
                      <div>
                        {activity.address && <Text type="secondary">地址：{activity.address}</Text>}
                        {activity.openingHours && (
                          <Text type="secondary" className="ml-2">营业时间：{activity.openingHours}</Text>
                        )}
                        <Paragraph>{activity.description}</Paragraph>
                      </div>
                    }
                  />
                  {activity.images && activity.images.length > 0 && (
                    <div className="activity-images">
                      {activity.images.slice(0, 3).map((img, idx) => (
                        <img key={idx} src={img} alt={`${activity.name}图片${idx + 1}`} style={{ width: 100, height: 100, marginRight: 8 }} />
                      ))}
                    </div>
                  )}
                </List.Item>
              )}
            />
          </Card>
        ))}
      </div>

      {/* 行程统计 */}
      <Card title="行程统计" className="mt-4">
        <Descriptions column={2}>
          <Descriptions.Item label="总天数">
            {currentPlan.dailyItineraries.length}天
          </Descriptions.Item>
          <Descriptions.Item label="总活动数">
            {currentPlan.dailyItineraries.reduce((total, day) => total + day.activities.length, 0)}个
          </Descriptions.Item>
          <Descriptions.Item label="预算使用率">
            {Math.round((currentPlan.spentBudget / currentPlan.totalBudget) * 100)}%
          </Descriptions.Item>
          <Descriptions.Item label="行程状态">
            <Tag color={
              currentPlan.status === 'draft' ? 'default' :
              currentPlan.status === 'planned' ? 'blue' :
              currentPlan.status === 'ongoing' ? 'processing' : 'success'
            }>
              {currentPlan.status === 'draft' ? '草稿' :
               currentPlan.status === 'planned' ? '已规划' :
               currentPlan.status === 'ongoing' ? '进行中' : '已完成'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default TravelPlanDetail;