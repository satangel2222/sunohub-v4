import { Play, Pause, Heart, MoreVertical } from 'lucide-react';
import { Song } from '../types';
import { Link } from 'react-router-dom';

interface BottomPlayerProps {
    song: Song | null;
    isPlaying: boolean;
    onTogglePlay: () => void;
    progress: number; // 0-100
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
    song,
    isPlaying,
    onTogglePlay,
    progress
}) => {
    if (!song) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
            {/* 进度条 */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700">
                <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* 播放器内容 */}
            <div className="flex items-center gap-3 p-3">
                {/* 封面 */}
                <Link to={`/song/${song.id}`} className="shrink-0">
                    <img
                        src={song.image_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                    />
                </Link>

                {/* 歌曲信息 */}
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {song.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                        {song.artist}
                    </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onTogglePlay}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition active:scale-95"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500 transition">
                        <Heart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
