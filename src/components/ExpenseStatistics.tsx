import React, { useState, useEffect } from 'react';
import { Table, Form, Input, DatePicker, Button, Select, InputNumber, Card, Row, Col, message, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useAppSelector } from '../store';
import type { ExpenseRecord, ExpenseFormData, TravelPlan } from '../types/travel';
import ExpenseService from '../services/expenseService';
import VoiceInputButton from './VoiceInputButton';

const { Option } = Select;
const { TextArea } = Input;

const ExpenseStatistics: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [form] = Form.useForm<ExpenseFormData>();
  const expenseService = new ExpenseService();
  
  const { plans: travelPlans } = useAppSelector(state => state.travel);

  // 初始化时，如果有行程，默认选择第一个
  useEffect(() => {
    if (travelPlans && travelPlans.length > 0 && !selectedPlan) {
      setSelectedPlan(travelPlans[0].id);
    }
  }, [travelPlans, selectedPlan]);

  // 当选择的行程变化时，加载对应的账单记录
  useEffect(() => {
    if (selectedPlan) {
      loadExpenses();
    }
  }, [selectedPlan]);

  // 加载账单记录
  const loadExpenses = async () => {
    if (!selectedPlan) return;
    
    try {
      const expensesData = await expenseService.getExpensesByPlanId(selectedPlan);
      setExpenses(expensesData);
      
      // 计算总费用
      const total = expensesData.reduce((sum: number, expense: ExpenseRecord) => sum + expense.amount, 0);
      setTotalExpense(total);
    } catch (error) {
      console.error('加载账单失败:', error);
      message.error('加载账单失败，请稍后重试');
    }
  };

  // 处理行程选择变化
  const handlePlanChange = (value: string) => {
    setSelectedPlan(value);
  };

  // 打开添加账单模态框
  const showAddModal = () => {
    form.resetFields();
    setIsAddModalVisible(true);
  };

  // 关闭添加账单模态框
  const handleAddModalCancel = () => {
    setIsAddModalVisible(false);
    form.resetFields();
  };

  // 提交添加账单表单
  const handleAddSubmit = async (values: any) => {
    if (!selectedPlan) return;
    
    try {
      const newExpense = await expenseService.createExpense(selectedPlan, values);
      
      setExpenses([...expenses, newExpense]);
      setTotalExpense(totalExpense + newExpense.amount);
      setIsAddModalVisible(false);
      form.resetFields();
      message.success('账单添加成功');
    } catch (error) {
      console.error('添加账单失败:', error);
      message.error('添加账单失败，请稍后重试');
    }
  };

  // 打开编辑账单模态框
  const showEditModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      amount: expense.amount,
      reason: expense.reason,
      expenseTime: expense.expenseTime
    });
    setIsEditModalVisible(true);
  };

  // 关闭编辑账单模态框
  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    setEditingExpense(null);
    form.resetFields();
  };

  // 提交编辑账单表单
  const handleEditSubmit = async (values: any) => {
    if (!editingExpense) return;
    
    try {
      const updatedExpense = await expenseService.updateExpense(editingExpense.id, values);
      
      // 更新账单列表
      const updatedExpenses = expenses.map(expense => 
        expense.id === editingExpense.id ? updatedExpense : expense
      );
      setExpenses(updatedExpenses);
      
      // 重新计算总费用
      const total = updatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      setTotalExpense(total);
      
      setIsEditModalVisible(false);
      setEditingExpense(null);
      form.resetFields();
      message.success('账单更新成功');
    } catch (error) {
      console.error('更新账单失败:', error);
      message.error('更新账单失败，请稍后重试');
    }
  };

  // 删除账单
  const handleDelete = async (expenseId: string, amount: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条账单记录吗？',
      onOk: async () => {
        try {
          await expenseService.deleteExpense(expenseId);
          
          // 从列表中移除账单
          const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
          setExpenses(updatedExpenses);
          
          // 重新计算总费用
          setTotalExpense(totalExpense - amount);
          message.success('账单删除成功');
        } catch (error) {
          console.error('删除账单失败:', error);
          message.error('删除账单失败，请稍后重试');
        }
      }
    });
  };

  // 处理语音输入完成
  const handleVoiceInputComplete = (_fieldName: string, text: string) => {
    form.setFieldsValue({ reason: text });
  };

  // 账单表格列配置
  const columns: ColumnsType<ExpenseRecord> = [
    {
      title: '时间',
      dataIndex: 'expenseTime',
      key: 'expenseTime',
      render: (time) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `¥${amount.toFixed(2)}`
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <span>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            style={{ marginRight: 8 }}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.amount)}
          >
            删除
          </Button>
        </span>
      )
    }
  ];

  // 获取当前选择行程的名称
  const getSelectedPlanName = (): string => {
    if (!selectedPlan) return '';
    const plan = travelPlans.find((p: TravelPlan) => p.id === selectedPlan);
    return plan ? plan.title : '';
  };

  return (
    <div className="expense-statistics-container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="行程选择" className="mb-4">
            <Select
                value={selectedPlan}
                onChange={handlePlanChange}
                style={{ width: '100%' }}
                placeholder="请选择一个行程"
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label as string;
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
            >
              {travelPlans.map((plan: TravelPlan) => (
                <Option key={plan.id} value={plan.id}>
                  {plan.title}
                </Option>
              ))}
            </Select>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card title={`${getSelectedPlanName()} - 费用统计`} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
              添加账单
            </Button>
          }>
            <div className="total-expense mb-4">
              <h3>总费用: <span className="total-amount">¥{totalExpense.toFixed(2)}</span></h3>
            </div>
            
            <Table 
              columns={columns} 
              dataSource={expenses} 
              rowKey="id" 
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showQuickJumper: true
              }}
              locale={{
                emptyText: '暂无账单记录'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 添加账单模态框 */}
      <Modal
        title="添加账单"
        open={isAddModalVisible}
        onOk={() => form.submit()}
        onCancel={handleAddModalCancel}
        footer={[
          <Button key="cancel" onClick={handleAddModalCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            确定
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddSubmit}
        >
          <Form.Item
            name="amount"
            label="消费金额"
            rules={[{ required: true, message: '请输入消费金额' }]}
          >
            <InputNumber 
              prefix="¥" 
              style={{ width: '100%' }} 
              min={0} 
              step={0.01} 
              placeholder="请输入消费金额"
            />
          </Form.Item>
          
          <Form.Item
            name="expenseTime"
            label="消费时间"
            rules={[{ required: true, message: '请选择消费时间' }]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              placeholder="请选择消费时间"
              className="date-picker-fix"
            />
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="消费原因"
            rules={[{ required: true, message: '请输入消费原因' }]}
          >
            <div className="voice-input-container" style={{ display: 'flex', alignItems: 'flex-start' }}>
              <TextArea 
                rows={4} 
                placeholder="请输入消费原因或使用语音输入"
                style={{ flex: 1, marginRight: 8 }}
              />
              <VoiceInputButton 
                fieldName="reason" 
                onResult={handleVoiceInputComplete} 
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑账单模态框 */}
      <Modal
        title="编辑账单"
        open={isEditModalVisible}
        onOk={() => form.submit()}
        onCancel={handleEditModalCancel}
        footer={[
          <Button key="cancel" onClick={handleEditModalCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            确定
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="amount"
            label="消费金额"
            rules={[{ required: true, message: '请输入消费金额' }]}
          >
            <InputNumber 
              prefix="¥" 
              style={{ width: '100%' }} 
              min={0} 
              step={0.01} 
              placeholder="请输入消费金额"
            />
          </Form.Item>
          
          <Form.Item
            name="expenseTime"
            label="消费时间"
            rules={[{ required: true, message: '请选择消费时间' }]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              placeholder="请选择消费时间"
              className="date-picker-fix"
            />
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="消费原因"
            rules={[{ required: true, message: '请输入消费原因' }]}
          >
            <div className="voice-input-container" style={{ display: 'flex', alignItems: 'flex-start' }}>
              <TextArea 
                rows={4} 
                placeholder="请输入消费原因或使用语音输入"
                style={{ flex: 1, marginRight: 8 }}
              />
              <VoiceInputButton 
                fieldName="reason" 
                onResult={handleVoiceInputComplete} 
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseStatistics;