// ==UserScript==
// @name         Tunora 导出助手 (极速版 V3.1)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  利用 Tunora 强大的云端解析引擎。本脚本只负责提取链接，准确率 100%。
// @author       Tunora
// @match        https://suno.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    const btn = document.createElement('button');
    btn.innerHTML = '⚡ 批量复制链接 (V3.1)';
    btn.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;padding:12px 24px;background-color:#6366f1;color:white;border:none;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(99, 102, 241, 0.4);transition:all 0.3s;';
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.innerHTML = '🔄 正在扫描...';
        btn.disabled = true;

        const uniqueUrls = new Set();

        // 1. 详情页模式
        if (window.location.pathname.includes('/song/')) {
           uniqueUrls.add(window.location.href);
        }

        // 2. 列表页模式 - 扫描所有可能的链接
        const songLinks = Array.from(document.querySelectorAll('a[href*="/song/"]'));
        songLinks.forEach(a => {
            const href = a.href;
            if (href.match(/\/song\/[a-f0-9-]{36}/)) {
                uniqueUrls.add(href);
            }
        });

        const urls = Array.from(uniqueUrls);

        if (urls.length === 0) {
            alert('⚠️ 未扫描到链接，请滚动页面加载更多。');
        } else {
            // 直接复制纯文本链接，一行一个
            const text = urls.join('\n');
            await navigator.clipboard.writeText(text);
            alert(`✅ 成功提取 ${urls.length} 个链接！\n\n已自动复制。请去 Tunora 点击 "批量文本" 粘贴即可。\n(Tunora 会自动解析标题和封面，比脚本抓的更准)`);
        }
        
        btn.innerHTML = '⚡ 批量复制链接 (V3.1)';
        btn.disabled = false;
    };
})();