/**
 * 浏览器控制台调试工具 - 无需导入即可使用
 * 使用方法：直接复制以下代码到浏览器控制台并运行
 */

// 直接在浏览器控制台运行的调试函数
function debugTravelPlans(userId = '951b8914-6187-4858-8567-f95886b32458') {
  console.log(`[浏览器调试] 开始查询用户ID ${userId} 的行程计划...`);
  
  // 检查是否已在应用中定义了supabase实例
  if (window.supabase) {
    return executeQuery(window.supabase, userId);
  } else {
    // 如果没有，尝试动态导入并执行
    console.log('[浏览器调试] 尝试动态导入Supabase客户端...');
    
    // 创建一个临时的script元素来加载调试函数
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import { runDebugTest } from '/src/services/debugTravelPlans.ts';
      runDebugTest();
    `;
    
    document.head.appendChild(script);
    script.onload = () => {
      console.log('[浏览器调试] 调试脚本已加载');
      document.head.removeChild(script);
    };
    
    return Promise.resolve({ message: '调试脚本已开始加载' });
  }
}

// 执行查询的辅助函数
async function executeQuery(supabase, userId) {
  try {
    const startTime = performance.now();
    
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    const endTime = performance.now();
    const queryTime = (endTime - startTime).toFixed(2);
    
    console.log(`[浏览器调试] 查询完成，耗时: ${queryTime}ms`);
    
    if (error) {
      console.error('[浏览器调试] 查询失败:', error);
      return { success: false, error: error };
    }
    
    console.log(`[浏览器调试] 查询成功，找到 ${data?.length || 0} 条行程`);
    console.table(data); // 以表格形式显示结果
    
    return { success: true, data: data, count: data?.length || 0 };
  } catch (e) {
    console.error('[浏览器调试] 发生异常:', e);
    return { success: false, exception: e };
  }
}

// 将调试函数挂载到window对象，以便在控制台直接访问
window.debugTravelPlans = debugTravelPlans;

console.log('========================================');
console.log('旅行计划查询调试工具已加载');
console.log('使用方法：在控制台输入 debugTravelPlans() 即可运行测试');
console.log('或指定用户ID: debugTravelPlans(\'your-user-id\')');
console.log('========================================');