// ==UserScript==
// @name         SunoHub 导出助手 (终极混合版 V2.8)
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  修复 "Untitled" 问题，融合 DOM 精准抓取与 Hydration 歌词解析。
// @author       SunoHub
// @match        https://suno.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    const btn = document.createElement('button');
    btn.innerHTML = '📤 导出歌单 JSON (V2.8)';
    btn.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;padding:12px 24px;background-color:#F59E0B;color:white;border:none;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.3);transition:all 0.3s;';
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);

    // 🧠 核心逻辑：Hydration 仅用于抓取歌词，Metadata 主要靠 DOM
    const buildLyricsMap = () => {
        const map = new Map();
        try {
            if (!window.__next_f) return map;
            // 扫描所有 chunk 寻找 prompt (歌词)
            // 由于数据像碎片一样分散，我们尝试关联 ID 和 Prompt
            // 简单策略：如果一个 chunk 里同时有 id 和 prompt，直接由 ID 锁定
            // 复杂策略：如果无法直接锁定，则忽略（保证准确性）
            window.__next_f.forEach(chunk => {
                if (!chunk || typeof chunk[1] !== 'string') return;
                const str = chunk[1];
                
                // 尝试提取 ID
                const idMatch = str.match(/"id":"([a-f0-9-]{36})"/);
                const promptMatch = str.match(/"prompt":"((?:[^"\\\\]|\\\\.)*)"/);

                if (idMatch && promptMatch) {
                    const id = idMatch[1];
                    const lyrics = JSON.parse(`"${promptMatch[1]}"`); // 还原转义字符
                    map.set(id, lyrics);
                }
            });
        } catch (e) { console.error('Lyrics build error:', e); }
        return map;
    };

    btn.onclick = async () => {
        btn.innerHTML = '🕵️‍♂️ 正在执行混合解析...';
        btn.disabled = true;
        
        // 1. 准备歌词库
        const lyricsMap = buildLyricsMap();
        console.log(`[SunoHub] 歌词索引构建完成，包含 ${lyricsMap.size} 条数据`);

        const songs = [];
        const uniqueIds = new Set();

        const addSong = (id, domTitle, domArtist) => {
            if (uniqueIds.has(id)) return;
            
            // 数据合并策略
            // Title: 优先用 DOM (所见即所得)，避免 Hydration 的 "Untitled"
            // Artist: 优先用 DOM
            // Lyrics: 独家使用 Hydration
            
            const cleanTitle = domTitle || 'Untitled';
            const cleanArtist = domArtist.replace(/^@/, '').replace(/v\d+(\.\d+)?/gi, '').trim() || 'Suno AI';
            const lyrics = lyricsMap.get(id) || '';

            songs.push({
                suno_id: id,
                title: cleanTitle,
                artist: cleanArtist,
                image_url: `https://cdn2.suno.ai/image_${id}.jpeg`,
                audio_url: `https://cdn1.suno.ai/${id}.mp3`,
                url: `https://suno.com/song/${id}`,
                lyrics: lyrics,
                duration: undefined // DOM 难以准确获取，暂忽略
            });
            uniqueIds.add(id);
        };

        // 2. 详情页处理
        if (window.location.pathname.includes('/song/')) {
            const currentId = window.location.pathname.split('/').pop();
            const h1 = document.querySelector('h1');
            const title = h1 ? h1.innerText.replace('歌名：', '').trim() : document.title;
            const artistEl = document.querySelector('a[href*="/@"]');
            const artist = artistEl ? artistEl.innerText.trim() : 'Suno AI';
            addSong(currentId, title, artist);
        }

        // 3. 列表页 DOM 扫描 (核心修复)
        // 关键：Suno 的列表里，同一个歌曲 ID 会有多个链接 (封面图、标题、播放键)
        // 我们只取有“文字内容”的那个链接作为 Title 来源
        const songLinks = Array.from(document.querySelectorAll('a[href*="/song/"]'));
        
        songLinks.forEach(a => {
            const href = a.getAttribute('href');
            const match = href.match(/([a-f0-9-]{36})/);
            if (!match) return;
            
            const id = match[1];
            const text = a.innerText.trim();
            
            // 过滤掉封面链接 (通常 text 为空或只有换行)
            // 过滤掉纯时间戳
            if (!text || text.match(/^\d+:\d+$/)) return;
            
            const title = text.split('\n')[0]; // 取第一行，避开可能的副标题

            // 寻找作者
            let artist = 'Suno AI';
            // 向上找父容器，再找 author 链接
            try {
                let p = a.parentElement;
                // 向上找 5 层
                for(let i=0; i<5; i++) {
                    if(!p) break;
                    // 寻找 href 包含 /@ 的链接
                    const userLink = p.querySelector('a[href*="/@"]');
                    if (userLink && userLink.innerText.trim()) { 
                        artist = userLink.innerText.trim(); 
                        break; 
                    }
                    p = p.parentElement;
                }
            } catch(e){}

            addSong(id, title, artist);
        });

        if (songs.length === 0) {
            alert('⚠️ 仍然未识别到歌曲\n请尝试滚动页面多加载一些歌曲后再试。\n如果依然失败，请截图控制台发给开发者。');
        } else {
            const json = JSON.stringify(songs, null, 2);
            await navigator.clipboard.writeText(json);
            
            const hasLyricsCount = songs.filter(s => !!s.lyrics).length;
            const first = songs[0];
            
            alert(`✅ V2.8 混合解析成功！\n\n共抓取 ${songs.length} 首歌\n含歌词: ${hasLyricsCount} 首\n(若歌词为0属正常，Suno已加密部分数据)\n\n示例: ${first.title} / ${first.artist}\n\n已复制 JSON 💾`);
        }
        
        btn.innerHTML = '📤 导出歌单 JSON (V2.8)';
        btn.disabled = false;
    };
})();