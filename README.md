# AI旅行规划师应用

这是一个基于React和TypeScript开发的AI旅行规划师应用，帮助用户根据偏好生成详细的旅行计划，管理旅行账单，并提供地图查看功能。

## 安装与设置

### 环境要求
- Node.js 16+
- npm 或 yarn
- Supabase 账户

### 安装步骤

1. **克隆项目并安装依赖**
   ```bash
   git clone [repository-url]
   cd AITravelPlanner2
   npm install
   ```

2. **配置环境变量**
   - 复制`.env.example`文件为`.env`
   - 填写所需的API密钥和配置信息：
     ```
     # Supabase配置
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     
     # 科大讯飞API配置（用于语音输入）
     VITE_XFYUN_APP_ID=your-xfyun-app-id
     VITE_XFYUN_API_KEY=your-xfyun-api-key
     VITE_XFYUN_API_SECRET=your-xfyun-api-secret
     
     # 高德地图API配置
     VITE_GAODE_MAP_KEY=your-gaode-map-key
     
     # 阿里云百炼API配置（用于AI生成）
     VITE_DASHSCOPE_API_KEY=sk-your-dashscope-api-key
     ```

3. **初始化数据库**
   - 打开Supabase控制台
   - 导航到SQL编辑器
   - 复制`src/services/databaseSetup.sql`中的SQL语句并执行
   - 详细设置指南请参考`src/services/SUPABASE_SETUP_GUIDE.md`

4. **运行开发服务器**
   ```bash
   npm run dev
   ```

5. **构建生产版本**
   ```bash
   npm run build
   ```

## 数据库设置

应用使用Supabase作为数据库存储。数据库结构包括：
- 行程表（travel_plans）
- 账单记录表（expense_records）

详细的数据库结构请查看`src/services/databaseSetup.sql`文件。

## 应用特性

- **智能旅行计划生成**：基于用户偏好自动生成详细的旅行计划
- **旅行账单管理**：添加、编辑、删除和查看旅行相关费用
- **语音输入功能**：支持通过语音输入账单信息
- **地图视图**：显示行程地点和路线
- **响应式设计**：适配各种设备屏幕尺寸
- **数据持久化**：使用Supabase云数据库存储用户数据

## 技术栈

- **前端框架**：React 18 + TypeScript
- **状态管理**：Redux Toolkit
- **UI组件库**：Ant Design
- **数据库**：Supabase (PostgreSQL)
- **构建工具**：Vite
- **地图服务**：高德地图API
- **AI服务**：阿里云百炼API
- **语音识别**：科大讯飞API

## 项目结构

```
src/
├── components/     # React组件
├── services/       # API服务和数据库交互
├── store/          # Redux状态管理
├── types/          # TypeScript类型定义
├── pages/          # 页面组件
├── config/         # 配置文件
└── assets/         # 静态资源
```

## 注意事项

- 请确保所有必需的API密钥都已正确配置
- 账单金额在数据库中以分为单位存储，但在UI上以元为单位显示
- 首次使用需要初始化Supabase数据库结构
- 开发环境运行在 http://localhost:5173（或自动分配的端口）
