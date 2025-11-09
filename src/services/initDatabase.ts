import supabase from './supabase';

// 初始化数据库表
export const initDatabase = async (): Promise<boolean> => {
  try {
    // RPC方法不可用，直接返回false以使用fallback方法
    console.log('RPC方法不可用，将使用fallback方法初始化数据库');
    return false;
  } catch (error) {
    console.error('初始化数据库时出错:', (error as Error).message);
    return false;
  }
};

// 尝试使用PostgREST API创建表（如果RPC方法不可用）
export const initDatabaseFallback = async (): Promise<void> => {
  try {
    // 在实际生产环境中，应该在Supabase控制台手动创建表
    
    const { error } = await supabase.from('travel_plans').select('id').limit(1);
    
    if (error) {
      console.warn('数据库表不存在，应用将以模拟数据模式运行。请在Supabase控制台手动创建表：', error.message);
      console.log(`
创建表SQL：
CREATE TABLE travel_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  preferences JSONB NOT NULL,
  daily_itineraries JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_travel_plans_created_at ON travel_plans(created_at);

-- 添加示例数据
INSERT INTO travel_plans (title, preferences, daily_itineraries) 
SELECT '示例行程 - 北京三日游', 
       '{"destination": "北京", "duration": 3, "budget": "medium", "interests": ["culture", "food"]}', 
       '[{"day": 1, "activities": [{"name": "故宫", "description": "中国明清两代的皇家宫殿", "type": "attraction", "time": "上午", "duration": 4, "cost": "high", "rating": 4.8}]}]'
WHERE NOT EXISTS (SELECT 1 FROM travel_plans LIMIT 1);
`);
    } else {
      console.log('数据库表检查成功');
    }
  } catch (error) {
    console.error('数据库检查失败:', (error as Error).message);
  }
};

export default initDatabase;