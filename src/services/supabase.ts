import { createClient } from '@supabase/supabase-js';

// 这些变量在实际开发中应该从环境变量中获取
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// 创建Supabase客户端实例
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;