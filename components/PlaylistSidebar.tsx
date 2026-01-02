
import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Trash2, Play, Music, ListX, PlayCircle, Shuffle, Repeat, Repeat1, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlaylistSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({ isOpen = false, onClose }) => {
  const { 
    queue, 
    currentIndex, 
    removeFromQueue, 
    clearQueue, 
    playFromQueue,
    repeatMode,
    isShuffle,
    toggleRepeat,
    toggleShuffle
  } = usePlayer();
  const navigate = useNavigate();

  const getRepeatTooltip = () => {
    switch (repeatMode) {
        case 'one': return "单曲循环：当前歌曲无限重复";
        case 'one_custom': return "双次循环：单曲播放两次后切歌";
        case 'all': return "列表循环：播放完回到开头";
        default: return "顺序播放：播完停止 (点击切换)";
    }
  };

  // Base Styles
  const commonClasses = "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-300";
  
  // Responsive Layout Logic
  // Desktop: Sticky sidebar
  // Mobile (Open): Fixed full-screen modal
  // Mobile (Closed): Hidden
  const layoutClasses = isOpen 
    ? "fixed inset-0 z-[100] w-full h-full shadow-2xl animate-fade-in-up rounded-none" 
    : "hidden lg:flex w-80 rounded-3xl shadow-xl border h-[calc(100vh-100px)] sticky top-24";

  const containerClass = `${commonClasses} ${layoutClasses}`;

  const handlePlay = (index: number, songId: string) => {
      playFromQueue(index);
      navigate(`/song/${songId}`);
      if (isOpen && onClose) onClose();
  };

  const handlePlayAll = () => {
      if (queue.length > 0) {
          playFromQueue(0);
          navigate(`/song/${queue[0].id}`);
          if (isOpen && onClose) onClose();
      }
  };

  // Mobile Header with Close Button
  const MobileCloseBtn = () => (
      <button 
        onClick={onClose}
        className={`lg:hidden absolute top-4 right-4 p-2 rounded-full transition z-20 ${isOpen ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'hidden'}`}
      >
        <X size={24} />
      </button>
  );

  // Empty State
  if (queue.length === 0) {
    return (
      <div className={containerClass}>
        <MobileCloseBtn />
        <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white font-bold text-lg mt-8 lg:mt-0">
                <ListX size={20} />
                <span>待播清单</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Music size={32} />
                </div>
                <p className="text-sm">清单是空的</p>
                <p className="text-xs">点击歌曲卡片上的 <span className="inline-block bg-indigo-100 dark:bg-indigo-900 px-1 rounded text-indigo-600">+</span> 加入</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <MobileCloseBtn />
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 space-y-4 pt-12 lg:pt-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                <Music size={20} className="text-indigo-500" />
                <span>待播清单</span>
                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full">{queue.length}</span>
            </div>
            
            <div className="flex items-center gap-1 pr-10 lg:pr-0">
                {/* Shuffle Toggle */}
                <button 
                    onClick={toggleShuffle} 
                    className={`p-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700 ${isShuffle ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400'}`}
                    title={isShuffle ? "随机播放：已开启" : "随机播放：已关闭"}
                >
                    <Shuffle size={16} />
                </button>

                {/* Repeat Toggle */}
                <button 
                    onClick={toggleRepeat} 
                    className={`p-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700 ${repeatMode !== 'off' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400'}`}
                    title={getRepeatTooltip()}
                >
                    {repeatMode === 'one' ? <Repeat1 size={16} /> : repeatMode === 'one_custom' ? <div className="relative"><Repeat1 size={16} /><span className="absolute -top-1 -right-1 text-[8px] font-bold">2</span></div> : <Repeat size={16} />}
                </button>

                {/* Clear Queue */}
                <button 
                    onClick={clearQueue}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="清空列表"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
        
        <button 
            onClick={handlePlayAll}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
            <PlayCircle size={16} /> 播放全部
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 pb-24 lg:pb-3">
        {queue.map((song, index) => {
          const isActive = index === currentIndex;
          return (
            <div 
                key={`${song.id}-${index}`} 
                className={`group flex items-center gap-3 p-2 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'}`}
            >
                <div 
                    className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => handlePlay(index, song.id!)}
                >
                    <img src={song.image_url} alt="" className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 bg-black/30 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isActive ? (
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        ) : (
                            <Play size={16} className="text-white fill-white" />
                        )}
                    </div>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 
                        className={`text-sm font-bold truncate cursor-pointer hover:text-indigo-600 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}
                        onClick={() => handlePlay(index, song.id!)}
                    >
                        {song.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{song.artist}</p>
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(song.id!); }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-white dark:hover:bg-gray-600 rounded-full transition opacity-100 lg:opacity-0 group-hover:opacity-100"
                    title="移除"
                >
                    <Trash2 size={14} />
                </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlaylistSidebar;
