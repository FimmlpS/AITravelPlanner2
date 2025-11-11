# 行程计划查询调试工具

本文档介绍如何使用提供的调试工具来测试以特定user_id查询travel_plans数据。

## 已创建的调试工具

1. **src/services/debugTravelPlans.ts** - 核心调试函数库
2. **src/services/browserDebug.js** - 浏览器控制台调试工具
3. **debug-travel-plans.js** - 命令行测试脚本

## 使用方法

### 方法1：浏览器控制台直接调试（推荐）

1. 确保应用正在运行（`npm run dev`）
2. 打开应用页面
3. 按F12打开浏览器开发者工具
4. 切换到控制台（Console）标签
5. 输入以下命令并按回车：

```javascript
// 使用默认用户ID测试
debugTravelPlans();

// 或使用指定的用户ID测试
debugTravelPlans('951b8914-6187-4858-8567-f95886b32458');
```

控制台将显示详细的查询过程、时间消耗和结果数据。

### 方法2：动态导入调试函数

在浏览器控制台中执行：

```javascript
// 导入并运行预设测试
import { runDebugTest } from '/src/services/debugTravelPlans.ts';
runDebugTest();

// 或使用特定用户ID
import { testTravelPlansQuery } from '/src/services/debugTravelPlans.ts';
testTravelPlansQuery('951b8914-6187-4858-8567-f95886b32458');
```

## 调试结果说明

成功的调试结果将包含：
- `success: true` - 查询成功标志
- `data` - 返回的行程计划数据数组
- `count` - 数据数量
- `queryTime` - 查询耗时

失败的调试结果将包含：
- `success: false` - 查询失败标志
- `error` - 错误信息
- `errorDetails` - 详细错误信息（如有）

## 常见问题排查

### 1. 连接错误

如果出现 `Failed to fetch` 或连接超时错误：
- 检查网络连接
- 确认Supabase环境变量配置正确（.env文件）
- 验证Supabase项目是否正常运行

### 2. 权限错误

如果出现权限相关错误：
- 检查Supabase的Row Level Security设置
- 确保用户表和travel_plans表的权限配置正确

### 3. 数据为空

如果查询成功但返回空数组：
- 确认该用户ID确实存在
- 验证该用户是否有创建行程计划
- 检查travel_plans表中是否有对应user_id的记录

## 注意事项

1. 调试工具仅在开发环境（DEV）下自动加载
2. 生产环境不会加载这些调试工具
3. 调试结果会详细记录在控制台中，请确保隐私安全
4. 如遇到问题，请检查浏览器控制台的完整错误信息

## 自定义调试

如需自定义调试逻辑，请修改 `src/services/debugTravelPlans.ts` 文件中的 `debugFetchTravelPlansByUserId` 函数。