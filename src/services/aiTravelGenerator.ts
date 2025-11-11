import axios from 'axios';
import { DebugLogger, ErrorTracker } from './debugHelper';
import apiConfig from '../config/apiConfig';

// 生成符合UUID v4格式的ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 为避免循环依赖，使用内联类型注释而不是导入
type TravelPreference = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  peopleCount: number;
  preferences: string[];
};

type TravelActivity = {
  id: string;
  type: 'transport' | 'accommodation' | 'attraction' | 'restaurant';
  name: string;
  address: string;
  duration: number;
  cost: number;
  description: string;
  openingHours?: string;
  rating?: number;
  images?: string[];
  coordinates?: [number, number];
};

type DailyItinerary = {
  date: string;
  activities: TravelActivity[];
  totalCost: number;
};

type TravelPlan = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preferences: TravelPreference;
  dailyItineraries: DailyItinerary[];
  totalBudget: number;
  spentBudget: number;
  status: 'draft' | 'planned' | 'ongoing' | 'completed';
  userId?: string;
};

// 创建OpenAI客户端实例，使用阿里云百炼兼容模式
class AITravelGenerator {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    // 从配置文件获取API密钥
    this.apiKey = apiConfig.aliYunBaiLian.apiKey;
    this.baseURL = apiConfig.aliYunBaiLian.baseUrl;
    this.model = apiConfig.aliYunBaiLian.modelName; // 使用通义千问qwen3-max-2025-09-23模型
  }

  private lastApiResponse: any = null;
  
  /**
   * 获取最后一次API响应数据
   */
  getLastApiResponse() {
    return this.lastApiResponse;
  }
  
  /**
   * 生成AI旅行计划
   * @param preferences 用户旅行偏好
   * @returns 生成的旅行计划
   */
  async generateTravelPlan(preferences: TravelPreference): Promise<TravelPlan> {
    const component = 'AITravelGenerator.generateTravelPlan';
    DebugLogger.log(component, '开始AI生成旅行计划', { destination: preferences.destination });

    if (!this.apiKey) {
      throw new Error('未配置阿里云百炼API密钥');
    }

    try {
      // 创建axios实例
      const client = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 构建系统提示，指导AI生成结构化的旅行计划
      const systemPrompt = "你是一个专业的旅行规划助手，擅长根据用户的偏好生成详细、真实且实用的旅行计划。\n\n请根据用户提供的目的地、日期、预算和偏好，生成一个详细的旅行计划，包括：\n1. 每日行程安排（交通、住宿、景点、餐厅）\n2. 具体的真实地点名称\n3. 详细的费用估算\n4. 基于用户偏好的个性化推荐\n\n【重要要求】\n1. 请直接输出纯JSON格式内容，不要包含任何其他解释性文本或markdown标记（如```json或```）\n2. 确保JSON格式完全正确，符合标准JSON语法规范\n3. 所有字符串值必须使用双引号包裹\n4. 确保所有属性名使用双引号\n5. 不要在JSON末尾添加逗号\n6. 确保所有数值字段（duration、cost、totalCost、totalBudget、spentBudget、rating）都是数字类型\n7. 确保type字段只能是transport、accommodation、attraction或restaurant中的一个\n\n请严格遵循以下JSON格式：\n{\"title\":\"目的地 日期范围 旅行计划\",\"dailyItineraries\":[{\"date\":\"YYYY-MM-DD\",\"activities\":[{\"type\":\"transport\",\"name\":\"活动名称\",\"address\":\"详细地址\",\"duration\":60,\"cost\":100,\"description\":\"详细描述\",\"openingHours\":\"开放时间\",\"rating\":4.5}],\"totalCost\":500}],\"totalBudget\":2000,\"spentBudget\":1500}";

      // 构建用户提示
      const userPrompt = `请帮我规划一次前往${preferences.destination}的旅行，时间从${preferences.startDate}到${preferences.endDate}，预算${preferences.budget}元，共${preferences.peopleCount}人。

我的旅行偏好包括：${preferences.preferences.join('、')}。

请提供详细的行程安排，包括每日的交通、住宿、景点和餐厅信息，确保地点真实可查，并给出合理的费用估算。`;

      // 调用阿里云百炼API
      const response = await client.post('/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      if (!(response.status >= 200 && response.status < 300)) {
        throw new Error(`API调用失败: ${response.status} ${JSON.stringify(response.data)}`);
      }

      const data = response.data;
      DebugLogger.log(component, 'API响应数据', data);
      // 调试输出AI响应结果
      console.log('AI API响应结果:', data);
      
      // 保存API响应数据，供外部访问
      this.lastApiResponse = data;

      // 解析AI返回的内容
      const aiContent = data.choices?.[0]?.message?.content;
      if (!aiContent) {
        throw new Error('AI未返回有效内容');
      }

      // 尝试提取JSON内容
      let planData;
      try {
        // 根据用户要求，直接使用原始内容进行解析，跳过复杂的清洗步骤
        // 只进行必要的trim操作
        const cleanContent = aiContent.trim();
        
        DebugLogger.log(component, '直接使用原始JSON内容进行解析', { cleanContent: cleanContent.substring(0, 200) + '...' });
        
        // 直接解析原始JSON内容
        planData = JSON.parse(cleanContent);
      } catch (parseError) {
        // 详细记录错误信息
        DebugLogger.error(component, '解析AI返回的JSON失败', { 
            error: parseError, 
            originalContent: aiContent.substring(0, 500) + '...',
            fullContentLength: aiContent.length
          });
        
        // 如果第一次解析失败，尝试更激进的修复
        try {
          // 尝试使用更强大的JSON修复
          let fallbackContent = aiContent.trim();
          
          // 只保留JSON结构部分
          const jsonMatch1 = fallbackContent.match(/\{[^\{\}]*\}/);
          if (jsonMatch1) {
            fallbackContent = jsonMatch1[0];
          }
          
          // 移除所有可能导致问题的字符
          fallbackContent = fallbackContent.replace(/[^\{\}\[\]\":,\s\w\d.\-]/g, '');
          
          // 再次尝试解析
          planData = JSON.parse(fallbackContent);
        } catch (fallbackError) {
          throw new Error(`解析旅行计划数据失败: ${(parseError as Error).message}`);
        }
      }

      // 构建完整的TravelPlan对象
      const travelPlan: TravelPlan = {
        id: generateUUID(), // 生成符合UUID格式的ID，以适配数据库要求
        title: planData.title || `${preferences.destination} 旅行计划`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences,
        dailyItineraries: this.validateDailyItineraries(planData.dailyItineraries || []),
        totalBudget: preferences.budget,
        spentBudget: planData.spentBudget || this.calculateTotalSpent(planData.dailyItineraries || []),
        status: 'planned',
        userId: ''
      };

      DebugLogger.log(component, '旅行计划生成成功', { planId: travelPlan.id });
      return travelPlan;
    } catch (error) {
      ErrorTracker.trackError(component, error instanceof Error ? error : '生成旅行计划失败');
      throw error;
    }
  }

  /**
   * 验证每日行程数据
   */
  private validateDailyItineraries(itineraries: any[]): DailyItinerary[] {
    return itineraries.map((day, index) => ({
      date: day.date || '',
      activities: (day.activities || []).map((activity: any, actIndex: number) => ({
        id: `act-${index}-${actIndex}`,
        type: this.validateActivityType(activity.type),
        name: activity.name || '未知活动',
        address: activity.address || '',
        duration: parseInt(activity.duration) || 60,
        cost: parseFloat(activity.cost) || 0,
        description: activity.description || '',
        openingHours: activity.openingHours,
        rating: activity.rating,
        images: activity.images,
        coordinates: activity.coordinates,
      })),
      totalCost: parseFloat(day.totalCost) || 0,
    }));
  }

  /**
   * 验证活动类型
   */
  private validateActivityType(type: string): TravelActivity['type'] {
    const validTypes: TravelActivity['type'][] = ['transport', 'accommodation', 'attraction', 'restaurant'];
    return validTypes.includes(type as any) ? (type as TravelActivity['type']) : 'attraction';
  }

  /**
   * 计算总花费
   */
  private calculateTotalSpent(itineraries: any[]): number {
    return itineraries.reduce((total, day) => {
      return total + (parseFloat(day.totalCost) || 0);
    }, 0);
  }
}

// 导出类和单例实例
export { AITravelGenerator };
export default new AITravelGenerator();