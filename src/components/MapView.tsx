import React, { useEffect, useRef } from 'react';
import MapService from '../services/mapService';
import type { TravelActivity, DailyItinerary } from '../store/slices/travelSlice';

interface MapViewProps {
  activities?: TravelActivity[];
  dailyItinerary?: DailyItinerary;
  onLocationSelect?: (location: { name: string; address: string; coordinates: [number, number] }) => void;
}

const MapView: React.FC<MapViewProps> = ({ activities = [], onLocationSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<typeof MapService | null>(null);

  useEffect(() => {
    // 初始化地图服务
    if (!mapServiceRef.current && mapContainerRef.current) {
      mapServiceRef.current = MapService;
      mapServiceRef.current.initMap(mapContainerRef.current.id || 'map-container');
    }

    return () => {
      // 清理地图实例
      if (mapServiceRef.current) {
        mapServiceRef.current.clearMap();
        mapServiceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // 当活动列表变化时，在地图上显示标记
    if (mapServiceRef.current && activities.length > 0) {
      mapServiceRef.current.clearMap();
      
      activities.forEach(activity => {
        if (activity.coordinates && activity.coordinates.length === 2) {
          mapServiceRef.current?.addMarker(activity.coordinates, {
            title: activity.name,
            content: `${activity.name}\n${activity.address}\n${activity.description}`,
            type: activity.type
          });
        } else if (activity.address) {
          // 如果没有坐标但有地址，尝试进行地理编码
          // 地址解析功能暂时不可用，跳过地理编码
          console.log(`跳过地址解析: ${activity.address}`);
        }
      });

      // 调整地图视野以显示所有标记
      if (activities.some(a => a.coordinates)) {
        const validCoordinates = activities
          .filter(a => a.coordinates)
          .map(a => a.coordinates!);
        if (validCoordinates.length > 0) {
          // 调整地图中心到第一个坐标
          if (validCoordinates[0]) {
            mapServiceRef.current.setCenter(validCoordinates[0]);
            mapServiceRef.current.setZoom(12);
          }
        }
      }
    }
  }, [activities]);

  useEffect(() => {
    // 为标记添加点击事件监听
    // 标记点击事件监听暂时不可用
  }, [onLocationSelect]);

  const handleRoutePlanning = () => {
    // 为当前行程日的活动规划路线
    if (mapServiceRef.current && activities.length > 0) {
      const validCoordinates = activities
        .filter(a => a.coordinates)
        .map(a => a.coordinates!);
      
      if (validCoordinates.length > 1) {
        // 多点路线规划暂时不可用
          console.log('多点路线规划功能暂未实现');
      }
    }
  };

  const handleCurrentLocation = () => {
    // 获取当前位置并显示在地图上
    if (mapServiceRef.current) {
      // 使用locate方法替代getCurrentLocation
      mapServiceRef.current.locate()
        .then((coordinates: [number, number]) => {
          mapServiceRef.current?.setCenter(coordinates);
          mapServiceRef.current?.addMarker(coordinates, {
            title: '当前位置',
            content: '您的当前位置',
            type: 'current'
          });
        })
        .catch((error: any) => {
          console.error('获取当前位置失败:', error);
        });
    }
  };

  return (
    <div className="map-container">
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '400px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #e0e0e0'
        }}
      />
      <div className="map-controls">
        <button 
          onClick={handleCurrentLocation}
          className="map-control-btn"
          style={{
            padding: '8px 16px',
            margin: '8px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          定位当前位置
        </button>
        <button 
          onClick={handleRoutePlanning}
          className="map-control-btn"
          disabled={activities.length < 2}
          style={{
            padding: '8px 16px',
            margin: '8px',
            backgroundColor: activities.length < 2 ? '#cccccc' : '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: activities.length < 2 ? 'not-allowed' : 'pointer'
          }}
        >
          规划路线
        </button>
      </div>
    </div>
  );
};

export default MapView;