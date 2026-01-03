
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CloudUpload, Search, Music, ArrowRight, Loader2, Link as LinkIcon, CheckCircle2, List, Layers, XCircle, AlertCircle, Code, Copy, Check, FileText, Wand2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { parseSunoLink, publishSongToCloud } from '../services/realSunoService';
import { Song } from '../types';
import { supabase } from '../lib/supabaseClient';

// 批量项状态接口
interface BatchItem {
  id: string;
  originalUrl: string;
  status: 'idle' | 'analyzing' | 'ready' | 'publishing' | 'completed' | 'error';
  songData?: Song;
  message?: string;
  progress?: string;
}

const TAMPERMONKEY_SCRIPT = `// ==UserScript==
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
                image_url: \`https://cdn2.suno.ai/image_\${id}.jpeg\`,
                audio_url: \`https://cdn1.suno.ai/\${id}.mp3\`,
                url: \`https://suno.com/song/\${id}\`,
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
            if (!text || text.match(/^\\d+:\\d+$/)) return;
            
            const title = text.split('\\n')[0];
            
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
                \`✅ V2.9 单曲解析成功！\\n\\n标题: \${songs[0].title}\\n歌词: \${hasLyricsCount ? '已获取' : '无'}\` :
                \`✅ V2.9 列表抓取成功！\\n\\n共 \${songs.length} 首\\n(列表模式仅抓取元数据，需进入详情页抓取歌词)\`;

            alert(msg + '\\n\\nJSON 已复制 💾');
        }
        
        btn.innerHTML = '📤 导出歌单 JSON (V2.9)';
        btn.disabled = false;
    };
})();`;;

const Publish: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mode, setMode] = useState<'single' | 'batch' | 'json'>('single');

  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string>('');
  const [parsedSong, setParsedSong] = useState<Song | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batchText, setBatchText] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    const paramUrl = searchParams.get('url');
    if (paramUrl && !parsedSong && !isAnalyzing) {
      setUrl(paramUrl);
      handleAnalyze(paramUrl);
    }
  }, [searchParams]);

  const stringifyError = (e: any): string => {
    if (!e) return "未知错误";
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    return "网络连接异常，请重试";
  };

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToAnalyze = targetUrl || url;
    if (!urlToAnalyze) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const song = await parseSunoLink(urlToAnalyze);
      if ((song.artist === 'Suno AI' || !song.artist) && user?.user_metadata?.nickname) {
        song.artist = user.user_metadata.nickname;
      }
      setParsedSong(song);
    } catch (e: any) {
      setError(stringifyError(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setMyArtist = () => {
    if (parsedSong && user?.user_metadata?.nickname) {
      setParsedSong({ ...parsedSong, artist: user.user_metadata.nickname });
    }
  };

  const handlePublish = async () => {
    if (!parsedSong) return;
    if (!user) { navigate('/login'); return; }
    setIsPublishing(true);
    setPublishStatus('准备备份数据...');
    try {
      const savedSong = await publishSongToCloud(parsedSong, (status) => setPublishStatus(status));
      if (savedSong) navigate(`/ song / ${savedSong.id} `);
    } catch (e: any) {
      setError("发布失败：" + stringifyError(e));
      setIsPublishing(false);
    }
  };

  const handleExtractLinks = () => {
    if (!batchText.trim()) return;
    const regex = /(?:https?:\/\/)?(?:www\.)?suno\.com\/(?:song\/[a-f0-9\-]{36}|s\/[a-zA-Z0-9]+)/gi;
    const uniqueUrls = Array.from(new Set(batchText.match(regex) || [])) as string[];
    if (uniqueUrls.length > 0) {
      setBatchItems(uniqueUrls.map(url => ({
        id: Math.random().toString(36).substr(2, 9),
        originalUrl: url.startsWith('http') ? url : `https://${url}`,
        status: 'idle'
      })));
      setBatchText('');
    } else { alert("未检测到有效 Suno 链接"); }
  };

  const handleJsonImport = () => {
    try {
      const data = JSON.parse(batchText);
      if (Array.isArray(data)) {
        const newItems: BatchItem[] = data.map(item => {
          let finalArtist = item.artist;
          if ((!finalArtist || finalArtist === 'Suno AI') && user?.user_metadata?.nickname) {
            finalArtist = user.user_metadata.nickname;
          }
          return {
            id: Math.random().toString(36).substr(2, 9),
            originalUrl: item.url || `https://suno.com/song/${item.suno_id}`,
            status: 'ready' as const,
            songData: {
              suno_id: item.suno_id,
              title: item.title,
              artist: finalArtist || 'Suno AI',
              image_url: item.image_url,
              audio_url: item.audio_url || `https://cdn1.suno.ai/${item.suno_id}.mp3`,
              duration: 180,
              tags: [],
              category: 'Pop'
            },
            message: `就绪: ${item.title}`
          };
        });
        setBatchItems(newItems);
        setBatchText('');
      } else { alert("格式不正确"); }
    } catch (e) { handleExtractLinks(); }
  };

  const handleBatchAnalyze = async () => {
    setIsBatchProcessing(true);
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'ready' || item.status === 'completed') continue;
      setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'analyzing' } : it));
      try {
        const song = await parseSunoLink(item.originalUrl);
        if (song.artist === 'Suno AI' && user?.user_metadata?.nickname) song.artist = user.user_metadata.nickname;
        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'ready', songData: song } : it));
      } catch (e: any) {
        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', message: "抓取失败" } : it));
      }
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    setIsBatchProcessing(false);
  };

  const handleBatchPublish = async () => {
    if (!user) { navigate('/login'); return; }
    const itemsToPublish = batchItems.filter(i => i.status === 'ready');
    if (itemsToPublish.length === 0) return;
    setIsBatchProcessing(true);
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status !== 'ready' || !item.songData) continue;
      setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'publishing' } : it));
      try {
        await publishSongToCloud(item.songData, (status) => {
          setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, progress: status } : it));
        });
        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'completed', message: '发布成功' } : it));
      } catch (e: any) {
        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', message: "发布失败" } : it));
      }
    }
    setIsBatchProcessing(false);
    alert("完成！");
  };

  const removeBatchItem = (id: string) => setBatchItems(prev => prev.filter(i => i.id !== id));
  const copyScript = async () => {
    try { await navigator.clipboard.writeText(TAMPERMONKEY_SCRIPT); setScriptCopied(true); } catch (e) { setScriptCopied(false); }
    setTimeout(() => setScriptCopied(false), 2000);
  };

  if (checkingAuth) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-10 animate-fade-in-up pb-20 px-4">
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex gap-1 shadow-inner overflow-x-auto">
          {(['single', 'batch', 'json'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 sm:px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${mode === m ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'single' ? <Music size={16} /> : m === 'batch' ? <Layers size={16} /> : <Code size={16} />}
              {m === 'single' ? '单曲发布' : m === 'batch' ? '批量文本' : 'Suno 导入'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 mb-4">
            {mode === 'single' ? <CloudUpload size={32} /> : mode === 'batch' ? <List size={32} /> : <Code size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {mode === 'single' ? '发布作品' : mode === 'batch' ? '批量导入' : 'Suno 抓取导入'}
          </h1>
        </div>

        {mode === 'json' && batchItems.length === 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-3 flex items-center gap-2"><AlertCircle size={18} /> 获取油猴脚本</h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-4">在 Suno 官网一键导出歌单代码，抓取率 100%。</p>
            <button onClick={copyScript} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
              {scriptCopied ? <Check size={18} /> : <Copy size={18} />} {scriptCopied ? '已复制！请前往油猴粘贴' : '点击复制导出脚本'}
            </button>
          </div>
        )}

        {mode === 'single' ? (
          !parsedSong ? (
            <div className="space-y-6">
              <div className="relative">
                <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnalyze()} placeholder="粘贴 Suno 歌曲链接..." className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 rounded-xl outline-none focus:border-indigo-400 transition-all dark:text-white" />
                {url && <button onClick={() => setUrl('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>}
              </div>
              {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3"><AlertCircle size={18} /> {error}</div>}
              <button onClick={() => handleAnalyze()} disabled={isAnalyzing || !url} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none">
                {isAnalyzing ? <><Loader2 className="animate-spin" /> 正在深度扫描 Suno 源码...</> : <><Search size={20} /> 解析</>}
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in-up">
              <div className="bg-indigo-50 dark:bg-gray-700 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start relative border border-indigo-100 dark:border-gray-600">
                <div className="relative shrink-0 group">
                  <img src={parsedSong.image_url} alt="" className="w-32 h-32 rounded-xl object-cover shadow-md group-hover:scale-105 transition" />
                  <button onClick={() => setParsedSong(null)} className="absolute -top-2 -left-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md text-gray-400 hover:text-red-500 transition border border-gray-100"><RefreshCcw size={14} /></button>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">歌曲标题</label>
                    <input type="text" value={parsedSong.title} onChange={e => setParsedSong({ ...parsedSong, title: e.target.value })} className="w-full bg-transparent border-b border-indigo-200 dark:border-gray-600 py-1 font-bold text-xl outline-none focus:border-indigo-500 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">演唱/作者</label>
                    <div className="flex items-center gap-2 group">
                      <input type="text" value={parsedSong.artist} onChange={e => setParsedSong({ ...parsedSong, artist: e.target.value })} className={`flex-1 bg-transparent border-b py-1 font-medium outline-none transition-colors border-indigo-200 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 focus:border-indigo-500`} />
                      {user?.user_metadata?.nickname && (
                        <button onClick={setMyArtist} className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition" title="使用我的昵称"><Wand2 size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><FileText size={14} /> 歌词/描述</label>
                <textarea value={parsedSong.lyrics || ''} onChange={e => setParsedSong({ ...parsedSong, lyrics: e.target.value })} className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm font-mono border border-gray-100 dark:border-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 dark:text-gray-200" placeholder="暂无歌词，可在此手动输入或粘贴..." />
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  <p className="font-bold mb-1">免责及版权声明：</p>
                  本站仅提供 Suno 播放和索引服务。点击发布即视为您保证：该作品为您本人创作或已获创作者明确授权。如因侵权产生任何版权纠纷，由发布者本人承担全部法律责任。
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button onClick={() => setParsedSong(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition">取消</button>
                <button onClick={handlePublish} disabled={isPublishing} className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-100 active:scale-95 transition disabled:opacity-80">
                  {isPublishing ? <><Loader2 className="animate-spin" /><span>{publishStatus}</span></> : <><div className="flex items-center gap-2"><ArrowRight size={20} /> 确认并发布作品</div></>}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {batchItems.length === 0 ? (
              <div className="space-y-4">
                <textarea value={batchText} onChange={e => setBatchText(e.target.value)} className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm font-mono outline-none border border-gray-100 dark:border-gray-700 dark:text-gray-200" placeholder={mode === 'json' ? "在此粘贴导出的 JSON 代码..." : "粘贴 Suno 链接，一行一个..."} />
                <button onClick={mode === 'json' ? handleJsonImport : handleExtractLinks} disabled={!batchText.trim()} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">提取并准备导入</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-h-96 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {batchItems.map((item, idx) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-750 p-3 rounded-lg flex items-center gap-3 text-sm border border-gray-100 dark:border-gray-700 group">
                      <span className="text-gray-400 font-mono w-6">{String(idx + 1).padStart(2, '0')}</span>
                      <div className="flex-1 truncate dark:text-gray-300">{item.songData?.title ? `${item.songData.title} - ${item.songData.artist}` : (item.message || item.originalUrl)}</div>
                      <div className="flex items-center gap-2">
                        {item.status === 'ready' && <CheckCircle2 className="text-green-500" size={16} />}
                        {item.status === 'error' && <AlertCircle className="text-red-500" size={16} />}
                        {item.status === 'analyzing' && <Loader2 className="animate-spin text-indigo-500" size={16} />}
                        <button onClick={() => removeBatchItem(item.id)} className="text-gray-400 hover:text-red-500 transition ml-1"><XCircle size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 pt-4 border-t dark:border-gray-700">
                  <button onClick={handleBatchAnalyze} disabled={isBatchProcessing} className="flex-1 py-3 bg-white dark:bg-gray-700 border-2 border-indigo-600 text-indigo-600 dark:text-white font-bold rounded-xl hover:bg-indigo-50 transition">解析数据</button>
                  <button onClick={handleBatchPublish} disabled={isBatchProcessing} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg">批量发布</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Publish;
