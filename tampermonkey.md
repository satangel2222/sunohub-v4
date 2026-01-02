// ==UserScript==
// @name         SunoHub 导出助手 (精准定位版 V2.4)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  解决详情页作者抓取失败问题，支持 Suno 最新 DOM 结构。
// @author       SunoHub
// @match        https://suno.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    const btn = document.createElement('button');
    btn.innerHTML = '📤 导出歌单 JSON (V2.4)';
    btn.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;padding:12px 24px;background-color:#667eea;color:white;border:none;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.innerHTML = '⏳ 深度扫描中...';
        btn.disabled = true;

        const isDetailPage = window.location.pathname.includes('/song/');
        const songs = [];
        const uniqueIds = new Set();

        // 1. 如果是在详情页，先抓取当前这首歌
        if (isDetailPage) {
            const songId = window.location.pathname.split('/').pop();
            // 查找大标题 (h1)
            const h1 = document.querySelector('h1');
            const title = h1 ? h1.innerText.replace('歌名：', '').trim() : document.title.split('|')[0].trim();
            
            // 查找作者 (精确匹配 /@)
            const artistEl = document.querySelector('a[href*="/@"]');
            const artist = artistEl ? artistEl.innerText.trim() : 'Suno AI';
            
            songs.push({
                suno_id: songId,
                title: title,
                artist: artist.startsWith('@') ? artist.substring(1) : artist,
                image_url: `https://cdn1.suno.ai/image_${songId}.png`,
                audio_url: `https://cdn1.suno.ai/${songId}.mp3`,
                url: window.location.href
            });
            uniqueIds.add(songId);
            console.log(`[SunoHub] 详情页识别: ${title} by ${artist}`);
        }

        // 2. 继续扫描页面中其他的歌曲链接 (列表模式)
        const songLinks = Array.from(document.querySelectorAll('a[href*="/song/"]'));
        songLinks.forEach(a => {
            const href = a.getAttribute('href');
            const match = href.match(/([a-f0-9\-]{36})/);
            if (match) {
                const id = match[1];
                if (uniqueIds.has(id)) return;
                uniqueIds.add(id);

                let artist = 'Suno AI';
                // 搜索逻辑：在当前链接的上下文中寻找第一个出现的作者链接
                let container = a.parentElement;
                for (let i = 0; i < 8; i++) {
                    if (!container || container === document.body) break;
                    const found = container.querySelector('a[href*="/@"]');
                    if (found && found.innerText.trim()) {
                        artist = found.innerText.trim();
                        break;
                    }
                    container = container.parentElement;
                }

                if (artist.startsWith('@')) artist = artist.substring(1);
                const title = a.innerText.trim().split('\n')[0] || 'Untitled';

                songs.push({
                    suno_id: id,
                    title: title,
                    artist: artist,
                    image_url: `https://cdn1.suno.ai/image_${id}.png`,
                    audio_url: `https://cdn1.suno.ai/${id}.mp3`,
                    url: `https://suno.com/song/${id}`
                });
            }
        });

        if (songs.length === 0) {
            alert('未能识别歌曲信息。');
        } else {
            const json = JSON.stringify(songs, null, 2);
            await navigator.clipboard.writeText(json);
            alert(`✅ V2.4 导出成功！\n\n抓取到 ${songs.length} 首歌。\n第一首作者：${songs[0].artist}\n\n已复制，请回 SunoHub 粘贴。`);
        }
        
        btn.innerHTML = '📤 导出歌单 JSON (V2.4)';
        btn.disabled = false;
    };
})();