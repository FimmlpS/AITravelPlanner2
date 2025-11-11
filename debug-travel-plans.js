// 简单的Node.js测试脚本，用于调试travel_plans查询

// 注意：这个脚本需要在Node环境中运行，可能需要额外配置Supabase客户端
// 建议直接在浏览器控制台运行上面创建的debugTravelPlans.ts中的runDebugTest函数

console.log('旅行计划查询调试脚本');
console.log('请在浏览器控制台中执行以下代码来运行调试：');
console.log('');
console.log('// 方式1：直接从服务导入并运行');
console.log('import { runDebugTest } from \'/src/services/debugTravelPlans.ts\';');
console.log('runDebugTest();');
console.log('');
console.log('// 方式2：使用预设的测试函数');
console.log('import { testTravelPlansQuery } from \'/src/services/debugTravelPlans.ts\';');
console.log('testTravelPlansQuery(\'951b8914-6187-4858-8567-f95886b32458\');');
console.log('');
console.log('// 方式3：自定义用户ID');
console.log('import { debugFetchTravelPlansByUserId } from \'/src/services/debugTravelPlans.ts\';');
console.log('debugFetchTravelPlansByUserId(\'你的用户ID\');');
console.log('');
console.log('请确保你已经登录到应用，并且Supabase环境变量已正确配置。');