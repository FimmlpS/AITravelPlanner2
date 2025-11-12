import { useState, useRef } from 'react';
import { Button, message } from 'antd';
import { AudioOutlined, LoadingOutlined } from '@ant-design/icons';
import { SpeechRecognizer } from '../services/xfyun';

interface VoiceInputButtonProps {
  fieldName: string;
  onResult: (fieldName: string, text: string) => void;
  className?: string;
}

/**
 * 语音输入按钮组件
 * 用于单独为某个输入框提供语音识别功能
 */
const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ 
  fieldName, 
  onResult, 
  className = '' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);

  // 处理语音识别结果
  const handleSpeechResult = (text: string, isFinal: boolean) => {
    setRecognizedText(text);
    // 如果是最终结果，通知父组件
    if (isFinal) {
      onResult(fieldName, text);
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
        
        // 显示提示信息
        message.info('请开始说话...');
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
    
    if (recognizedText) {
      message.success('语音识别完成');
    }
  };

  return (
    <Button
      type={isRecording ? "primary" : "default"}
      icon={isRecording ? <LoadingOutlined /> : <AudioOutlined />}
      onClick={isRecording ? stopRecording : startRecording}
      loading={isRecording}
      shape="circle"
      size="small"
      title={isRecording ? '停止录音' : '开始录音'}
      className={`voice-input-button ${className}`}
      style={{
        width: 32,
        height: 32,
        minWidth: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
      }}
    />
  );
};

export default VoiceInputButton;