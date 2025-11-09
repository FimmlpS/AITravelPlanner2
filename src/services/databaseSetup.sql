-- Supabase数据库初始化脚本
-- 请复制以下SQL语句到Supabase控制台的SQL编辑器中执行

-- 创建travel_plans表
CREATE TABLE IF NOT EXISTS travel_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  preferences JSONB NOT NULL,
  daily_itineraries JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_travel_plans_created_at ON travel_plans(created_at);

-- 添加更新updated_at的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为travel_plans表添加触发器
CREATE TRIGGER update_travel_plans_updated_at
BEFORE UPDATE ON travel_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加示例数据
INSERT INTO travel_plans (title, preferences, daily_itineraries)
SELECT 
  '示例行程 - 北京三日游',
  '{"destination": "北京", "duration": 3, "budget": "medium", "interests": ["culture", "food"]}'::jsonb,
  '[{"day": 1, "activities": [{"name": "故宫", "description": "中国明清两代的皇家宫殿", "type": "attraction", "time": "上午", "duration": 4, "cost": "high", "rating": 4.8}]}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM travel_plans LIMIT 1);

-- 授予必要的权限
GRANT ALL ON TABLE travel_plans TO authenticated;
GRANT SELECT ON TABLE travel_plans TO anon;

-- 创建execute_sql函数（用于后续可能的RPC调用）
CREATE OR REPLACE FUNCTION public.execute_sql(sql TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  EXECUTE sql;
  RETURN 'SQL executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予execute_sql函数的执行权限
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;