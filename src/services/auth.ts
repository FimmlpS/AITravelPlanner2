import supabase from './supabase';
import { DebugLogger, ErrorTracker } from './debugHelper';

// 用户类型定义
export interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

// 注册请求类型
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// 登录请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

// 确保接口正确导出
// 类型已作为接口导出，无需重复导出类型别名

// 用户认证服务类
// 注意：在Supabase中，密码处理由其认证系统自动管理：
// 1. 密码不会直接存储在我们的数据库表中
// 2. Supabase会对密码进行加密处理并存储在其内部的auth.users表中
// 3. 我们只需通过API进行密码验证，无需直接操作密码
class AuthService {
  // 注册新用户
  async register(data: RegisterRequest): Promise<{ user: User | null; error: string | null; needsConfirmation: boolean }> {
    try {
      const { data: supabaseData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name || data.email.split('@')[0], // 如果没有提供name，使用邮箱前缀作为默认name
          },
          // 设置自动发送确认邮件
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { user: null, error: error.message, needsConfirmation: false };
      }

      if (!supabaseData.user) {
          return { user: null, error: '注册失败，未返回用户信息', needsConfirmation: false };
        }

      // 确保用户名正确保存到user_profiles表
      // 从邮箱提取用户名（移除@后的部分）
      const username = data.name || data.email.split('@')[0];
      
      // 更新user_profiles表中的username
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          { id: supabaseData.user.id, username },
          { onConflict: 'id' }
        );
      
      if (profileError) {
        console.warn('更新用户配置文件失败:', profileError.message);
      }

      const user: User = {
        id: supabaseData.user.id,
        email: supabaseData.user.email || '',
        name: username, // 使用正确的用户名
        avatar_url: supabaseData.user.user_metadata?.avatar_url as string,
        created_at: supabaseData.user.created_at,
      };

      // 检查用户邮箱是否已确认
      const needsConfirmation = !supabaseData.user.email_confirmed_at;
      
      return { user, error: null, needsConfirmation };
    } catch (error) {
        return { user: null, error: (error as Error).message, needsConfirmation: false };
      }
  }

  // 用户登录
  async login(data: LoginRequest): Promise<{ user: User | null; error: string | null; needsConfirmation: boolean }> {
    const component = 'AuthService.login';
    DebugLogger.log(component, '开始用户登录', { email: data.email });
    
    try {
      const { data: supabaseData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // 处理邮箱未确认错误
        const needsConfirmation = error.message.includes('Email not confirmed');
        ErrorTracker.trackError(component, `登录失败: ${error.message}`);
        return { user: null, error: error.message, needsConfirmation };
      }

      if (!supabaseData.user) {
        const msg = '登录失败，未返回用户信息';
        ErrorTracker.trackError(component, msg);
        return { user: null, error: msg, needsConfirmation: false };
      }

      // 检查邮箱确认状态
      if (!supabaseData.user.email_confirmed_at) {
        const msg = '邮箱未确认，请先确认邮箱';
        ErrorTracker.trackError(component, msg);
        return { user: null, error: msg, needsConfirmation: true };
      }

      // 从user_profiles表获取最新的用户名
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', supabaseData.user.id)
        .single();

      const username = profileError ? 
        (supabaseData.user.user_metadata?.name as string || '') : 
        profileData.username;

      const user: User = {
        id: supabaseData.user.id,
        email: supabaseData.user.email || '',
        name: username,
        avatar_url: supabaseData.user.user_metadata?.avatar_url as string,
        created_at: supabaseData.user.created_at,
      };

      DebugLogger.log(component, '登录成功', { userId: user.id });
      return { user, error: null, needsConfirmation: false };
    } catch (error) {
      const errorMsg = (error as Error).message;
      ErrorTracker.trackError(component, errorMsg);
      DebugLogger.error(component, '登录异常', error);
      return { user: null, error: errorMsg, needsConfirmation: false };
    }
  }

  // 用户登出
  async logout(): Promise<{ error: string | null }> {
    const component = 'AuthService.logout';
    DebugLogger.log(component, '开始用户登出');
    
    try {
      // 尝试调用Supabase登出API
      const { error } = await supabase.auth.signOut();
      if (error) {
        // 记录错误但仍然返回成功，确保前端可以登出
        ErrorTracker.trackError(component, `Supabase登出API失败: ${error.message}`);
        DebugLogger.warn(component, 'Supabase登出API失败，但继续前端登出流程', { error: error.message });
        // 即使API调用失败，也返回成功，让前端可以清理用户状态
        return { error: null };
      }
      DebugLogger.log(component, '登出成功');
      return { error: null };
    } catch (error) {
      const errorMsg = (error as Error).message;
      // 记录错误但仍然返回成功，确保前端可以登出
      ErrorTracker.trackError(component, `登出网络异常: ${errorMsg}`);
      DebugLogger.warn(component, '登出网络异常，但继续前端登出流程', { error: errorMsg });
      // 即使网络异常，也返回成功，让前端可以清理用户状态
      return { error: null };
    }
  }

  // 获取当前登录用户
  async getCurrentUser(): Promise<User | null> {
    const component = 'AuthService.getCurrentUser';
    DebugLogger.log(component, '获取当前登录用户');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        DebugLogger.log(component, '未找到登录用户');
        return null;
      }

      const userData = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name as string,
        avatar_url: user.user_metadata?.avatar_url as string,
        created_at: user.created_at,
      };
      
      DebugLogger.log(component, '获取用户信息成功', { userId: userData.id });
      return userData;
    } catch (error) {
      ErrorTracker.trackError(component, (error as Error).message);
      DebugLogger.error(component, '获取用户信息失败', error);
      return null;
    }
  }

  // 更新用户信息
  async updateUser(data: Partial<Pick<User, 'name'>>): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data: supabaseData, error } = await supabase.auth.updateUser({
        data,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!supabaseData.user) {
        return { user: null, error: '更新失败，未返回用户信息' };
      }

      const user: User = {
        id: supabaseData.user.id,
        email: supabaseData.user.email || '',
        name: supabaseData.user.user_metadata?.name as string,
        avatar_url: supabaseData.user.user_metadata?.avatar_url as string,
        created_at: supabaseData.user.created_at,
      };

      return { user, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }

  // 上传用户头像
  async uploadAvatar(file: File): Promise<{ avatarUrl: string | null; error: string | null }> {
    const component = 'AuthService.uploadAvatar';
    DebugLogger.log(component, '开始上传用户头像', { fileName: file.name, fileSize: file.size });
    
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        DebugLogger.log(component, '用户未登录，无法上传头像');
        return { avatarUrl: null, error: '用户未登录' };
      }

      const fileName = `avatars/${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        ErrorTracker.trackError(component, `头像上传失败: ${uploadError.message}`);
        return { avatarUrl: null, error: uploadError.message };
      }

      const { data } = await supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      DebugLogger.log(component, '头像上传成功', { url: data.publicUrl });
      return { avatarUrl: data.publicUrl, error: null };
    } catch (error) {
      const errorMsg = (error as Error).message;
      ErrorTracker.trackError(component, errorMsg);
      DebugLogger.error(component, '头像上传异常', error);
      return { avatarUrl: null, error: errorMsg };
    }
  }

  // 设置认证状态变更监听
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name as string,
          avatar_url: session.user.user_metadata?.avatar_url as string,
          created_at: session.user.created_at,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
    // 返回取消订阅的函数
    return () => subscription.unsubscribe();
  }
}

export default new AuthService();