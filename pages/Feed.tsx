
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, TrendingUp, Clock, Headphones, Star, Search, Loader2, ListPlus, CheckCircle, ArrowRight, Calendar, User, History, Trash2, Heart, CheckSquare, Square, X, Settings2, ShieldCheck, Music, Library } from 'lucide-react';
import { Song } from '../types';
import { getSongFeed, SortFilter, deleteSong, deleteSongs } from '../services/realSunoService';
import { supabase } from '../lib/supabaseClient';
import { usePlayer } from '../context/PlayerContext';
import PlaylistSidebar from '../components/PlaylistSidebar';

const ADMIN_EMAIL = '774frank1@gmail.com';

const timeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "刚刚";
    let interval = seconds / 3600;
    if (interval < 1) return Math.floor(seconds / 60) + " 分钟前";
    if (interval < 24) return Math.floor(interval) + " 小时前";
    if (interval < 24 * 7) return Math.floor(interval / 24) + " 天前";
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const Feed: React.FC = () => {
    const [filter, setFilter] = useState<SortFilter>('latest');
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addedId, setAddedId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // 批量管理状态
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [searchParams, setSearchParams] = useSearchParams();
    const artistFilter = searchParams.get('artist');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickLink, setQuickLink] = useState('');

    // Modal State
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'batch', id?: string, title?: string } | null>(null);

    const { addToQueue } = usePlayer();
    const navigate = useNavigate();

    const isAdmin = currentUser?.email === ADMIN_EMAIL;

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
        });
    }, []);

    const fetchSongs = async () => {
        setIsLoading(true);
        try {
            const data = await getSongFeed(filter, artistFilter || undefined, currentUser?.id);
            setSongs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSongs();
        setIsManageMode(false);
        setSelectedIds(new Set());
    }, [filter, artistFilter, currentUser]);

    // Computed Properties
    const filteredSongs = songs.filter(song => {
        if (!searchQuery) return true;
        const lower = searchQuery.toLowerCase();
        return song.title.toLowerCase().includes(lower) || song.artist.toLowerCase().includes(lower);
    });

    const handleArtistClick = (e: React.MouseEvent, artistName: string) => {
        e.preventDefault(); e.stopPropagation();
        setSearchParams({ artist: artistName });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredSongs.length) {
            setSelectedIds(new Set());
        } else {
            const deletableIds = filteredSongs
                .filter(s => isAdmin || (currentUser && s.user_id === currentUser.id))
                .map(s => s.id!);
            setSelectedIds(new Set(deletableIds));
        }
    };

    const handleDeleteClick = (song: Song) => {
        setDeleteTarget({ type: 'single', id: song.id!, title: song.title });
    };

    const handleBatchDeleteClick = () => {
        setDeleteTarget({ type: 'batch' });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsLoading(true);
        try {
            if (deleteTarget.type === 'single' && deleteTarget.id) {
                await deleteSong(deleteTarget.id);
                // Optimistic update
                setSongs(prev => prev.filter(s => s.id !== deleteTarget.id));
            } else if (deleteTarget.type === 'batch') {
                await deleteSongs(Array.from(selectedIds));
                setSongs(prev => prev.filter(s => !selectedIds.has(s.id!)));
                setSelectedIds(new Set());
                setIsManageMode(false);
            }
            // Close modal
            setDeleteTarget(null);
        } catch (err: any) {
            console.error('删除失败:', err);
            alert("删除失败: " + (err.message || '未知错误'));
            // 确保即使失败也关闭模态框
            setDeleteTarget(null);
        } finally {
            // 确保 loading 状态总是被重置
            setIsLoading(false);
        }
    };

    const showManageButton = currentUser && (isAdmin || filter === 'mine');

    const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
        <button onClick={onClick} className={`flex items-center gap-1.5 pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${active ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'}`} >
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="animate-fade-in-up relative pb-20">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 w-full min-w-0">
                    {/* 艺术家主页样式头部 */}
                    {artistFilter && (
                        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 mb-8 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between shadow-xl shadow-indigo-500/5 animate-fade-in-up gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none rotate-3">
                                    <User size={32} />
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">正在浏览歌手</p>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">{artistFilter}</h2>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black ring-1 ring-indigo-100 dark:ring-indigo-800">
                                            <Library size={12} />
                                            已收录 {songs.length} 首作品
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSearchParams({})}
                                className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-sm font-bold transition hover:scale-105 active:scale-95 shadow-xl"
                            >
                                返回发现
                            </button>
                        </div>
                    )}

                    {!artistFilter && filter !== 'mine' && !isManageMode && (
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-800 dark:from-indigo-900 dark:to-purple-950 rounded-3xl p-8 text-white mb-8 shadow-xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="max-w-md text-center md:text-left">
                                    <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">粘贴链接，<br />即刻生成播放器</h1>
                                    <p className="text-indigo-100/80 text-sm">支持 Suno.com 链接，自动提取歌词、封面并永久云端备份。</p>
                                </div>
                                <div className="w-full md:w-auto flex-1 max-w-lg">
                                    <form onSubmit={(e) => { e.preventDefault(); navigate(`/publish?url=${encodeURIComponent(quickLink)}`); }} className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex shadow-lg">
                                        <input type="text" value={quickLink} onChange={(e) => setQuickLink(e.target.value)} placeholder="粘贴 Suno 歌曲链接..." className="flex-1 bg-transparent border-none outline-none text-white placeholder-indigo-200/70 px-4 py-3 min-w-0" />
                                        <button type="submit" disabled={!quickLink.trim()} className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap">生成 <ArrowRight size={18} /></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4 mb-6 sticky top-[72px] bg-[#f8f9fc] dark:bg-[#030712] z-40 py-2 border-b dark:border-gray-800 lg:border-none">
                        <div className="relative w-full max-w-[120px] sm:max-w-xs">
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <Search className="ml-3 text-gray-400 shrink-0" size={14} />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索..." className="w-full py-2 px-2 bg-transparent outline-none dark:text-white text-xs sm:text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pr-2">
                            <TabButton active={filter === 'latest'} onClick={() => setFilter('latest')} icon={Clock} label="最新" />
                            <TabButton active={filter === 'trending'} onClick={() => setFilter('trending')} icon={TrendingUp} label="热门" />
                            <TabButton active={filter === 'top_rated'} onClick={() => setFilter('top_rated')} icon={Star} label="好评" />
                            {currentUser && (
                                <TabButton active={filter === 'mine'} onClick={() => setFilter('mine')} icon={Heart} label="我的作品" />
                            )}
                        </div>

                        {showManageButton && (
                            <button
                                onClick={() => setIsManageMode(!isManageMode)}
                                className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${isManageMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 shadow-sm'}`}
                            >
                                {isManageMode ? <X size={14} /> : <Settings2 size={14} />}
                                <span className="hidden sm:inline">
                                    {isManageMode ? '退出管理' : (isAdmin ? '全站管理' : '批量管理')}
                                </span>
                                {isAdmin && !isManageMode && <ShieldCheck size={12} className="text-yellow-500" />}
                            </button>
                        )}
                    </div>

                    {isLoading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div> : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredSongs.map((song) => {
                                const isOwner = currentUser && song.user_id === currentUser.id;
                                const canDelete = isAdmin || isOwner;
                                const isSelected = selectedIds.has(song.id!);

                                return (
                                    <div
                                        key={song.id}
                                        onClick={() => isManageMode && canDelete && toggleSelection(song.id!)}
                                        className={`group bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm transition border flex flex-col relative ${isManageMode ? (canDelete ? 'cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed') : 'cursor-default'} ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-gray-100 dark:border-gray-700 hover:shadow-lg'}`}
                                    >
                                        <div className="block relative mb-2">
                                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                                                <img src={song.image_url} alt="" className={`w-full h-full object-cover transition duration-500 ${isManageMode && isSelected ? 'scale-90' : 'group-hover:scale-105'}`} />

                                                {!isManageMode && (
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <Link to={`/song/${song.id}`} className="bg-white/90 text-indigo-600 p-2 rounded-full shadow-lg"><Play size={20} fill="currentColor" /></Link>
                                                    </div>
                                                )}

                                                {isManageMode && canDelete && (
                                                    <div className={`absolute top-2 right-2 p-1.5 rounded-lg shadow-md transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-400'}`}>
                                                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate mb-0.5">{song.title}</div>
                                        <div className="flex flex-col mb-2">
                                            <button onClick={(e) => { if (!isManageMode) handleArtistClick(e, song.artist); }} className={`text-[11px] text-gray-500 text-left truncate ${!isManageMode && 'hover:text-indigo-500'}`}>{song.artist}</button>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                <History size={10} />
                                                <span>{timeAgo(song.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700 mt-auto">
                                            <div className="flex gap-2 text-[10px] text-gray-400"><span className="flex items-center gap-0.5"><Headphones size={10} /> {song.plays_count || 0}</span></div>
                                            {!isManageMode && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            addToQueue(song);
                                                            setAddedId(song.id!);
                                                            setTimeout(() => setAddedId(null), 1500);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition ${addedId === song.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                        data-testid={`add-to-queue-${song.id}`}
                                                        aria-label={`添加 ${song.title} 到播放列表`}
                                                    >
                                                        {addedId === song.id ? <CheckCircle size={14} /> : <ListPlus size={14} />}
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleDeleteClick(song);
                                                            }}
                                                            className="p-1.5 rounded-lg transition text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            data-testid={`delete-${song.id}`}
                                                            aria-label={`删除 ${song.title}`}
                                                            title="删除"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <PlaylistSidebar />
            </div>

            {/* Batch Manage Toolbar */}
            {isManageMode && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-lg animate-fade-in-up">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-indigo-100 dark:border-gray-700 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleSelectAll}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-200 transition"
                            >
                                {selectedIds.size === filteredSongs.length && filteredSongs.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                {selectedIds.size === filteredSongs.length && filteredSongs.length > 0 ? '取消全选' : '选择全部'}
                            </button>
                            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {selectedIds.size > 0 ? `已选中 ${selectedIds.size} 项` : '请勾选作品'}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setIsManageMode(false); setSelectedIds(new Set()); }}
                                className="px-3 py-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleBatchDeleteClick}
                                disabled={selectedIds.size === 0}
                                className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-50 ${isAdmin ? 'bg-red-600 shadow-red-200' : 'bg-red-500 shadow-red-100'} text-white`}
                            >
                                <Trash2 size={16} /> 彻底删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Modal */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => {
                        // 点击背景关闭模态框
                        if (e.target === e.currentTarget) {
                            setDeleteTarget(null);
                        }
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700 transform transition-all scale-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {deleteTarget.type === 'single'
                                        ? `您确定要删除《${deleteTarget.title}》吗？`
                                        : `您确定要删除选中的 ${selectedIds.size} 首作品吗？`}
                                    <br />删除后可在历史记录中恢复。
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    data-testid="delete-modal-cancel"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    data-testid="delete-modal-confirm"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : '确认删除'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Feed;
