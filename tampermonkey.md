// ==UserScript==
// @name         SunoHub 导出助手 (全能解析版 V2.6)
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  利用 Hydration 完整还原歌词、精确抓取作者。
// @author       SunoHub
// @match        https://suno.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    const btn = document.createElement('button');
    btn.innerHTML = '📤 导出歌单 JSON (V2.6)';
    btn.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;padding:12px 24px;background-color:#667eea;color:white;border:none;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.3);transition:all 0.3s;';
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);

    // 核心升级：全局构建元数据字典
    // 从 hydration 数据中一次性提取页面上所有歌曲的全部信息（含歌词、作者）
    const buildMetadataMap = () => {
        const map = new Map();
        try {
            if (!window.__next_f) return map;
            
            const processStr = (str) => {
                // 粗略匹配含 id 和 title 的 JSON 片段
                if (!str.includes('"id":') || !str.includes('"title":')) return;
                
                // 正则提取关键字段，比 JSON.parse 更能抗干扰
                // ID
                const idMatch = str.match(/"id":"([a-f0-9-]{36})"/);
                if (!idMatch) return;
                const id = idMatch[1];
                if (map.has(id)) return; // 已存在则跳过

                // Title
                const titleMatch = str.match(/"title":"((?:[^"\\\\]|\\\\.)*)"/);
                // Handle (Author)
                const handleMatch = str.match(/"handle":"([^"]+)"/);
                const nameMatch = str.match(/"display_name":"((?:[^"\\\\]|\\\\.)*)"/);
                // Prompt (Lyrics)
                const promptMatch = str.match(/"prompt":"((?:[^"\\\\]|\\\\.)*)"/);
                
                // Duration
                const durMatch = str.match(/"duration":([0-9.]+)/);

                if (titleMatch) {
                    map.set(id, {
                        suno_id: id,
                        title: titleMatch ? JSON.parse(`"${titleMatch[1]}"`) : 'Untitled',
                        artist: handleMatch ? handleMatch[1] : (nameMatch ? JSON.parse(`"${nameMatch[1]}"`) : 'Suno AI'),
                        prompt: promptMatch ? JSON.parse(`"${promptMatch[1]}"`) : '',
                        duration: durMatch ? parseFloat(durMatch[1]) : undefined
                    });
                }
            };

            for (let i = 0; i < window.__next_f.length; i++) {
                const chunk = window.__next_f[i];
                if (!chunk || !chunk[1]) continue;
                if (typeof chunk[1] === 'string') {
                    processStr(chunk[1]);
                }
            }
        } catch (e) { console.error('Metadata build error:', e); }
        return map;
    };

    btn.onclick = async () => {
        btn.innerHTML = '⏳ 深度扫描中 (全量解析)...';
        btn.disabled = true;
        
        // 1. 构建全局缓存
        const metaMap = buildMetadataMap();
        console.log(`[SunoHub] 从源码中还原了 ${metaMap.size} 首歌的高精度元数据`);

        const songs = [];
        const uniqueIds = new Set();

        const addSong = (id, fallbackTitle, fallbackArtist) => {
            if (uniqueIds.has(id)) return;
            
            // 优先使用缓存的“无损”数据
            const cached = metaMap.get(id);
            const title = cached ? cached.title : fallbackTitle;
            const artist = cached ? cached.artist : fallbackArtist;
            // 过滤版本号和修饰词
            const cleanArtist = artist.replace(/^@/, '').replace(/v\d+(\.\d+)?/gi, '').trim() || 'Suno AI';
            const lyrics = cached ? cached.prompt : '';

            songs.push({
                suno_id: id,
                title: title,
                artist: cleanArtist,
                image_url: `https://cdn2.suno.ai/image_${id}.jpeg`, // 尝试高清
                audio_url: `https://cdn1.suno.ai/${id}.mp3`,
                url: `https://suno.com/song/${id}`,
                lyrics: lyrics,
                duration: cached ? cached.duration : undefined
            });
            uniqueIds.add(id);
        };

        // 2. 如果是详情页，强制加入当前 ID
        const isDetailPage = window.location.pathname.includes('/song/');
        if (isDetailPage) {
            const currentId = window.location.pathname.split('/').pop();
            // 这种情况下，尝试从 DOM 兜底
            const domTitle = document.querySelector('h1')?.innerText.replace('歌名：', '').trim() || document.title;
            const domArtist = document.querySelector('a[href*="/@"]')?.innerText.trim() || 'Suno AI';
            addSong(currentId, domTitle, domArtist);
        }

        // 3. 扫描页面已显示的列表
        const songLinks = Array.from(document.querySelectorAll('a[href*="/song/"]'));
        songLinks.forEach(a => {
            const href = a.getAttribute('href');
            const match = href.match(/([a-f0-9-]{36})/);
            if (match) {
                const id = match[1];
                // DOM 兜底信息
                let domArtist = 'Suno AI';
                // 向上查找作者 (DOM 结构可能变，仅作备用)
                try {
                    let p = a.parentElement;
                    for(let i=0; i<6; i++) {
                        if(!p) break;
                        const userLink = p.querySelector('a[href*="/@"]');
                        if (userLink) { domArtist = userLink.innerText; break; }
                        p = p.parentElement;
                    }
                } catch(e){}
                
                const domTitle = a.innerText.split('\n')[0].trim() || 'Untitled';
                addSong(id, domTitle, domArtist);
            }
        });

        if (songs.length === 0) {
            alert('未识别到歌曲。可能是页面结构彻底改变，请联系开发者。');
        } else {
            const json = JSON.stringify(songs, null, 2);
            await navigator.clipboard.writeText(json);
            
            const first = songs[0];
            const hasLyricsCount = songs.filter(s => !!s.lyrics).length;
            
            alert(`✅ V2.6 导出成功！\n\n共抓取 ${songs.length} 首歌\n含歌词: ${hasLyricsCount} 首\n\n示例: ${first.title} / ${first.artist}\n\nJSON 已复制，请回 SunoHub 粘贴。`);
        }
        
        btn.innerHTML = '📤 导出歌单 JSON (V2.6)';
        btn.disabled = false;
    };
})();