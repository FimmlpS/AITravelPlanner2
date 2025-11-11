// API配置文件，用于存储各种API密钥和配置
// 注意：实际使用时，请确保此文件已被添加到.gitignore中，以避免敏感信息泄露

interface ApiConfig {
  aliYunBaiLian: {
    apiKey: string;
    baseUrl: string;
    modelName: string;
  };
}

export const apiConfig: ApiConfig = {
  aliYunBaiLian: {
    // 从环境变量获取API密钥，如果没有则使用默认值
    // 实际部署时请设置环境变量VITE_DASHSCOPE_API_KEY
    apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || import.meta.env.DASHSCOPE_API_KEY || 'sk-495053ef710c42fa860cdab280c0dc1b',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelName: 'qwen3-max-2025-09-23'
  }
};

export default apiConfig;