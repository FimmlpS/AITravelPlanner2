import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchTravelPlans, updateTravelPlan, deleteTravelPlan } from '../store/slices/travelSlice';
import MapView from '../components/MapView';
import type { TravelActivity } from '../store/slices/travelSlice';
import type { TravelPlan } from '../store/slices/travelSlice';

const TravelPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const plans = useAppSelector(state => state.travel.plans);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<TravelActivity | null>(null);

  // 查找当前行程
  const plan = plans.find(p => p.id === id);

  useEffect(() => {
    // 如果没有找到行程，尝试从数据库获取
    if (!plan && id) {
      dispatch(fetchTravelPlans(id));
    }
  }, [plan, id, dispatch]);

  useEffect(() => {
    // 设置默认选中的日期
    if (plan && plan.dailyItineraries.length > 0 && !selectedDate) {
      setSelectedDate(plan.dailyItineraries[0].date);
    }
  }, [plan, selectedDate]);

  // 获取选中日期的行程
  const selectedItinerary = plan?.dailyItineraries.find(d => d.date === selectedDate);

  const handleDeletePlan = () => {
    if (window.confirm('确定要删除这个行程吗？此操作不可撤销。')) {
      if (id) {
        dispatch(deleteTravelPlan(id))
          .then(() => {
            navigate('/');
          })
          .catch(error => {
            console.error('删除行程失败:', error);
          });
      }
    }
  };

  const handleStatusChange = (status: TravelPlan['status']) => {
    if (id && plan) {
      dispatch(updateTravelPlan({ id, updates: { status } }));
    }
  };

  const handleActivitySelect = (activity: TravelActivity) => {
    setSelectedActivity(activity);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 1440) {
      return `${Math.floor(minutes / 1440)}天 ${Math.floor((minutes % 1440) / 60)}小时`;
    } else if (minutes >= 60) {
      return `${Math.floor(minutes / 60)}小时 ${minutes % 60}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (!plan) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="travel-plan-detail">
      <div className="header">
        <h1>{plan.title}</h1>
        <div className="plan-meta">
          <span className="created-date">创建于: {formatDate(plan.createdAt)}</span>
          <span className="budget">预算: ¥{plan.totalBudget}</span>
          <span className="spent">已花费: ¥{plan.spentBudget}</span>
        </div>
        <div className="status-selector">
          <span>状态: </span>
          {(['planned', 'ongoing', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={plan.status === status ? 'active' : ''}
            >
              {status === 'planned' && '计划中'}
              {status === 'ongoing' && '进行中'}
              {status === 'completed' && '已完成'}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={() => navigate('/')} className="back-btn">
            返回列表
          </button>
          <button onClick={handleDeletePlan} className="delete-btn">
            删除行程
          </button>
        </div>
      </div>

      <div className="content">
        <div className="itinerary-section">
          <h2>行程安排</h2>
          <div className="date-tabs">
            {plan.dailyItineraries.map(itinerary => (
              <button
                key={itinerary.date}
                onClick={() => setSelectedDate(itinerary.date)}
                className={selectedDate === itinerary.date ? 'active' : ''}
              >
                {formatDate(itinerary.date)}
              </button>
            ))}
          </div>

          {selectedItinerary && (
            <div className="day-itinerary">
              <h3>{formatDate(selectedItinerary.date)} - 总花费: ¥{selectedItinerary.totalCost}</h3>
              <div className="activities-list">
                {selectedItinerary.activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`activity-item ${selectedActivity?.id === activity.id ? 'selected' : ''}`}
                    onClick={() => handleActivitySelect(activity)}
                  >
                    <div className="activity-header">
                      <span className="activity-time">{`${index + 1}`}</span>
                      <h4>{activity.name}</h4>
                      <span className={`activity-type ${activity.type}`}>
                        {activity.type === 'transport' && '交通'}
                        {activity.type === 'accommodation' && '住宿'}
                        {activity.type === 'attraction' && '景点'}
                        {activity.type === 'restaurant' && '餐厅'}
                      </span>
                    </div>
                    <div className="activity-details">
                      <p>{activity.description}</p>
                      {activity.address && <p className="address">{activity.address}</p>}
                      <div className="activity-meta">
                        <span>时长: {formatDuration(activity.duration)}</span>
                        <span>花费: ¥{activity.cost}</span>
                        {activity.rating && <span>评分: {activity.rating}⭐</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="map-section">
          <h2>地图视图</h2>
          <MapView 
            activities={selectedItinerary?.activities || []}
            dailyItinerary={selectedItinerary}
          />
        </div>
      </div>

      <style>{`
        .travel-plan-detail {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        .header h1 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .plan-meta {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          color: #666;
        }
        .status-selector {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-selector button {
          padding: 8px 16px;
          border: 1px solid #d9d9d9;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .status-selector button.active {
          background: #1890ff;
          color: white;
          border-color: #1890ff;
        }
        .actions {
          display: flex;
          gap: 10px;
        }
        .back-btn,
        .delete-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .back-btn {
          background: #f0f0f0;
          color: #333;
        }
        .delete-btn {
          background: #ff4d4f;
          color: white;
        }
        .content {
          display: flex;
          gap: 30px;
        }
        .itinerary-section {
          flex: 1;
        }
        .date-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 10px;
        }
        .date-tabs button {
          padding: 10px 15px;
          border: 1px solid #d9d9d9;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
        }
        .date-tabs button.active {
          background: #1890ff;
          color: white;
          border-color: #1890ff;
        }
        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .activity-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .activity-item:hover,
        .activity-item.selected {
          border-color: #1890ff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .activity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .activity-time {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1890ff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .activity-type {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: white;
        }
        .activity-type.transport {
          background: #13c2c2;
        }
        .activity-type.accommodation {
          background: #faad14;
        }
        .activity-type.attraction {
          background: #52c41a;
        }
        .activity-type.restaurant {
          background: #eb2f96;
        }
        .activity-meta {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          color: #666;
          font-size: 14px;
        }
        .map-section {
          width: 400px;
        }
        @media (max-width: 768px) {
          .content {
            flex-direction: column;
          }
          .map-section {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TravelPlanDetail;