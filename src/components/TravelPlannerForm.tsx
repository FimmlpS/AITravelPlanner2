import { useState, useRef } from 'react';
import { Form, Input, DatePicker, InputNumber, Select, Button, message, Card, Row, Col, Space, Spin } from 'antd';
import { AudioOutlined, SendOutlined } from '@ant-design/icons';
import VoiceInputButton from './VoiceInputButton';
// Dayjs导入已移除
import { useAppDispatch, useAppSelector } from '../store';
import { generateTravelPlan, type TravelPreference } from '../store/slices/travelSlice';
import { SpeechRecognizer } from '../services/xfyun';
import aiTravelGenerator from '../services/aiTravelGenerator';

const { TextArea } = Input;
const { Option } = Select;

interface TravelPlannerFormProps {
  onPlanGenerated?: (responseData?: any) => void;
}

const TravelPlannerForm: React.FC<TravelPlannerFormProps> = ({ onPlanGenerated }) => {
  const [form] = Form.useForm();
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.user); // 获取当前用户信息

  // 处理单个字段的语音识别结果
  const handleFieldSpeechResult = (fieldName: string, text: string) => {
    form.setFieldsValue({
      [fieldName]: text
    });
  };

  // 旅行偏好选项
  const preferenceOptions = [
    { value: 'food', label: '美食' },
    { value: 'shopping', label: '购物' },
    { value: 'culture', label: '文化历史' },
    { value: 'nature', label: '自然风光' },
    { value: 'adventure', label: '冒险活动' },
    { value: 'family', label: '亲子游' },
    { value: 'relax', label: '休闲度假' },
    { value: 'photography', label: '摄影' },
  ];

  // 处理语音识别结果
  const handleSpeechResult = (text: string, isFinal: boolean) => {
    setRecognizedText(text);
    // 如果是最终结果，填充到表单
    if (isFinal) {
      // 这里可以添加NLP解析，从文本中提取结构化信息
      form.setFieldsValue({
        description: text,
      });
    }
  };

  // 开始录音
  const startRecording = () => {
    if (!('MediaRecorder' in window)) {
      message.error('浏览器不支持语音录制功能');
      return;
    }

    // 检查是否有麦克风权限
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setIsRecording(true);
        setRecognizedText('');
        
        speechRecognizerRef.current = new SpeechRecognizer();
        speechRecognizerRef.current.start(
          handleSpeechResult,
          (error) => {
            message.error('语音识别失败: ' + error.message);
            setIsRecording(false);
          }
        );
      })
      .catch(() => {
        message.error('无法访问麦克风，请检查权限设置');
      });
  };

  // 停止录音
  const stopRecording = () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }
    setIsRecording(false);
  };

  // 处理表单提交
  const onFinish = async (values: any) => {
    try {
      setIsGenerating(true);
      // 准备行程偏好数据
      const travelPreference: TravelPreference = {
        destination: values.destination,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        budget: values.budget,
        peopleCount: values.peopleCount,
        preferences: values.preferences || [],
      };

      // 调用Redux thunk生成行程，传递用户ID
      await dispatch(generateTravelPlan({ 
        preferences: travelPreference, 
        userId: user?.id 
      })).unwrap();
      
      // 获取AI生成器实例以获取API响应数据
      const aiGenerator = aiTravelGenerator;
      const apiResponseData = aiGenerator.getLastApiResponse();
      
      message.success('行程规划生成成功！');
      onPlanGenerated?.(apiResponseData);
      
      // 清空表单
      form.resetFields();
      setRecognizedText('');
      
      // 滚动到页面顶部显示成功消息
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('行程生成失败:', error);
      message.error('行程规划生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card title="创建旅行计划" className="travel-planner-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          peopleCount: 1,
          preferences: [],
        }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="语音输入需求（推荐）"
              className="voice-input-section"
            >
              <Space>
                <Button
                  type={isRecording ? "primary" : "default"}
                  icon={<AudioOutlined />}
                  onClick={isRecording ? stopRecording : startRecording}
                  loading={isRecording}
                >
                  {isRecording ? '停止录音' : '开始录音'}
                </Button>
                {recognizedText && (
                  <div className="recognized-text">
                    识别结果: {recognizedText}
                  </div>
                )}
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="目的地"
              name="destination"
              rules={[{ required: true, message: '请输入目的地' }]}
            >
              <Space style={{ width: '100%' }}>
                <Input placeholder="例如：北京、上海、东京" style={{ width: 'calc(100% - 40px)' }} />
                <VoiceInputButton 
                  fieldName="destination" 
                  onResult={handleFieldSpeechResult} 
                />
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="开始日期"
              name="startDate"
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="结束日期"
              name="endDate"
              rules={[{ required: true, message: '请选择结束日期' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="预算（元）"
              name="budget"
              rules={[{ required: true, message: '请输入预算' }]}
            >
              <InputNumber className="w-full" min={1000} placeholder="旅行总预算" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="人数"
              name="peopleCount"
              rules={[{ required: true, message: '请输入人数' }]}
            >
              <InputNumber className="w-full" min={1} placeholder="同行人数" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="旅行偏好"
              name="preferences"
            >
              <Select
                mode="multiple"
                placeholder="请选择您的旅行偏好"
                className="w-full"
              >
                {preferenceOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="其他需求描述（可选）"
              name="description"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextArea 
                  rows={4} 
                  placeholder="可以描述更多细节，如：特殊饮食要求、必须参观的景点等" 
                  style={{ width: 'calc(100% - 40px)', marginRight: 8 }}
                />
                <div style={{ marginTop: 4 }}>
                  <VoiceInputButton 
                    fieldName="description" 
                    onResult={handleFieldSpeechResult} 
                  />
                </div>
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space className="w-full justify-content-center">
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SendOutlined />} 
              loading={isGenerating}
              className="min-w-[180px]"
            >
              生成旅行计划
            </Button>
            {isGenerating && (
              <Spin tip="AI正在生成旅行计划，请稍候..." size="small" />
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TravelPlannerForm;