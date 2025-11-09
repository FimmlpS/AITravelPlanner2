import { useEffect, useRef } from 'react';

// 高德地图API密钥
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;

/**
 * 加载高德地图SDK
 */
export const loadAMapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (window.AMap) {
      resolve();
      return;
    }

    // 创建script标签
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error('高德地图SDK加载失败'));
    };

    // 添加到head
    document.head.appendChild(script);
  });
};

/**
 * 加载AMapUI组件库
 */
export const loadAMapUI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.AMapUI) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://webapi.amap.com/ui/1.1/main.js';
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error('AMapUI组件库加载失败'));
    };

    document.head.appendChild(script);
  });
};

/**
 * React Hook: 初始化高德地图
 */
export const useAMap = (options?: AMapMapOptions) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        await loadAMapScript();
        
        if (mapContainerRef.current) {
          // 创建地图实例
          const map = new window.AMap.Map(mapContainerRef.current, {
            zoom: 11,
            center: [116.397428, 39.90923], // 默认北京坐标
            ...options,
          });

          // 添加控件
          map.addControl(new window.AMap.ToolBar());
          map.addControl(new window.AMap.Scale());
          
          mapRef.current = map;
        }
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [options]);

  return { mapContainerRef, map: mapRef.current };
};

/**
 * 地理编码服务
 */
export const geocodeAddress = async (address: string): Promise<AMapGeocodeResult> => {
  await loadAMapScript();
  
  return new Promise((resolve, reject) => {
    const geocoder = new window.AMap.Geocoder();
    geocoder.getLocation(address, (status: string, result: AMapGeocodeResult) => {
      if (status === 'complete' && result.geocodes.length) {
        resolve(result);
      } else {
        reject(new Error('地理编码失败'));
      }
    });
  });
};

/**
 * 路线规划服务
 */
export const calculateRoute = async (
  origin: AMapLngLatLike,
  destination: AMapLngLatLike,
  mode: 'drive' | 'walk' | 'bus' = 'drive'
): Promise<any> => {
  await loadAMapScript();
  
  return new Promise((resolve, reject) => {
    let planner: any;
    
    switch (mode) {
      case 'drive':
        planner = new window.AMap.Driving({
          map: null,
          panel: null,
        });
        break;
      case 'walk':
        planner = new window.AMap.Walking({
          map: null,
          panel: null,
        });
        break;
      case 'bus':
        planner = new window.AMap.Transfer({
          map: null,
          panel: null,
        });
        break;
    }
    
    planner.search([origin, destination], (status: string, result: any) => {
      if (status === 'complete') {
        resolve(result);
      } else {
        reject(new Error('路线规划失败'));
      }
    });
  });
};

// 声明高德地图全局类型
declare global {
  interface Window {
    AMap: any;
    AMapUI: any;
  }
}

// 基础地图类型定义
export interface AMapMapOptions {
  zoom?: number;
  center?: [number, number];
  viewMode?: '2D' | '3D';
  rotation?: number;
  pitch?: number;
  [key: string]: any;
}

export interface AMapLngLatLike {
  lng?: number;
  lat?: number;
  getLng?(): number;
  getLat?(): number;
  toString?(): string;
}

export interface AMapGeocodeResult {
  status: string;
  info: string;
  geocodes: Array<{
    formattedAddress: string;
    country: string;
    province: string;
    city: string;
    district: string;
    township: string;
    street: string;
    number: string;
    location: {
      lng: number;
      lat: number;
    };
    level: string;
  }>;
}