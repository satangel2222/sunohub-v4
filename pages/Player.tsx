
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Play, Pause, SkipBack, SkipForward, Share2,
    Loader, Star, Check, Trash2, MessageSquare, User, FileText,
    Shuffle, Repeat, Repeat1, Edit, Save, X, Music, ListMusic,
    Download, Calendar, CheckCircle, MessageCircle, Twitter, Facebook, Link as LinkIcon, Lock
} from 'lucide-react';
import { Song, Review, Listener } from '../types';
import { getSongById, incrementPlays, deleteSong, submitReview, getReviews, deleteReview, updateSongLyrics } from '../services/realSunoService';
import { supabase } from '../lib/supabaseClient';
import { usePlayer } from '../context/PlayerContext';
import PlaylistSidebar from '../components/PlaylistSidebar';

const ADMIN_EMAIL = '774frank1@gmail.com';

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 歌词行接口
interface LyricLine {
    time: number;
    text: string;
}

const Player: React.FC = () => {
    const { songId } = useParams<{ songId: string }>();
    const navigate = useNavigate();
    const { playNext, playPrev, repeatMode, isShuffle, toggleRepeat, toggleShuffle, addToQueue } = usePlayer();

    const [song, setSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [audioSrc, setAudioSrc] = useState<string>('');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [listeners, setListeners] = useState<Listener[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isMobileQueueOpen, setIsMobileQueueOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const lyricContainerRef = useRef<HTMLDivElement>(null);
    const hasIncrementedPlay = useRef(false);
    const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
    const isOwner = currentUser && song?.user_id && currentUser.id === song.user_id;

    // Sync Mode States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLines, setSyncLines] = useState<{ time: number | null, text: string }[]>([]);
    const [activeSyncIndex, setActiveSyncIndex] = useState(0);

    // 开始打点模式
    const startSync = () => {
        if (!song?.lyrics) return;
        const cleanLines = song.lyrics
            .split('\n')
            .map(l => l.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim()) // 去除旧时间戳
            .filter(l => l);

        setSyncLines(cleanLines.map(text => ({ time: null, text })));
        setActiveSyncIndex(0);
        setIsSyncing(true);
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    // 触发录制当前行
    const handleSyncTrigger = () => {
        if (!isSyncing || !audioRef.current) return;
        const currentTime = audioRef.current.currentTime;

        setSyncLines(prev => {
            const newLines = [...prev];
            if (activeSyncIndex < newLines.length) {
                newLines[activeSyncIndex].time = currentTime;
            }
            return newLines;
        });
        setActiveSyncIndex(prev => Math.min(prev + 1, syncLines.length - 1));
    };

    // 键盘事件监听
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSyncing && e.code === 'Space') {
                e.preventDefault();
                handleSyncTrigger();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSyncing, activeSyncIndex]);

    // Sync Auto Scroll
    useEffect(() => {
        if (isSyncing && lyricContainerRef.current) {
            const container = lyricContainerRef.current;
            const activeLine = container.children[activeSyncIndex] as HTMLElement;
            if (activeLine) {
                container.scrollTo({
                    top: activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [activeSyncIndex, isSyncing]);

    // 保存录制结果
    const saveSyncedLyrics = async () => {
        if (!songId) return;
        const lrcContent = syncLines.map(line => {
            if (line.time === null) return line.text;
            const mins = Math.floor(line.time / 60);
            const secs = (line.time % 60).toFixed(2);
            return `[${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}] ${line.text}`;
        }).join('\n');

        await updateSongLyrics(songId, lrcContent);
        setIsSyncing(false);
        // Reload page to reflect changes
        window.location.reload();
    };

    // 获取当前用户
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    }, []);

    // 核心：加载歌曲数据
    useEffect(() => {
        const loadData = async () => {
            if (!songId) return;
            setIsLoading(true);
            setIsPlaying(false);
            setCurrentTime(0);
            hasIncrementedPlay.current = false;

            const [songData, reviewsData] = await Promise.all([
                getSongById(songId),
                getReviews(songId)
            ]);

            if (songData) {
                setSong(songData);
                setAudioSrc(songData.audio_url);
            }
            setReviews(reviewsData);
            setIsLoading(false);
            setTimeout(() => setIsPlaying(true), 500);
        };
        loadData();
    }, [songId]);

    // 🔥 关键：歌词解析逻辑
    const { parsedLyrics, hasSyncedLyrics } = useMemo(() => {
        if (!song?.lyrics) return { parsedLyrics: [], hasSyncedLyrics: false };
        const lines = song.lyrics.split('\n').filter(l => l.trim());

        // 检测是否带时间戳 [00:12.34]
        const hasSyncedLyrics = lines.some(l => /\[\d{2}:\d{2}(?:\.\d{1,3})?\]/.test(l)); // Re-calculate or lift state if needed, but here simple re-check

        const parsed = (() => {
            if (hasSyncedLyrics) {
                return lines.map(line => {
                    const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/);
                    if (match) {
                        const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
                        return { time, text: match[3].trim() };
                    }
                    return { time: -1, text: line };
                }).filter(l => l.time !== -1) as LyricLine[];
            } else {
                // 纯文本：根据时长平分（fallback 算法）
                const totalLines = lines.length;
                const estimatedDuration = duration || 240;
                return lines.map((text, index) => ({
                    time: (index / totalLines) * estimatedDuration,
                    text: text.trim()
                }));
            }
        })();

        return { parsedLyrics: parsed, hasSyncedLyrics };
    }, [song?.lyrics, duration]);

    // 🔥 关键：计算当前应显示哪一行
    const activeLyricIndex = useMemo(() => {
        for (let i = parsedLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= parsedLyrics[i].time) {
                return i;
            }
        }
        return 0;
    }, [currentTime, parsedLyrics]);

    // 🔥 关键：自动居中滚动逻辑
    useEffect(() => {
        if (lyricContainerRef.current) {
            const container = lyricContainerRef.current;
            const activeLine = container.children[activeLyricIndex] as HTMLElement;
            if (activeLine) {
                const containerHeight = container.offsetHeight;
                const lineOffset = activeLine.offsetTop;
                const lineHeight = activeLine.offsetHeight;

                // 居中算法：滚动位置 = 行偏移 - 容器一半高度 + 行的一半高度
                container.scrollTo({
                    top: lineOffset - (containerHeight / 2) + (lineHeight / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [activeLyricIndex]);

    // Media Session 集成
    useEffect(() => {
        if ('mediaSession' in navigator && song) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: 'SunoHub AI Music',
                artwork: [
                    { src: song.image_url, sizes: '512x512', type: 'image/png' },
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            navigator.mediaSession.setActionHandler('previoustrack', onPrevClick);
            navigator.mediaSession.setActionHandler('nexttrack', onNextClick);
        }
    }, [song]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(() => setIsPlaying(false));
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            } else {
                audioRef.current.pause();
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            }
        }
    }, [isPlaying, audioSrc]);

    // Presence 逻辑
    useEffect(() => {
        if (!songId) return;
        const channel = supabase.channel(`song_room:${songId}`, { config: { presence: { key: Math.random().toString() } } });
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            setListeners(Object.values(state).flat() as unknown as Listener[]);
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') await channel.track({ joined_at: new Date().toISOString() });
        });
        return () => { supabase.removeChannel(channel); };
    }, [songId]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const curr = audioRef.current.currentTime;
            setCurrentTime(curr);
            if (curr > 10 && !hasIncrementedPlay.current && songId) {
                incrementPlays(songId);
                hasIncrementedPlay.current = true;
            }
        }
    };

    const onNextClick = () => playNext((id) => navigate(`/song/${id}`), songId);
    const onPrevClick = () => playPrev((id) => navigate(`/song/${id}`), songId);

    const isEmbed = window.location.href.includes('embed=true');
    const [showWeChatQR, setShowWeChatQR] = useState(false);

    // Construct a clean share URL, avoiding blob/local/hash mess if possible
    const shareUrl = useMemo(() => {
        // 1. Try to get ID from params
        let finalId = songId;

        // 2. Fallback: Parse from Hash if params missing (Common in weird iframe/preview modes)
        // Format: #/song/UUID or #/song/UUID?embed=true
        if (!finalId) {
            const match = window.location.hash.match(/\/song\/([a-f0-9-]{36})/i);
            if (match) {
                finalId = match[1];
            }
        }

        // 3. Construct Magic Link (server-side proxy for rich previews)
        if (finalId) {
            return `https://sunohub-v4.vercel.app/s/${finalId}`;
        }

        // 4. Absolute Fallback
        return 'https://sunohub-v4.vercel.app/';
    }, [songId]);

    // Unified Super Hook Text
    const shareText = useMemo(() => {
        if (!song) return '';
        return `🎵 发现一首神曲！\n${song.title} - ${song.artist}\n\n👉 立即试听: ${shareUrl}`;
    }, [song, shareUrl]);

    const displayTitle = song ? `${song.title} - ${song.artist} | SunoHub` : 'SunoHub Player';
    const displayImage = song?.image_url || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=1200&auto=format&fit=crop';

    useEffect(() => {
        document.title = displayTitle;
    }, [displayTitle]);

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-indigo-600" size={40} /></div>;
    if (!song) return <div className="text-center py-20">歌曲未找到</div>;

    return (
        <div className={`mx-auto animate-fade-in-up relative ${isEmbed ? 'p-0 w-full h-screen overflow-hidden bg-white dark:bg-gray-900' : 'pt-4 md:pt-8 pb-20'}`}>


            <div className={`flex flex-col lg:flex-row gap-8 items-start ${isEmbed ? 'h-full' : ''}`}>
                <div className={`flex-1 w-full min-w-0 ${isEmbed ? 'h-full' : ''}`}>
                    {/* 播放器主卡片 */}
                    <div className={`bg-white dark:bg-gray-800 overflow-hidden relative border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row ${isEmbed ? 'h-full border-none rounded-none shadow-none' : 'rounded-[32px] md:rounded-[48px] shadow-xl mb-8'}`}>
                        <div className={`p-8 md:p-12 flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-gray-900/50 ${isEmbed ? 'h-full w-full md:w-1/2' : 'md:w-[45%]'}`}>
                            <div className="relative w-64 h-64 md:w-72 md:h-72 shadow-2xl rounded-3xl overflow-hidden mb-8 ring-8 ring-white dark:ring-gray-700">
                                <img src={song.image_url} className={`w-full h-full object-cover transition duration-[2s] ${isPlaying ? 'scale-110' : 'scale-100'}`} alt="" />
                            </div>
                            {!isEmbed && (
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center gap-2 border border-gray-100 dark:border-gray-700">
                                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                                        <span className="font-bold">{song.average_rating?.toFixed(1) || '0.0'}</span>
                                    </div>
                                    <button onClick={() => setShowShareModal(true)} className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center gap-2 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition">
                                        <Share2 size={18} /> 分享
                                    </button>
                                </div>
                            )}
                            {isEmbed && (
                                <div className="absolute top-4 right-4">
                                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-full text-gray-600 dark:text-white hover:bg-white/40 transition">
                                        <LinkIcon size={20} />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className={`flex-1 p-8 md:p-12 bg-white dark:bg-gray-900 flex flex-col justify-center ${isEmbed ? 'h-full md:w-1/2' : ''}`}>
                            <div className="mb-8">
                                {!isEmbed && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex -space-x-2">
                                            {listeners.slice(0, 3).map((l, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-indigo-100 overflow-hidden">
                                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${i}`} alt="" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{listeners.length} 人正在聆听</span>
                                    </div>
                                )}
                                <h1 className={`${isEmbed ? 'text-2xl' : 'text-3xl md:text-4xl'} font-extrabold text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2`}>{song.title}</h1>
                                <Link to={`/?artist=${encodeURIComponent(song.artist)}`} target={isEmbed ? '_blank' : undefined} className="text-xl text-indigo-600 dark:text-indigo-400 font-medium hover:underline block mb-2">{song.artist}</Link>
                            </div>

                            <div className="space-y-6">
                                <div className="w-full">
                                    <input type="range" min={0} max={duration || 100} value={currentTime} onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="w-full h-2 bg-indigo-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                    <div className="flex justify-between mt-2 text-xs text-gray-400 font-mono">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-8">
                                    <button onClick={toggleShuffle} className={`transition ${isShuffle ? 'text-indigo-600' : 'text-gray-300'}`}><Shuffle size={20} /></button>
                                    <button onClick={onPrevClick} className="text-gray-400 hover:text-indigo-600 transition"><SkipBack size={36} fill="currentColor" /></button>
                                    <button onClick={() => setIsPlaying(!isPlaying)} className={`bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition ${isEmbed ? 'w-16 h-16' : 'w-20 h-20'}`}>
                                        {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={onNextClick} className="text-gray-400 hover:text-indigo-600 transition"><SkipForward size={36} fill="currentColor" /></button>
                                    <button onClick={toggleRepeat} className={`transition ${repeatMode !== 'off' ? 'text-indigo-600' : 'text-gray-300'}`}>
                                        {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🎤 核心更新：KTV 级同步歌词显示器 */}
                    {!isEmbed && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                            {/* Sync Mode Controls */}
                            <div className="flex items-center justify-between mb-8 relative z-20">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {isSyncing ? (
                                        <span className="text-red-500 animate-pulse flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> 录制中... (敲击空格键)</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div> {hasSyncedLyrics ? '歌词已同步' : '歌词自动滚动'}</span>
                                    )}
                                </h3>
                                {(isOwner || isAdmin) && !isSyncing && (
                                    <button onClick={startSync} className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95">
                                        <Edit size={14} /> 开始打点
                                    </button>
                                )}
                                {isSyncing && (
                                    <div className="flex gap-2">
                                        <button onClick={() => { setIsSyncing(false); setIsPlaying(false); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-full font-bold text-xs hover:bg-gray-300 dark:text-white transition">取消</button>
                                        <button onClick={saveSyncedLyrics} className="px-4 py-2 bg-green-500 text-white rounded-full font-bold text-xs hover:bg-green-600 transition flex items-center gap-1 shadow-lg animate-bounce"><Save size={14} /> 保存</button>
                                    </div>
                                )}
                            </div>

                            <div
                                ref={lyricContainerRef}
                                className={`h-[400px] overflow-y-auto no-scrollbar text-center relative py-[180px] space-y-4 transition-all duration-700 ${isSyncing ? 'cursor-crosshair' : ''}`}
                                onClick={isSyncing ? handleSyncTrigger : undefined}
                            >
                                {isSyncing ? (
                                    syncLines.map((line, i) => {
                                        const isCurrent = i === activeSyncIndex;
                                        const isPast = i < activeSyncIndex;
                                        return (
                                            <div
                                                key={i}
                                                className={`py-3 px-4 transition-all duration-200 rounded-2xl border ${isCurrent
                                                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 text-red-600 dark:text-red-300 text-2xl font-bold scale-110 shadow-lg'
                                                    : isPast ? 'border-transparent text-gray-400 opacity-50 text-sm' : 'border-transparent text-gray-800 dark:text-gray-300 opacity-40'}`}
                                            >
                                                <div className="text-[10px] font-mono mb-1 opacity-50">{line.time !== null ? formatTime(line.time) + `.${Math.floor((line.time % 1) * 10)}` : '待录制...'}</div>
                                                {line.text}
                                            </div>
                                        );
                                    })
                                ) : (
                                    parsedLyrics.length > 0 ? (
                                        parsedLyrics.map((line, i) => {
                                            const isActive = i === activeLyricIndex;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = line.time; }}
                                                    className={`py-3 px-4 transition-all duration-500 cursor-pointer rounded-2xl ${isActive
                                                        ? 'text-indigo-600 dark:text-white text-2xl md:text-3xl font-extrabold scale-110 opacity-100'
                                                        : 'text-gray-300 dark:text-gray-600 text-lg md:text-xl font-medium opacity-40 hover:opacity-60'}`}
                                                >
                                                    {line.text}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                            <Music size={60} className="opacity-10 animate-bounce" />
                                            <p className="font-medium">纯音乐，请欣赏</p>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Sync Hint Overlay */}
                            {isSyncing && (
                                <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center pointer-events-none">
                                    <div className="bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold animate-pulse shadow-2xl flex items-center gap-2">
                                        <div className="w-16 h-8 border-2 border-white/30 rounded-lg flex items-center justify-center text-xs font-mono">SPACE</div>
                                        敲击空格或点击任意处录制下一行
                                    </div>
                                </div>
                            )}

                            {/* 歌词装饰遮罩 */}
                            <div className="absolute top-20 left-0 right-0 h-24 bg-gradient-to-b from-white dark:from-gray-800 to-transparent pointer-events-none z-10"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-10"></div>
                        </div>
                    )}
                </div>

                {!isEmbed && <PlaylistSidebar isOpen={isMobileQueueOpen} onClose={() => setIsMobileQueueOpen(false)} />}
            </div>

            <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={onNextClick}
                className="hidden"
            />

            {showShareModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 animate-fade-in-up">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg relative p-8 border border-gray-100 dark:border-gray-700">
                        <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        <h3 className="text-2xl font-bold text-center mb-8 dark:text-white">分享歌曲</h3>

                        {/* Social Buttons Grid */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')} className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition"><WhatsAppIcon /></div>
                                <span className="text-xs font-medium dark:text-gray-300">WhatsApp</span>
                            </button>

                            <div className="relative group">
                                <button onClick={() => setShowWeChatQR(!showWeChatQR)} className="flex flex-col items-center gap-2 w-full">
                                    <div className="w-14 h-14 bg-[#07C160] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition"><WeChatIcon /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">微信</span>
                                </button>
                                {/* WeChat QR Popup */}
                                {showWeChatQR && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white rounded-xl shadow-xl border z-50 animate-in fade-in zoom-in w-40 text-center">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`} alt="WeChat QR" className="w-32 h-32 mx-auto" />
                                        <div className="text-[10px] mt-2 text-gray-500 font-bold whitespace-nowrap">手机扫码 → 点右上角 ... 分享</div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')} className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition"><XIcon /></div>
                                <span className="text-xs font-medium dark:text-gray-300">Twitter</span>
                            </button>

                            <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')} className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 bg-[#1877F2] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition"><FacebookIcon /></div>
                                <span className="text-xs font-medium dark:text-gray-300">Facebook</span>
                            </button>
                        </div>

                        {/* Embed Code Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">嵌入播放器 (Embed)</div>
                                <button onClick={() => { navigator.clipboard.writeText(`<iframe src="${shareUrl}?embed=true" width="100%" height="450" frameborder="0"></iframe>`); alert("代码已复制"); }} className="text-indigo-600 text-xs font-bold hover:underline">复制全部</button>
                            </div>
                            <code className="block w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400 break-all cursor-text font-mono">
                                &lt;iframe src="{shareUrl}?embed=true" width="100%" height="450" frameborder="0"&gt;&lt;/iframe&gt;
                            </code>
                        </div>

                        {/* Super Copy Section */}
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={shareText}
                                    className="w-full h-24 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none dark:text-gray-300 resize-none font-sans leading-relaxed"
                                />
                                <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] rounded-md font-bold">推荐文案</div>
                            </div>
                            <button onClick={() => {
                                navigator.clipboard.writeText(shareText);
                                alert("超级文案已复制！快去分享吧！");
                            }} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 active:scale-95">
                                <FileText size={18} /> 一键复制超级文案
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const WhatsAppIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
);

const WeChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8.7 13.9c.2.2.6.2.8.1.2-.1.3-.3.3-.5 0-.2-.1-.4-.3-.5-.7-.4-1.2-1.1-1.2-1.9 0-1.2 1.2-2.3 2.9-2.3 1.7 0 3 1 3 2.3s-1.3 2.3-3 2.3c-.4 0-.7-.1-1.1-.2l-1.6.8.2-1.3c-.5-.7-.8-1.5-.8-2.4 0-2.4 2.7-4.4 6.1-4.4s6.1 2 6.1 4.4-2.7 4.4-6.1 4.4c-.6 0-1.3-.1-1.8-.3-.2-.1 0-.1 0-.1m7.4-4.8c-.3 0-.6.2-.6.5 0 .3.3.6.6.6.3 0 .6-.3.6-.6 0-.3-.3-.5-.6-.5m-3.8 0c-.3 0-.6.2-.6.5 0 .3.3.6.6.6.3 0 .6-.3.6-.6 0-.3-.3-.5-.6-.5m10.1 7.1c0 2.9-3.2 5.2-7.1 5.2-1 0-1.9-.1-2.8-.4l-2.4 1.3.4-2c-1.1-1.1-1.8-2.5-1.8-4.1 0-2.9 3.2-5.2 7.1-5.2s7.1 2.3 7.1 5.2zM24 16.2c0-3.6-3.7-6.5-8.3-6.5-4.6 0-8.3 2.9-8.3 6.5 0 3.6 3.7 6.5 8.3 6.5 1 0 1.9-.1 2.8-.3l2.8 1.5-.6-2.5c1.7-1.3 2.7-3.1 2.7-5.2zm-5.7.9c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9-.5 0-.9.4-.9.9 0 .5.4.9.9.9zm-4.7 0c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9-.5 0-.9.4-.9.9 0 .5.4.9.9.9z" /></svg>
);

const FacebookIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
);

const XIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

export default Player;

