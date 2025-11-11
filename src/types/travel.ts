// 独立的旅行相关类型定义文件，避免循环依赖

export interface TravelPreference {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  peopleCount: number;
  preferences: string[];
}

export interface TravelActivity {
  id: string;
  type: 'transport' | 'accommodation' | 'attraction' | 'restaurant';
  name: string;
  address: string;
  duration: number; // 分钟
  cost: number;
  description: string;
  openingHours?: string;
  rating?: number;
  images?: string[];
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface DailyItinerary {
  date: string;
  activities: TravelActivity[];
  totalCost: number;
}

export interface TravelPlan {
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
}