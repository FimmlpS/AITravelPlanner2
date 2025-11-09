# Supabase数据库设置指南

## 准备工作

1. 确保您拥有Supabase账号并已登录
2. 访问[Supabase控制台](https://app.supabase.com)
3. 确保您的项目配置已正确设置在`.env`文件中

## 数据库初始化步骤

### 方法一：使用SQL脚本（推荐）

1. 在Supabase控制台中，导航到**SQL编辑器**部分
2. 复制`databaseSetup.sql`文件中的所有内容到SQL编辑器
3. 点击**运行**按钮执行SQL语句
4. 执行完成后，您应该能看到表已成功创建的消息

### 方法二：手动创建表

如果您希望手动创建表结构，可以按照以下步骤操作：

1. 在Supabase控制台中，导航到**数据库** > **表编辑器**部分
2. 点击**创建新表**按钮
3. 配置以下表结构：
   - 表名：`travel_plans`
   - 字段：
     - `id`: UUID类型，主键，默认值`gen_random_uuid()`
     - `title`: 文本类型(VARCHAR)，不能为空
     - `preferences`: JSONB类型，不能为空
     - `daily_itineraries`: JSONB类型，不能为空
     - `created_at`: 时间戳类型，默认值`now()`
     - `updated_at`: 时间戳类型，默认值`now()`

4. 点击**保存**创建表
5. 添加索引以提高性能：
   - 在**数据库** > **SQL编辑器**中执行：
     ```sql
     CREATE INDEX IF NOT EXISTS idx_travel_plans_created_at ON travel_plans(created_at);
     ```

## 权限设置

确保为您的表设置正确的权限：

1. 在**数据库** > **表编辑器**中，选择`travel_plans`表
2. 点击**编辑权限**按钮
3. 为`authenticated`角色授予所有权限
4. 为`anon`角色授予只读权限

## 添加示例数据

创建表结构后，您可以添加一些示例数据进行测试：

```sql
INSERT INTO travel_plans (title, preferences, daily_itineraries)
SELECT 
  '示例行程 - 北京三日游',
  '{"destination": "北京", "duration": 3, "budget": "medium", "interests": ["culture", "food"]}'::jsonb,
  '[{"day": 1, "activities": [{"name": "故宫", "description": "中国明清两代的皇家宫殿", "type": "attraction", "time": "上午", "duration": 4, "cost": "high", "rating": 4.8}]}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM travel_plans LIMIT 1);
```

## 验证设置

要验证数据库是否正确设置：

1. 在Supabase控制台中，导航到**SQL编辑器**
2. 执行以下SQL查询：
   ```sql
   SELECT * FROM travel_plans LIMIT 5;
   ```
3. 如果表设置正确，您应该能看到返回的结果（可能包含示例数据）

## 常见问题排查

### 表不存在错误

如果应用报错"找不到表"，请检查：
- 表名是否正确（区分大小写）
- 权限设置是否正确
- 应用使用的Supabase URL和密钥是否正确

### 连接问题

如果遇到连接问题：
- 确认`.env`文件中的`VITE_SUPABASE_URL`和`VITE_SUPABASE_ANON_KEY`是否正确
- 检查网络连接是否正常
- 验证Supabase项目是否处于活跃状态

## 高级配置（可选）

### 创建更新时间触发器

如果您希望自动更新`updated_at`字段，在SQL编辑器中执行：

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 添加触发器
CREATE TRIGGER update_travel_plans_updated_at
BEFORE UPDATE ON travel_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 创建RPC函数

为了支持更灵活的数据库操作，您可以创建`execute_sql` RPC函数：

```sql
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

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
```

## 注意事项

1. 生产环境中，请确保正确设置安全规则
2. 定期备份您的数据库
3. 监控数据库性能，必要时添加额外索引
4. 避免在前端代码中暴露敏感信息