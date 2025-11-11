import supabase from './supabase';

/**
 * 调试函数：测试以特定user_id查询travel_plans
 * @param userId 用户ID
 * @returns 查询结果Promise
 */
export const debugFetchTravelPlansByUserId = async (userId: string) => {
  console.log(`[调试] 开始查询用户ID ${userId} 的行程计划...`);
  
  try {
    // 记录开始时间
    const startTime = performance.now();
    
    // 直接使用Supabase客户端查询
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // 计算查询时间
    const endTime = performance.now();
    const queryTime = (endTime - startTime).toFixed(2);
    
    if (error) {
      console.error(`[调试] 查询失败！错误信息: ${error.message}`);
      console.error(`[调试] 错误详情:`, error);
      return {
        success: false,
        error: error.message,
        errorDetails: error,
        queryTime: `${queryTime}ms`,
        data: null
      };
    }
    
    console.log(`[调试] 查询成功！耗时: ${queryTime}ms`);
    console.log(`[调试] 返回数据数量: ${data?.length || 0}`);
    console.log(`[调试] 返回数据:`, data);
    
    return {
      success: true,
      data: data,
      queryTime: `${queryTime}ms`,
      count: data?.length || 0
    };
    
  } catch (exception) {
    console.error(`[调试] 发生异常！`, exception);
    return {
      success: false,
      error: '发生未预期的异常',
      exception: exception,
      data: null
    };
  }
};

/**
 * 直接在控制台运行测试的函数
 */
export const runDebugTest = async () => {
  const testUserId = '951b8914-6187-4858-8567-f95886b32458';
  console.log(`\n===== 开始调试测试 =====`);
  console.log(`测试用户ID: ${testUserId}`);
  
  const result = await debugFetchTravelPlansByUserId(testUserId);
  
  console.log(`\n===== 调试测试结果 =====`);
  console.log(JSON.stringify(result, null, 2));
  
  return result;
};

// 如果直接运行这个文件，自动执行测试
if (import.meta.url === new URL(import.meta.url).href) {
  runDebugTest().catch(console.error);
}

// 导出一个简单的API函数，以便在其他组件中使用
export const testTravelPlansQuery = async (userId?: string) => {
  const id = userId || '951b8914-6187-4858-8567-f95886b32458';
  return await debugFetchTravelPlansByUserId(id);
};