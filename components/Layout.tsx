import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { supabase } from '../lib/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // 生成一个临时的会话 ID 用于统计标签页数量
    const sessionId = Math.random().toString(36).substring(2, 15);

    const channel = supabase.channel('global_online_room', {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // 计算唯一的在线会话数
        const count = Object.keys(state).length;
        setOnlineCount(count > 0 ? count : 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isEmbed = window.location.href.includes('embed=true');

  return (
    <div className={`min-h-screen w-full bg-[#f8f9fc] dark:bg-[#030712] text-gray-900 dark:text-gray-100 transition-colors duration-300 ${isEmbed ? '' : 'pb-20'}`}>
      {!isEmbed && <Navbar onlineCount={onlineCount} />}
      {/* 顶部留白给 fixed navbar */}
      <div className={`${isEmbed ? 'p-0' : 'pt-20 px-4 sm:px-6 md:px-8'} max-w-[1440px] mx-auto`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;