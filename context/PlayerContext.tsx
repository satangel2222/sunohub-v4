
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song } from '../types';
import { getRandomSongId, getAdjacentSongIds } from '../services/realSunoService';

type RepeatMode = 'off' | 'all' | 'one' | 'one_custom'; // one=infinite, one_custom=play twice

interface PlayerContextType {
  queue: Song[];
  currentIndex: number;
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
  playNext: (onNavigate: (id: string) => void, currentSongId?: string) => void;
  playPrev: (onNavigate: (id: string) => void, currentSongId?: string) => void;
  
  // State
  repeatMode: RepeatMode;
  isShuffle: boolean;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  
  // Custom Loop Counter
  playCount: number;
  incrementPlayCount: () => void;
  resetPlayCount: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist Queue in LocalStorage
  const [queue, setQueue] = useState<Song[]>(() => {
    const saved = localStorage.getItem('player_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  
  const [isShuffle, setIsShuffle] = useState(() => localStorage.getItem('player_shuffle') === 'true');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => (localStorage.getItem('player_repeat') as RepeatMode) || 'off');
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('player_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('player_shuffle', String(isShuffle));
  }, [isShuffle]);

  useEffect(() => {
    localStorage.setItem('player_repeat', repeatMode);
  }, [repeatMode]);

  const addToQueue = (song: Song) => {
    // Avoid duplicates based on ID
    if (!queue.find(s => s.id === song.id)) {
      setQueue(prev => [...prev, song]);
    }
  };

  const removeFromQueue = (id: string) => {
    const newQueue = queue.filter(s => s.id !== id);
    setQueue(newQueue);
    // Adjust index if needed
    if (currentIndex >= newQueue.length) {
        setCurrentIndex(newQueue.length - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentIndex(-1);
  };

  const playFromQueue = (index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
    }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one', 'one_custom'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
    setPlayCount(0);
  };

  const incrementPlayCount = () => setPlayCount(p => p + 1);
  const resetPlayCount = () => setPlayCount(0);

  // --- Core Navigation Logic ---
  const playNext = async (onNavigate: (id: string) => void, currentSongId?: string) => {
    // 1. Global Roaming (Queue Empty)
    if (queue.length === 0) {
        if (!currentSongId) return;

        if (isShuffle) {
             const randomId = await getRandomSongId(currentSongId);
             if (randomId) onNavigate(randomId);
        } else {
             // Fetch adjacent songs based on Created Time
             const { nextId, firstId } = await getAdjacentSongIds(currentSongId);
             
             if (nextId) {
                 // Found an older song, play it
                 onNavigate(nextId);
             } else if (firstId) {
                 // Hit the bottom (oldest song), loop back to the TOP (newest song)
                 // This creates the "Infinite" loop effect
                 onNavigate(firstId);
             }
        }
        return;
    }

    // 2. Queue Navigation
    // Handle Repeat One (Infinite)
    if (repeatMode === 'one') {
        if (currentIndex !== -1) {
            // Re-navigate to same song (Player component handles replay)
            if (queue[currentIndex].id) onNavigate(queue[currentIndex].id!);
            return;
        }
    }

    // Handle Repeat One Custom (Play Twice)
    if (repeatMode === 'one_custom') {
        if (playCount < 1) {
            incrementPlayCount();
            if (currentIndex !== -1) {
                if (queue[currentIndex].id) onNavigate(queue[currentIndex].id!);
                return;
            }
        } else {
            resetPlayCount();
            // Proceed to next song
        }
    }

    let nextIndex = -1;

    if (isShuffle) {
        // Simple random for now
        nextIndex = Math.floor(Math.random() * queue.length);
        // Avoid repeating same song if possible
        if (queue.length > 1 && nextIndex === currentIndex) {
            nextIndex = (nextIndex + 1) % queue.length;
        }
    } else {
        // Sequential
        if (currentIndex < queue.length - 1) {
            nextIndex = currentIndex + 1;
        } else {
            // End of list
            if (repeatMode === 'all') {
                nextIndex = 0; // Loop back
            } else {
                return; // Stop
            }
        }
    }

    if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
        if (queue[nextIndex].id) onNavigate(queue[nextIndex].id!); 
    }
  };

  const playPrev = async (onNavigate: (id: string) => void, currentSongId?: string) => {
    // 1. Global Roaming (Queue Empty)
    if (queue.length === 0) {
        if (currentSongId) {
            // Fetch adjacent songs
            const { prevId, lastId } = await getAdjacentSongIds(currentSongId);
            
            if (prevId) {
                // Found a newer song, play it
                onNavigate(prevId);
            } else if (lastId) {
                // Hit the top (newest song), loop back to the BOTTOM (oldest song)
                // This creates the "Infinite" loop effect in reverse
                onNavigate(lastId);
            }
        }
        return;
    }

    // 2. Queue Navigation
    if (queue.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = queue.length - 1; // Loop back to end of queue
    }
    
    setCurrentIndex(prevIndex);
    if (queue[prevIndex].id) onNavigate(queue[prevIndex].id!);
  };

  return (
    <PlayerContext.Provider value={{
      queue, currentIndex, addToQueue, removeFromQueue, clearQueue, playFromQueue,
      playNext, playPrev,
      repeatMode, isShuffle, toggleRepeat, toggleShuffle,
      playCount, incrementPlayCount, resetPlayCount
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
