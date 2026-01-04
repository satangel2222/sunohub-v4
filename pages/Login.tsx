import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, User, Baby, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // New Profile States
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!nickname.trim()) {
          throw new Error("请输入昵称");
        }

        // --- 注册逻辑 ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: nickname,
              age: age,
              gender: gender,
              // 根据性别生成初始头像
              avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${nickname}-${gender}&backgroundColor=${gender === 'female' ? 'ffdfbf' : 'b6e3f4'}`
            }
          }
        });

        if (error) {
          // 处理“用户已存在”的特定错误
          if (error.message.includes('already registered') || error.message.includes('User already exists')) {
            throw new Error('该邮箱已被注册，请直接登录');
          }
          throw error;
        }

        // 关键逻辑：判断是否需要邮箱验证
        if (data.user && !data.session) {
          // 情况 A: Supabase 开启了 "Confirm email"
          setMessage("注册成功！确认邮件已发送，请查收邮箱点击链接激活账号。");
        } else if (data.session) {
          // 情况 B: Supabase 关闭了 "Confirm email" (推荐) -> 直接登录成功
          setMessage("注册成功！正在跳转...");
          setTimeout(() => {
            navigate('/');
          }, 800);
        }
      } else {
        // --- 登录逻辑 ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('邮箱或密码错误，或者您的账号尚未验证邮箱。');
          }
          throw error;
        }
        navigate('/'); // 登录成功跳转首页
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请检查账号密码');

      // 如果提示用户已存在，自动切换到登录模式方便用户
      if (err.message === '该邮箱已被注册，请直接登录') {
        setTimeout(() => {
          setIsSignUp(false);
          setError(null); // 清除错误，让用户直接登录
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 animate-fade-in-up pb-20">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
            {isSignUp ? <UserPlus size={32} /> : <LogIn size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isSignUp ? '创建账号' : '欢迎回来'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isSignUp ? '定制您的 Tunenora 专属形象' : '登录以管理您的作品'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start gap-2 animate-pulse">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* 注册专属扩展字段 */}
          {isSignUp && (
            <div className="space-y-6 animate-fade-in-up">
              {/* 1. 性别 (卡片选择) - Lazy UI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">选择性别</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${gender === 'male' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-md transform scale-105' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-750 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="text-4xl">👦</span>
                    <span className="font-bold">男生</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${gender === 'female' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 shadow-md transform scale-105' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-750 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="text-4xl">👧</span>
                    <span className="font-bold">女生</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* 2. 年龄 (下拉选择) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">年龄</label>
                  <div className="relative">
                    <select
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 dark:text-white focus:border-indigo-500 outline-none transition appearance-none cursor-pointer font-bold text-center"
                    >
                      {Array.from({ length: 80 }, (_, i) => i + 12).map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <span className="text-xs">▼</span>
                    </div>
                  </div>
                </div>

                {/* 3. 昵称 */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">昵称</label>
                  <div className="relative">
                    <input
                      type="text"
                      required={isSignUp}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition"
                      placeholder="给自己起个好听的名字"
                    />
                    <Smile className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱地址</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">密码</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition"
                  placeholder="••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? '立即注册' : '登 录')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isSignUp ? '已有账号？' : '还没有账号？'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="ml-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              {isSignUp ? '直接登录' : '免费注册'}
            </button>
          </p>
        </div>

        {isSignUp && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              提示：注册后您的头像将根据性别和昵称自动生成。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;