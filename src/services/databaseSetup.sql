-- Supabase数据库初始化脚本
-- 请复制以下SQL语句到Supabase控制台的SQL编辑器中执行

-- 用户相关表结构说明：
-- 1. auth.users表：Supabase内置的用户认证表，由Supabase自动管理
--    - 包含email、password_hash等认证信息（密码以加密形式存储）
--    - 我们不需要手动创建或修改此表
-- 2. user_profiles表：我们自定义的用户配置表，与auth.users表关联
--    - 存储用户额外信息，如用户名、头像、偏好设置等
--    - 通过外键id引用auth.users表

-- 创建用户配置表（存储用户自定义设置）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  phone VARCHAR(20),
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 注意：由于user_favorites和user_history表引用了travel_plans表
-- 我们将在创建travel_plans表后再创建这些关联表


-- 为用户配置表添加触发器
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为用户配置表添加索引和权限
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
-- 注意：不要尝试在auth.users表上创建索引，因为它是Supabase的系统表
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON auth.users(email); -- 已移除，会导致权限错误
GRANT ALL ON TABLE user_profiles TO authenticated;

-- 注意：user_favorites和user_history的索引和权限将在这些表创建后设置

-- 创建新用户时自动创建用户配置
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 从email中提取用户名作为默认用户名
  INSERT INTO public.user_profiles (id, username)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建travel_plans表
CREATE TABLE IF NOT EXISTS travel_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  preferences JSONB NOT NULL,
  daily_itineraries JSONB NOT NULL,
  total_budget INTEGER DEFAULT 0,
  spent_budget INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'planned',
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
INSERT INTO travel_plans (title, preferences, daily_itineraries, total_budget, spent_budget, status)
SELECT 
  '示例行程 - 北京三日游',
  '{"destination": "北京", "startDate": "2023-10-01", "endDate": "2023-10-03", "budget": 5000, "peopleCount": 2, "preferences": ["文化", "美食"]}'::jsonb,
  '[{"date": "2023-10-01", "activities": [{"id": "act-1", "type": "attraction", "name": "故宫", "address": "北京市东城区景山前街4号", "duration": 240, "cost": 60, "description": "中国明清两代的皇家宫殿", "rating": 4.8}]}]'::jsonb,
  5000,
  60,
  'planned'
WHERE NOT EXISTS (SELECT 1 FROM travel_plans LIMIT 1);

-- 授予必要的权限
GRANT ALL ON TABLE travel_plans TO authenticated;
GRANT SELECT ON TABLE travel_plans TO anon;

-- 现在创建关联表（在travel_plans表之后）
-- 创建用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- 为用户收藏表添加索引和权限
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
GRANT ALL ON TABLE user_favorites TO authenticated;

-- 创建用户浏览历史表
CREATE TABLE IF NOT EXISTS user_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES travel_plans(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为用户浏览历史表添加索引和权限
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
GRANT ALL ON TABLE user_history TO authenticated;

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

-- 注意：不要尝试修改auth.users表的权限
-- 在Supabase中，auth.users是系统表，其权限已由Supabase自动配置
-- GRANT SELECT ON TABLE auth.users TO authenticated; -- 已移除，会导致权限错误
-- GRANT SELECT ON TABLE auth.users TO anon; -- 已移除，会导致权限错误

-- 总结：在Supabase中，我们只需要管理我们自己创建的表的索引和权限