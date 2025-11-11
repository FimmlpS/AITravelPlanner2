// 高德地图服务集成
// 注意：实际使用时需要在index.html中引入高德地图JS API

// 配置项
// const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'your-amap-key'; // 暂时注释，待使用

// 地图初始化选项接口
export interface MapOptions {
  center?: [number, number]; // 中心点坐标 [longitude, latitude]
  zoom?: number; // 缩放级别
  mapStyle?: string; // 地图样式
}

// POI搜索选项接口
export interface POISearchOptions {
  keyword: string; // 搜索关键词
  location?: [number, number]; // 中心点坐标
  radius?: number; // 搜索半径，单位米
  type?: string; // POI类型
  city?: string; // 城市名称
  pageSize?: number; // 每页结果数
  pageIndex?: number; // 页码
}

// 导航选项接口
export interface NavigationOptions {
  origin: [number, number]; // 起点坐标
  destination: [number, number]; // 终点坐标
  type?: 'walk' | 'bus' | 'drive'; // 导航类型
}

// POI点信息接口
export interface POIInfo {
  id: string;
  name: string;
  type: string;
  location: [number, number];
  address: string;
  cityName: string;
  district: string;
  businessArea: string;
  tel?: string;
  rating?: number;
  photos?: string[];
}

// 导航路线接口
export interface NavigationRoute {
  distance: number; // 距离，单位米
  duration: number; // 预计时间，单位秒
  startAddress: string;
  endAddress: string;
  steps: {
    distance: number;
    duration: number;
    instruction: string;
    polyline: [number, number][];
  }[];
}

// 地图服务类
class MapService {
  private mapInstance: any = null;
  // private loaded = false; // 暂时注释，待使用

  // 初始化地图
  initMap(containerId: string, options?: MapOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      // 检查高德地图API是否已加载
      if (!(window as any).AMap) {
        reject(new Error('高德地图API未加载，请在index.html中引入'));
        return;
      }

      // 创建地图实例
      const map = new (window as any).AMap.Map(containerId, {
        center: options?.center || [116.397428, 39.90923],
        zoom: options?.zoom || 13,
        mapStyle: options?.mapStyle,
      });

      // 添加控件
      map.addControl(new (window as any).AMap.ToolBar());
      map.addControl(new (window as any).AMap.Scale());
      map.addControl(new (window as any).AMap.MapType());

      this.mapInstance = map;
      resolve(map);
    });
  }

  // 获取地图实例
  getMap(): any {
    if (!this.mapInstance) {
      throw new Error('地图未初始化，请先调用initMap方法');
    }
    return this.mapInstance;
  }

  // 定位到当前位置
  async locate(): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      if (!this.mapInstance) {
        reject(new Error('地图未初始化'));
        return;
      }

      this.mapInstance.plugin(['AMap.Geolocation'], () => {
        const geolocation = new (window as any).AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        this.mapInstance.addControl(geolocation);
        
        geolocation.getCurrentPosition((status: string, result: any) => {
          if (status === 'complete') {
            const location: [number, number] = [result.position.getLng(), result.position.getLat()];
            this.mapInstance.setCenter(location);
            resolve(location);
          } else {
            reject(new Error('定位失败: ' + result.info));
          }
        });
      });
    });
  }

  // 搜索POI
  async searchPOI(options: POISearchOptions): Promise<POIInfo[]> {
    return new Promise((resolve, reject) => {
      if (!(window as any).AMap) {
        reject(new Error('高德地图API未加载'));
        return;
      }

      (window as any).AMap.plugin(['AMap.PlaceSearch'], () => {
        const placeSearch = new (window as any).AMap.PlaceSearch({
          pageSize: options.pageSize || 20,
          pageIndex: options.pageIndex || 1,
          city: options.city || '',
          map: this.mapInstance || null,
        });

        const searchOptions: any = {
          keyword: options.keyword,
          type: options.type,
        };

        if (options.location) {
          searchOptions.location = options.location;
          searchOptions.radius = options.radius || 1000;
        }

        placeSearch.search(searchOptions, (status: string, result: any) => {
          if (status === 'complete') {
            const pois: POIInfo[] = result.poiList.pois.map((poi: any) => ({
              id: poi.id,
              name: poi.name,
              type: poi.type,
              location: [poi.location.lng, poi.location.lat],
              address: poi.address,
              cityName: poi.cityname,
              district: poi.district,
              businessArea: poi.businessArea,
              tel: poi.tel,
              rating: poi.rating,
              photos: poi.photos || [],
            }));
            resolve(pois);
          } else {
            reject(new Error('搜索失败: ' + result.info));
          }
        });
      });
    });
  }

  // 计算路线
  async calculateRoute(options: NavigationOptions): Promise<NavigationRoute> {
    return new Promise((resolve, reject) => {
      if (!(window as any).AMap) {
        reject(new Error('高德地图API未加载'));
        return;
      }

      const navType = options.type || 'drive';
      let navService: any;

      switch (navType) {
        case 'walk':
          (window as any).AMap.plugin(['AMap.Walking'], () => {
            navService = new (window as any).AMap.Walking({
              map: this.mapInstance || null,
            });
            this._calculateRouteInternal(navService, options, resolve, reject);
          });
          break;
        case 'bus':
          (window as any).AMap.plugin(['AMap.Transfer'], () => {
            navService = new (window as any).AMap.Transfer({
              map: this.mapInstance || null,
              policy: (window as any).AMap.TransferPolicy.LEAST_TIME,
            });
            this._calculateRouteInternal(navService, options, resolve, reject);
          });
          break;
        case 'drive':
        default:
          (window as any).AMap.plugin(['AMap.Driving'], () => {
            navService = new (window as any).AMap.Driving({
              map: this.mapInstance || null,
            });
            this._calculateRouteInternal(navService, options, resolve, reject);
          });
      }
    });
  }

  // 内部方法：计算路线的实现
  private _calculateRouteInternal(
    navService: any,
    options: NavigationOptions,
    resolve: (route: NavigationRoute) => void,
    reject: (error: Error) => void
  ): void {
    const start = options.origin.join(',');
    const end = options.destination.join(',');

    navService.search([start, end], (status: string, result: any) => {
      if (status === 'complete') {
        const path = result.routes[0];
        const route: NavigationRoute = {
          distance: path.distance,
          duration: path.duration,
          startAddress: path.origin.name,
          endAddress: path.destination.name,
          steps: path.steps.map((step: any) => ({
            distance: step.distance,
            duration: step.duration,
            instruction: step.instruction,
            polyline: step.polyline.split(';').map((point: string) => {
              const [lng, lat] = point.split(',').map(Number);
              return [lng, lat];
            }),
          })),
        };
        resolve(route);
      } else {
        reject(new Error('路线规划失败: ' + result.info));
      }
    });
  }

  // 添加标记点
  addMarker(position: [number, number], options?: any): any {
    if (!this.mapInstance) {
      throw new Error('地图未初始化');
    }

    const marker = new (window as any).AMap.Marker({
      position,
      ...options,
    });

    this.mapInstance.add(marker);
    return marker;
  }

  // 添加路线
  addPolyline(path: [number, number][], options?: any): any {
    if (!this.mapInstance) {
      throw new Error('地图未初始化');
    }

    const polyline = new (window as any).AMap.Polyline({
      path,
      strokeColor: '#1890ff',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      ...options,
    });

    this.mapInstance.add(polyline);
    return polyline;
  }

  // 批量添加标记点
  addMarkers(markers: Array<{position: [number, number], options?: any}>): any[] {
    return markers.map(marker => this.addMarker(marker.position, marker.options));
  }

  // 设置地图中心点
  setCenter(position: [number, number]): void {
    if (!this.mapInstance) {
      throw new Error('地图未初始化');
    }
    this.mapInstance.setCenter(position);
  }

  // 设置地图缩放级别
  setZoom(zoom: number): void {
    if (!this.mapInstance) {
      throw new Error('地图未初始化');
    }
    this.mapInstance.setZoom(zoom);
  }

  // 清除地图上的所有覆盖物
  clearMap(): void {
    if (!this.mapInstance) {
      throw new Error('地图未初始化');
    }
    this.mapInstance.clearMap();
  }
}

export default new MapService();