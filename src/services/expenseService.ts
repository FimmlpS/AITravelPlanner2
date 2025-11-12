import supabase from './supabase';
import type { ExpenseRecord, ExpenseFormData } from '../types/travel';

/**
 * 账单服务类，提供账单的增删改查功能
 */
class ExpenseService {
  /**
   * 获取指定行程的所有账单
   * @param planId 行程ID
   * @returns 账单记录数组
   */
  async getExpensesByPlanId(planId: string): Promise<ExpenseRecord[]> {
    try {
      const { data, error } = await supabase
        .from('expense_records')
        .select('*')
        .eq('plan_id', planId)
        .order('expense_time', { ascending: false });
      
      if (error) {
        console.error('获取账单记录失败:', error);
        throw error;
      }
      
      return data.map(this.convertFromDbRecord);
    } catch (error) {
      console.error('获取账单记录异常:', error);
      throw error;
    }
  }

  /**
   * 创建新账单
   * @param planId 行程ID
   * @param expenseData 账单数据
   * @returns 创建的账单记录
   */
  async createExpense(planId: string, expenseData: ExpenseFormData): Promise<ExpenseRecord> {
    try {
      const { data, error } = await supabase
        .from('expense_records')
        .insert({
          plan_id: planId,
          amount: expenseData.amount * 100, // 转换为分
          reason: expenseData.reason,
          expense_time: expenseData.expenseTime
        })
        .select()
        .single();
      
      if (error) {
        console.error('创建账单失败:', error);
        throw error;
      }
      
      return this.convertFromDbRecord(data);
    } catch (error) {
      console.error('创建账单异常:', error);
      throw error;
    }
  }

  /**
   * 更新账单
   * @param expenseId 账单ID
   * @param expenseData 更新的账单数据
   * @returns 更新后的账单记录
   */
  async updateExpense(expenseId: string, expenseData: ExpenseFormData): Promise<ExpenseRecord> {
    try {
      const { data, error } = await supabase
        .from('expense_records')
        .update({
          amount: expenseData.amount * 100, // 转换为分
          reason: expenseData.reason,
          expense_time: expenseData.expenseTime
        })
        .eq('id', expenseId)
        .select()
        .single();
      
      if (error) {
        console.error('更新账单失败:', error);
        throw error;
      }
      
      return this.convertFromDbRecord(data);
    } catch (error) {
      console.error('更新账单异常:', error);
      throw error;
    }
  }

  /**
   * 删除账单
   * @param expenseId 账单ID
   * @returns 是否删除成功
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('expense_records')
        .delete()
        .eq('id', expenseId);
      
      if (error) {
        console.error('删除账单失败:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('删除账单异常:', error);
      throw error;
    }
  }

  /**
   * 获取指定行程的总花费
   * @param planId 行程ID
   * @returns 总花费金额（元）
   */
  async getTotalExpenseByPlanId(planId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('expense_records')
        .select('amount')
        .eq('plan_id', planId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // 116是没有数据的错误码
        console.error('获取总花费失败:', error);
        throw error;
      }
      
      return data ? data.amount / 100 : 0; // 转换为元
    } catch (error) {
      console.error('获取总花费异常:', error);
      throw error;
    }
  }

  /**
   * 将数据库记录转换为前端模型
   * @param dbRecord 数据库记录
   * @returns 前端ExpenseRecord模型
   */
  private convertFromDbRecord(dbRecord: any): ExpenseRecord {
    return {
      id: dbRecord.id,
      planId: dbRecord.plan_id,
      amount: dbRecord.amount / 100, // 从分转换为元
      reason: dbRecord.reason,
      expenseTime: dbRecord.expense_time,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at
    };
  }
}

// 导出单例实例
export default ExpenseService;