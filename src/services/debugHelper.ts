// 调试辅助工具

/**
 * 详细日志记录器
 */
export class DebugLogger {
  private static enabled = true;
  private static moduleName = 'AITravelPlanner';

  /**
   * 启用或禁用调试日志
   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * 记录信息日志
   */
  static log(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`[${this.moduleName}][${component}]`, message);
    if (data !== undefined) {
      console.log(`[${this.moduleName}][${component}] 数据:`, data);
    }
  }

  /**
   * 记录错误日志
   */
  static error(component: string, message: string, error?: Error | any) {
    if (!this.enabled) return;
    console.error(`[${this.moduleName}][${component}] 错误:`, message);
    if (error) {
      console.error(`[${this.moduleName}][${component}] 错误详情:`, error);
    }
  }

  /**
   * 记录警告日志
   */
  static warn(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    console.warn(`[${this.moduleName}][${component}] 警告:`, message);
    if (data !== undefined) {
      console.warn(`[${this.moduleName}][${component}] 数据:`, data);
    }
  }

  /**
   * 记录调试日志
   */
  static debug(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    console.debug(`[${this.moduleName}][${component}] 调试:`, message);
    if (data !== undefined) {
      console.debug(`[${this.moduleName}][${component}] 数据:`, data);
    }
  }
}

/**
 * 错误追踪器
 */
export class ErrorTracker {
  private static errors: Array<{ timestamp: Date; component: string; error: Error | string }> = [];

  /**
   * 记录错误
   */
  static trackError(component: string, error: Error | string) {
    const errorData = {
      timestamp: new Date(),
      component,
      error: error instanceof Error ? error : new Error(error)
    };
    this.errors.push(errorData);
    DebugLogger.error(component, error instanceof Error ? error.message : error, error);
  }

  /**
   * 获取所有错误
   */
  static getErrors() {
    return [...this.errors];
  }

  /**
   * 清除错误记录
   */
  static clearErrors() {
    this.errors = [];
  }

  /**
   * 导出错误报告
   */
  static exportErrorReport(): string {
    return JSON.stringify(this.errors, (_key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      return value;
    }, 2);
  }
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private static metrics: Map<string, { startTime: number; endTime?: number }> = new Map();

  /**
   * 开始计时
   */
  static start(name: string) {
    this.metrics.set(name, { startTime: performance.now() });
  }

  /**
   * 结束计时并返回耗时（毫秒）
   */
  static end(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      DebugLogger.warn('PerformanceMonitor', `未找到计时任务: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    const duration = endTime - metric.startTime;

    DebugLogger.log('PerformanceMonitor', `${name} 耗时: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * 获取所有性能指标
   */
  static getMetrics() {
    const result = {} as Record<string, { startTime: number; endTime?: number; duration?: number }>;
    this.metrics.forEach((value, key) => {
      result[key] = {
        ...value,
        duration: value.endTime ? value.endTime - value.startTime : undefined
      };
    });
    return result;
  }
}

/**
 * 数据验证器
 */
export class DataValidator {
  /**
   * 验证行程计划数据
   */
  static validateTravelPlan(plan: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan) {
      errors.push('行程计划不能为空');
      return { isValid: false, errors };
    }

    if (!plan.title || plan.title.trim() === '') {
      errors.push('行程标题不能为空');
    }

    if (!plan.preferences || typeof plan.preferences !== 'object') {
      errors.push('行程偏好必须是有效的对象');
    }

    if (!plan.dailyItineraries || !Array.isArray(plan.dailyItineraries)) {
      errors.push('日程必须是有效的数组');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证用户数据
   */
  static validateUserData(user: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user) {
      errors.push('用户数据不能为空');
      return { isValid: false, errors };
    }

    if (!user.id) {
      errors.push('用户ID不能为空');
    }

    if (!user.email || !this.isValidEmail(user.email)) {
      errors.push('请提供有效的电子邮件地址');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证电子邮件格式
   */
  private static isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

/**
 * 全局状态检查器
 */
export class StateChecker {
  /**
   * 检查应用状态是否正常
   */
  static checkAppState(): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查本地存储
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      issues.push('本地存储不可用');
    }

    // 检查网络连接
    if (!navigator.onLine) {
      issues.push('当前处于离线状态');
    }

    // 检查浏览器特性支持
    if (!('MediaRecorder' in window)) {
      issues.push('浏览器不支持媒体录制功能');
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }

  /**
   * 生成系统信息报告
   */
  static generateSystemReport(): string {
    const report = {
      browser: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      online: navigator.onLine,
      localStorage: this.isLocalStorageAvailable(),
      sessionStorage: this.isSessionStorageAvailable(),
      appState: this.checkAppState()
    };

    return JSON.stringify(report, null, 2);
  }

  private static isLocalStorageAvailable(): boolean {
    try {
      localStorage.getItem('test');
      return true;
    } catch (e) {
      return false;
    }
  }

  private static isSessionStorageAvailable(): boolean {
    try {
      sessionStorage.getItem('test');
      return true;
    } catch (e) {
      return false;
    }
  }
}

// 导出默认的调试工具对象
export default {
  logger: DebugLogger,
  errorTracker: ErrorTracker,
  performanceMonitor: PerformanceMonitor,
  validator: DataValidator,
  stateChecker: StateChecker
};