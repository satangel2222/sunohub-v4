
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, PlusCircle, Compass, LogIn, User, ShieldCheck, Sun, Moon, X, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { bulkUpdateArtistName } from '../services/realSunoService';

// ⚠️ 管理员邮箱配置
const ADMIN_EMAIL = '774frank1@gmail.com';

interface NavbarProps {
  onlineCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ onlineCount = 1 }) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  // Admin Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [targetArtist, setTargetArtist] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleBulkUpdate = async () => {
    if (!targetArtist.trim() || !newArtist.trim()) {
        alert("请输入原名称和新名称");
        return;
    }
    if (!confirm(`确定要将所有 "${targetArtist}" 替换为 "${newArtist}" 吗？此操作不可逆！`)) return;

    setAdminLoading(true);
    try {
        const count = await bulkUpdateArtistName(targetArtist, newArtist);
        alert(`操作成功！已更新 ${count} 首歌曲的艺术家名称。`);
        setTargetArtist('');
        setNewArtist('');
        setShowAdminModal(false);
        window.location.reload();
    } catch (e: any) {
        const errorMsg = e?.message || (typeof e === 'string' ? e : "管理员操作失败");
        alert("错误: " + errorMsg);
    } finally {
        setAdminLoading(false);
    }
  };

  const isActive = (path: string) => location.pathname === path ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10';

  const isAdmin = user?.email === ADMIN_EMAIL;

  // 获取头像 URL
  const getAvatar = () => {
      if (!user) return '';
      if (isAdmin) return `https://robohash.org/WhiteCat.png?set=set4`;
      const meta = user.user_metadata || {};
      if (meta.avatar_url) return meta.avatar_url;
      const seed = meta.nickname || user.email;
      const bg = meta.gender === 'female' ? 'ffdfbf' : 'b6e3f4';
      return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}`;
  };

  const getDisplayName = () => {
    if (isAdmin) return 'Developer';
    return user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#667eea]/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 transition-colors duration-300">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl tracking-tight group">
            <div className="w-8 h-8 bg-white text-[#667eea] dark:text-gray-900 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Music size={18} fill="currentColor" />
            </div>
            SunoHub
          </Link>
          
          <div className="hidden md:flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             <span className="text-[10px] font-bold text-white/90">{onlineCount} 在线</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors mr-1"
            title={theme === 'dark' ? "切换到日间模式" : "切换到深色模式"}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Link 
            to="/" 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isActive('/')}`}
          >
            <Compass size={18} />
            <span className="hidden sm:inline">发现</span>
          </Link>
          <Link 
            to="/publish" 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isActive('/publish')}`}
          >
            <PlusCircle size={18} />
            <span className="hidden sm:inline">发布</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
               {isAdmin && (
                   <button 
                    onClick={() => setShowAdminModal(true)}
                    className="p-1.5 mr-1 text-yellow-300 hover:bg-white/10 rounded-full transition"
                    title="管理员控制台"
                   >
                       <ShieldCheck size={20} />
                   </button>
               )}

              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden transition-all duration-300 bg-white ${isAdmin ? 'ring-4 ring-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)] scale-110 z-10' : 'ring-2 ring-white/20'}`}>
                <img 
                    src={getAvatar()} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                <span className="absolute text-gray-500">{!getAvatar() && (getDisplayName().charAt(0).toUpperCase())}</span>
              </div>
              
              <div className="flex flex-col items-start leading-none">
                  <span className={`text-white text-xs font-bold max-w-[80px] truncate ${isAdmin ? 'text-yellow-300' : ''}`}>
                      {getDisplayName()}
                  </span>
                  {isAdmin && <span className="text-[9px] text-yellow-400 font-bold tracking-wider">ADMIN</span>}
              </div>

              <button 
                onClick={handleLogout}
                className="ml-2 text-white/70 hover:text-white text-xs font-medium"
              >
                退出
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className={`ml-2 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isActive('/login')}`}
            >
              <LogIn size={18} />
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>

    {/* Admin Modal */}
    {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdminModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative p-6 animate-fade-in-up border border-gray-100 dark:border-gray-700">
                <button 
                    onClick={() => setShowAdminModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X size={20} />
                </button>
                
                <div className="flex items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck size={28} />
                    <h2 className="text-xl font-bold">管理员控制台</h2>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800/50">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm">批量替换艺术家名称</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">原名称 (例如 "Suno AI")</label>
                                <input 
                                    type="text" 
                                    value={targetArtist}
                                    onChange={e => setTargetArtist(e.target.value)}
                                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                    placeholder="输入要查找的名称..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">新名称 (例如 "My Band")</label>
                                <input 
                                    type="text" 
                                    value={newArtist}
                                    onChange={e => setNewArtist(e.target.value)}
                                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                    placeholder="输入新的名称..."
                                />
                            </div>
                            <button 
                                onClick={handleBulkUpdate}
                                disabled={adminLoading || !targetArtist || !newArtist}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:shadow-none"
                            >
                                {adminLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                一键替换所有
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default Navbar;
