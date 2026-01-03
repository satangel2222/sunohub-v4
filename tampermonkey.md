// ==UserScript==
// @name         SunoHub 导出助手 (终极混合版 V2.9)
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  完美解决 Untitled 问题，详情页使用 DOM 抓取歌词，列表页抓取元数据。
// @author       SunoHub
// @match        https://suno.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    const btn = document.createElement('button');
    btn.innerHTML = '📤 导出歌单 JSON (V2.9)';
    btn.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;padding:12px 24px;background-color:#F59E0B;color:white;border:none;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.3);transition:all 0.3s;';
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);

    // 辅助：查找歌词元素
    const findLyricsInDOM = () => {
        // 策略1：寻找包含 "[Verse" 或 "[Chorus" 的可见文本块
        const candidates = Array.from(document.querySelectorAll('div, p, span'));
        for (const el of candidates) {
            if (el.children.length > 0) continue; // 只看叶子节点或文本节点容器
            const text = el.innerText;
            if (text.length > 50 && (text.includes('[Verse') || text.includes('[Chorus') || text.includes('[Intro'))) {
                // 向上找父容器，直到包含完整歌词
                let p = el.parentElement;
                while(p && p.innerText.length < text.length + 50 && p.tagName !== 'MAIN') {
                    p = p.parentElement;
                }
                return p ? p.innerText : text;
            }
        }
        // 策略2：寻找由于很长且有换行的 div
        // (Suno 歌词通常在一个独立的 div 里)
        return '';
    };

    btn.onclick = async () => {
        btn.innerHTML = '🕵️‍♂️ 正在解析...';
        btn.disabled = true;

        const songs = [];
        const uniqueIds = new Set();
        const seenTitles = new Set();

        const addSong = (id, domTitle, domArtist, lyrics = '') => {
            if (uniqueIds.has(id)) return;
            
            const cleanTitle = domTitle || 'Untitled';
            const cleanArtist = domArtist.replace(/^@/, '').replace(/v\d+(\.\d+)?/gi, '').trim() || 'Suno AI';

            songs.push({
                suno_id: id,
                title: cleanTitle,
                artist: cleanArtist,
                image_url: `https://cdn2.suno.ai/image_${id}.jpeg`,
                audio_url: `https://cdn1.suno.ai/${id}.mp3`,
                url: `https://suno.com/song/${id}`,
                lyrics: lyrics,
                duration: undefined
            });
            uniqueIds.add(id);
        };

        // 1. 详情页模式 (最精准)
        if (window.location.pathname.includes('/song/')) {
            const currentId = window.location.pathname.split('/').pop();
            const h1 = document.querySelector('h1');
            const title = h1 ? h1.innerText.replace('歌名：', '').trim() : document.title;
            const artistEl = document.querySelector('a[href*="/@"]');
            const artist = artistEl ? artistEl.innerText.trim() : 'Suno AI';
            
            // 抓取歌词
            const lyrics = findLyricsInDOM();
            
            addSong(currentId, title, artist, lyrics);
        }

        // 2. 列表页模式 (元数据为主)
        const songLinks = Array.from(document.querySelectorAll('a[href*="/song/"]'));
        songLinks.forEach(a => {
            const href = a.getAttribute('href');
            const match = href.match(/([a-f0-9-]{36})/);
            if (!match) return;
            
            const id = match[1];
            const text = a.innerText.trim();
            // 过滤无效链接
            if (!text || text.match(/^\d+:\d+$/)) return;
            
            const title = text.split('\n')[0];
            
            // 简单去重：如果列表里多次出现同一首歌的链接，只取第一次
            if (uniqueIds.has(id)) return;

            // 寻找作者
            let artist = 'Suno AI';
            try {
                let p = a.parentElement;
                for(let i=0; i<5; i++) {
                    if(!p) break;
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
            alert('⚠️ 未识别到歌曲，请确保页面已加载完毕。');
        } else {
            const json = JSON.stringify(songs, null, 2);
            await navigator.clipboard.writeText(json);
            
            const hasLyricsCount = songs.filter(s => !!s.lyrics).length;
            const msg = window.location.pathname.includes('/song/') ? 
                `✅ V2.9 单曲解析成功！\n\n标题: ${songs[0].title}\n歌词: ${hasLyricsCount ? '已获取' : '无'}` :
                `✅ V2.9 列表抓取成功！\n\n共 ${songs.length} 首\n(列表模式仅抓取元数据，需进入详情页抓取歌词)`;

            alert(msg + '\n\nJSON 已复制 💾');
        }
        
        btn.innerHTML = '📤 导出歌单 JSON (V2.9)';
        btn.disabled = false;
    };
})();