supabase.url=https://cimjyjeqdkaelzrjtrru.supabase.co
supabase.anon.key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbWp5amVxZGthZWx6cmp0cnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDkwNTIsImV4cCI6MjA3ODI4NTA1Mn0.YUlf3QW4VzeM_-JIs3MYo93RWqUPjgeIQN79yXG8g0o

xfyun.app-id=69ae1d1f
xfyun.api-key=715b3134ff0ed8d8ccea7f70870007c4
xfyun.api-secret=YjNjNDQxMGU3M2ZkZWQ4NDcyN2VjMWJi

gaode.map.key=5612816083a872219d455ef9ed276e09

# 其他API密钥
阿里云百炼key=sk-495053ef710c42fa860cdab280c0dc1b


结构化输出
使用方式
设置response_format参数：在请求体中，将 response_format 参数设置为 {"type": "json_object"}。

提示词包含"JSON"关键词：System Message 或 User Message 中需要包含 "JSON" 关键词（不区分大小写），否则会报错：'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.

请使用模型：qwen3-max-2025-09-23
参考node.js文本输入
import OpenAI from "openai";

const openai = new OpenAI({
    // 如果没有配置环境变量，请用API Key将下行替换为：apiKey: "sk-xxx"
    // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    apiKey: process.env.DASHSCOPE_API_KEY,
    // 以下是北京地域base_url，如果使用新加坡地域的模型，需要将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
});

const completion = await openai.chat.completions.create({
    model: "qwen-flash",
    messages: [
        {
            role: "system",
            content: "请抽取用户的姓名与年龄信息，以JSON格式返回"
        },
        {
            role: "user",
            content: "大家好，我叫刘五，今年34岁，邮箱是liuwu@example.com，平时喜欢打篮球和旅游"
        }
    ],
    response_format: {
        type: "json_object"
    }
});

const jsonString = completion.choices[0].message.content;
console.log(jsonString);

返回结果示例
{
  "姓名": "刘五",
  "年龄": 34
}