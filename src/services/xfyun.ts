// 科大讯飞API配置
  const APPID = import.meta.env.VITE_XFYUN_APP_ID || '69ae1d1f';
  const API_KEY = import.meta.env.VITE_XFYUN_API_KEY || '715b3134ff0ed8d8ccea7f70870007c4';
  const API_SECRET = import.meta.env.VITE_XFYUN_API_SECRET || 'YjNjNDQxMGU3M2ZkZWQ4NDcyN2VjMWJi';

/**
 * 生成WebSocket连接的认证参数
 */
// 计算HMAC-SHA256签名并转换为base64
const hmacSHA256 = async (message: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const crypto = window.crypto || (window as any).msCrypto;
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return arrayBufferToBase64(signature);
};

// ArrayBuffer转Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * 生成WebSocket连接的认证参数
 */
const generateAuthParams = (): string => {
  // 由于浏览器环境限制，这里返回一个模拟的URL
  // 实际项目中应该在服务端生成签名
  return `wss://ws-api.xfyun.cn/v2/iat?appid=${APPID}`;
};

// 供外部使用的异步版本
export const generateAuthParamsAsync = async (): Promise<string> => {
  if (!APPID || !API_KEY || !API_SECRET) {
    throw new Error('科大讯飞API配置不完整');
  }
  
  try {
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ws-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    
    // 计算HMAC-SHA256签名
    const signature = await hmacSHA256(signatureOrigin, API_SECRET);
    
    const authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = window.btoa(authorizationOrigin);
    
    return `wss://ws-api.xfyun.cn/v2/iat?authorization=${authorization}&date=${encodeURIComponent(date)}&host=ws-api.xfyun.cn`;
  } catch (error) {
    console.error('生成认证参数失败:', error);
    // 降级到简单URL
    return `wss://ws-api.xfyun.cn/v2/iat?appid=${APPID}`;
  }
};

/**
 * 语音识别服务
 */
export class SpeechRecognizer {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onResult?: (text: string, isFinal: boolean) => void;
  private onError?: (error: Error) => void;

  /**
   * 开始语音识别
   */
  start(onResult: (text: string, isFinal: boolean) => void, onError?: (error: Error) => void) {
    this.onResult = onResult;
    this.onError = onError;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(this.handleMediaStream.bind(this))
      .catch((error) => {
        console.error('获取麦克风权限失败:', error);
        this.onError?.(error);
      });
  }

  /**
   * 处理媒体流
   */
  private async handleMediaStream(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    // 连接WebSocket
    try {
      // 优先使用异步版本
      const wsUrl = await generateAuthParamsAsync();
      this.ws = new WebSocket(wsUrl);
    } catch (error) {
      // 降级使用同步版本
      console.warn('使用降级的WebSocket URL:', error);
      const wsUrl = generateAuthParams();
      this.ws = new WebSocket(wsUrl);
    }

    this.ws.onopen = this.handleWebSocketOpen.bind(this);
    this.ws.onmessage = this.handleWebSocketMessage.bind(this);
    this.ws.onerror = this.handleWebSocketError.bind(this);
    this.ws.onclose = this.handleWebSocketClose.bind(this);

    // 开始录音
    this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
    this.mediaRecorder.start(100); // 每100ms发送一次数据
  }

  /**
   * WebSocket连接打开
   */
  private handleWebSocketOpen() {
    console.log('语音识别WebSocket连接已打开');
    
    // 发送初始化参数
    const initParams = {
      common: {
        app_id: APPID,
      },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        vad_eos: 10000,
      },
      data: {
        status: 0,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: '',
      },
    };

    this.ws?.send(JSON.stringify(initParams));
  }

  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    
    if (data.code !== 0) {
      console.error('语音识别错误:', data);
      this.onError?.(new Error(`语音识别错误: ${data.message}`));
      return;
    }

    if (data.data && data.data.result) {
      const text = data.data.result.text.join('');
      const isFinal = data.data.status === 2;
      this.onResult?.(text, isFinal);
    }
  }

  /**
   * 处理录音数据
   */
  private handleDataAvailable(event: BlobEvent) {
    if (event.data.size > 0) {
      this.audioChunks.push(event.data);
      
      // 处理音频数据并发送到WebSocket
      this.processAudioData(event.data);
    }
  }

  /**
   * 处理音频数据
   */
  private async processAudioData(audioBlob: Blob) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // 将Blob转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // 转换为PCM格式并压缩 - 实际项目中可能需要更复杂的音频处理
      
      // 将音频数据转换为Base64（使用浏览器原生方法）
      const base64Audio = arrayBufferToBase64(arrayBuffer);
      
      // 发送音频数据
      const data = {
        common: {
          app_id: APPID,
        },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
        },
        data: {
          status: 1,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: base64Audio,
        },
      };
      
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('音频数据处理失败:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * ArrayBuffer转Base64
   */
  // 已移至外部使用arrayBufferToBase64函数

  /**
   * 结束语音识别
   */
  async stop() {
    // 停止录音
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // 处理累积的音频数据
    if (this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks);
      try {
        await this.processAudioData(audioBlob);
      } catch (error) {
        console.error('音频数据处理失败:', error);
        this.onError?.(error as Error);
      }
    }

    // 发送结束标识
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const endData = {
        data: {
          status: 2,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: '',
        },
      };
      this.ws.send(JSON.stringify(endData));
    }

    // 关闭连接
    setTimeout(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }, 500);

    // 释放资源
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * WebSocket错误处理
   */
  private handleWebSocketError(error: Event) {
    console.error('语音识别WebSocket错误:', error);
    this.onError?.(new Error('语音识别连接错误'));
  }

  /**
   * WebSocket关闭处理
   */
  private handleWebSocketClose() {
    console.log('语音识别WebSocket连接已关闭');
  }
}

/**
 * 语音合成服务
 */
export class TextToSpeech {
  /**
   * 文本转语音
   */
  async speak(text: string, options?: {
    voice?: string;
    speed?: number;
    volume?: number;
  }) {
    try {
      // 这里使用Web Speech API作为降级方案
      // 实际项目中应该调用科大讯飞的语音合成API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.volume = options?.volume || 1;
        utterance.rate = options?.speed || 1;
        
        // 设置声音
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang === 'zh-CN');
        if (chineseVoice) {
          utterance.voice = chineseVoice;
        }
        
        window.speechSynthesis.speak(utterance);
        
        return new Promise((resolve) => {
          utterance.onend = () => resolve(true);
        });
      } else {
        throw new Error('浏览器不支持语音合成');
      }
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  }

  /**
   * 停止语音合成
   */
  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export default {
  SpeechRecognizer,
  TextToSpeech,
};