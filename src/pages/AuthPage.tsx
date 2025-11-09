import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { loginUser, registerUser, clearConfirmationStatus } from '../store/slices/userSlice';
import authService from '../services/auth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [showConfirmationAlert, setShowConfirmationAlert] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { needsConfirmation } = useAppSelector(state => state.user);
  const navigate = useNavigate();

  // 处理登录提交
  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      await dispatch(loginUser(values)).unwrap();
      message.success('登录成功！');
      // 登录成功后跳转到旅行规划界面
      navigate('/app');
    } catch (error: any) {
      // 检查是否需要确认邮箱
      if (needsConfirmation) {
        message.warning('请先确认您的邮箱地址');
        setShowConfirmationAlert(true);
      } else {
        message.error(error.error || error as string || '登录失败，请检查邮箱和密码');
      }
    }
  };

  // 重新发送确认邮件
  const resendConfirmationEmail = async () => {
    const currentValues = loginForm.getFieldsValue();
    if (currentValues.email) {
      try {
        await authService.register({
          email: currentValues.email,
          password: 'dummy-password-to-trigger-resend', // 这里只是为了触发邮件重发
        });
        message.success('确认邮件已重新发送，请查收！');
      } catch (error) {
        message.error('发送确认邮件失败，请稍后重试');
      }
    }
  };

  // 处理注册提交
  const handleRegister = async (values: { email: string; password: string; name: string }) => {
    try {
      await dispatch(registerUser(values)).unwrap();
      
      if (needsConfirmation) {
        message.success('注册成功！请查收邮件确认您的邮箱地址');
        setShowConfirmationAlert(true);
        loginForm.setFieldsValue({ email: values.email });
        setActiveTab('login');
      } else {
        message.success('注册成功！');
        setActiveTab('login');
      }
      registerForm.resetFields();
    } catch (error: any) {
      if (needsConfirmation) {
        message.warning('注册成功，但需要确认邮箱地址');
        setShowConfirmationAlert(true);
      } else {
        message.error(error.error || error as string || '注册失败，请稍后重试');
      }
    }
  };

  // 关闭确认提示
  const handleCloseConfirmation = () => {
    setShowConfirmationAlert(false);
    dispatch(clearConfirmationStatus());
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 480, 
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        {showConfirmationAlert && (
          <Alert
            message="邮箱确认"
            description="请检查您的邮箱并点击确认链接以完成注册。如果未收到邮件，请点击下方按钮重新发送。"
            type="info"
            showIcon
            action={
              <Button 
                type="primary" 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={resendConfirmationEmail}
              >
                重新发送确认邮件
              </Button>
            }
            closable
            onClose={handleCloseConfirmation}
            style={{ marginBottom: '20px' }}
          />
        )}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            AI旅行规划师
          </Title>
          <Text type="secondary">登录或注册以开始您的智能旅行规划</Text>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form
                  form={loginForm}
                  layout="vertical"
                  onFinish={handleLogin}
                >
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱地址' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined className="site-form-item-icon" />} 
                      placeholder="请输入邮箱"
                      autoComplete="email"
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input
                      prefix={<LockOutlined className="site-form-item-icon" />}
                      type="password"
                      placeholder="请输入密码"
                      autoComplete="current-password"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      style={{ width: '100%', height: '40px', fontSize: '16px' }}
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form
                  form={registerForm}
                  layout="vertical"
                  onFinish={handleRegister}
                >
                  <Form.Item
                    name="name"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 2, message: '用户名至少2个字符' }
                    ]}
                  >
                    <Input 
                      prefix={<UserOutlined className="site-form-item-icon" />} 
                      placeholder="请输入用户名"
                      autoComplete="name"
                    />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱地址' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined className="site-form-item-icon" />} 
                      placeholder="请输入邮箱"
                      autoComplete="email"
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少6个字符' }
                    ]}
                  >
                    <Input
                      prefix={<LockOutlined className="site-form-item-icon" />}
                      type="password"
                      placeholder="请输入密码"
                      autoComplete="new-password"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      style={{ width: '100%', height: '40px', fontSize: '16px' }}
                    >
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default AuthPage;