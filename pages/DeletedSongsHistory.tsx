import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, Calendar, User, Loader2, AlertCircle, Music } from 'lucide-react';
import { getDeletedSongs, restoreSong, permanentlyDeleteSong } from '../services/realSunoService';
import { DeletedSong } from '../types';
import { supabase } from '../lib/supabaseClient';

const ADMIN_EMAIL = '774frank1@gmail.com';

const DeletedSongsHistory: React.FC = () => {
    const [deletedSongs, setDeletedSongs] = useState<DeletedSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
        });
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadDeletedSongs();
        }
    }, [currentUser]);

    const loadDeletedSongs = async () => {
        setIsLoading(true);
        try {
            const data = await getDeletedSongs();
            setDeletedSongs(data);
        } catch (err: any) {
            console.error(err);
            alert('加载失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (id: string, title: string) => {
        if (!confirm(`确定要恢复《${title}》吗?`)) return;
        setProcessingId(id);
        try {
            await restoreSong(id);
            setDeletedSongs(prev => prev.filter(s => s.id !== id));
            alert('恢复成功!');
        } catch (err: any) {
            alert('恢复失败: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePermanentDelete = async (id: string, title: string) => {
        if (!confirm(`⚠️ 确定要永久删除《${title}》吗？\n\n此操作无法恢复！数据将从数据库中彻底删除。`)) return;
        setProcessingId(id);
        try {
            await permanentlyDeleteSong(id);
            setDeletedSongs(prev => prev.filter(s => s.id !== id));
            alert('已永久删除');
        } catch (err: any) {
            alert('永久删除失败: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const isAdmin = currentUser?.email === ADMIN_EMAIL;

    if (!currentUser) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="text-center py-20">
                    <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">请先登录</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">删除历史</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {isAdmin ? '管理员可查看所有删除记录' : '查看您删除的歌曲记录'}
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-20">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
                    <p className="text-gray-500">加载中...</p>
                </div>
            ) : deletedSongs.length === 0 ? (
                <div className="text-center py-20">
                    <Music className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={64} />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">暂无删除记录</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">已删除的歌曲会显示在这里</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {deletedSongs.map(song => (
                        <div
                            key={song.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
                            data-testid={`deleted-song-${song.id}`}
                        >
                            <img
                                src={song.image_url}
                                alt={song.title}
                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0 opacity-60"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{song.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{song.artist}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500 mt-2">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        删除于 {new Date(song.deleted_at!).toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {song.deleted_by_email && (
                                        <span className="flex items-center gap-1">
                                            <User size={12} />
                                            {song.deleted_by_email}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => handleRestore(song.id!, song.title)}
                                    disabled={processingId === song.id}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition font-bold text-sm"
                                    data-testid={`restore-${song.id}`}
                                >
                                    {processingId === song.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            <RotateCcw size={16} />
                                            恢复
                                        </>
                                    )}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => handlePermanentDelete(song.id!, song.title)}
                                        disabled={processingId === song.id}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition font-bold text-sm"
                                        data-testid={`permanent-delete-${song.id}`}
                                    >
                                        {processingId === song.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                永久删除
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deletedSongs.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <div className="flex gap-3">
                        <AlertCircle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0" size={20} />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            <p className="font-bold mb-1">温馨提示</p>
                            <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300">
                                <li>点击"恢复"可以将歌曲恢复到正常状态</li>
                                {isAdmin && <li>管理员可以"永久删除"记录,此操作无法恢复</li>}
                                <li>已删除的歌曲不会在主列表中显示</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeletedSongsHistory;
