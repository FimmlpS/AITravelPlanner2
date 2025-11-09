import React, { useEffect, useRef } from 'react';
import MapService from '../services/mapService';
import type { TravelActivity, DailyItinerary } from '../store/slices/travelSlice';

interface MapViewProps {
  activities?: TravelActivity[];
  dailyItinerary?: DailyItinerary;
  onLocationSelect?: (location: { name: string; address: string; coordinates: [number, number] }) => void;
}

const MapView: React.FC<MapViewProps> = ({ activities = [], dailyItinerary, onLocationSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<typeof MapService | null>(null);

  useEffect(() => {
    // 初始化地图服务
    if (!mapServiceRef.current && mapContainerRef.current) {
      mapServiceRef.current = MapService;
      mapServiceRef.current.initMap(mapContainerRef.current.id || '');
    }

    return () => {
      // 清理地图实例
      if (mapServiceRef.current) {
        mapServiceRef.current.destroyMap();
        mapServiceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // 当活动列表变化时，在地图上显示标记
    if (mapServiceRef.current && activities.length > 0) {
      mapServiceRef.current.clearMarkers();
      
      activities.forEach(activity => {
        if (activity.coordinates && activity.coordinates.length === 2) {
          mapServiceRef.current?.addMarker(activity.coordinates, {
            title: activity.name,
            content: `${activity.name}\n${activity.address}\n${activity.description}`,
            type: activity.type
          });
        } else if (activity.address) {
          // 如果没有坐标但有地址，尝试进行地理编码
          mapServiceRef.current?.geocodeAddress(activity.address)
            .then((coordinates: [number, number]) => {
              if (coordinates && mapServiceRef.current) {
                mapServiceRef.current.addMarker(coordinates, {
                  title: activity.name,
                  content: `${activity.name}\n${activity.address}\n${activity.description}`,
                  type: activity.type
                });
              }
            })
            .catch((error: any) => {
              console.error(`无法获取地址坐标: ${activity.address}`, error);
            });
        }
      });

      // 调整地图视野以显示所有标记
      if (activities.some(a => a.coordinates)) {
        const validCoordinates = activities
          .filter(a => a.coordinates)
          .map(a => a.coordinates!);
        if (validCoordinates.length > 0) {
          mapServiceRef.current.fitBounds(validCoordinates);
        }
      }
    }
  }, [activities]);

  useEffect(() => {
    // 为标记添加点击事件监听
    if (mapServiceRef.current && onLocationSelect) {
      mapServiceRef.current.onMarkerClick((info: { name: string; address: string; coordinates: [number, number] }) => {
        onLocationSelect(info);
      });
    }
  }, [onLocationSelect]);

  const handleRoutePlanning = () => {
    // 为当前行程日的活动规划路线
    if (mapServiceRef.current && activities.length > 0) {
      const validCoordinates = activities
        .filter(a => a.coordinates)
        .map(a => a.coordinates!);
      
      if (validCoordinates.length > 1) {
        mapServiceRef.current?.calculateMultiPointRoute(validCoordinates)
          .then((route: any) => {
            console.log('路线规划成功:', route);
          })
          .catch((error: any) => {
            console.error('路线规划失败:', error);
          });
      }
    }
  };

  const handleCurrentLocation = () => {
    // 获取当前位置并显示在地图上
    if (mapServiceRef.current) {
      mapServiceRef.current.getCurrentLocation()
        .then((position: { longitude: number; latitude: number }) => {
          if (position) {
            mapServiceRef.current?.setCenter([position.longitude, position.latitude]);
            mapServiceRef.current?.addMarker([position.longitude, position.latitude], {
              title: '当前位置',
              content: '您的当前位置',
              type: 'current'
            });
          }
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