
import { supabase } from '../lib/supabaseClient';
import { Song, Review, DeletedSong } from '../types';

const ADMIN_EMAIL = '774frank1@gmail.com';

/**
 * 辅助：深度解码 HTML
 */
const decodeHtml = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

/**
 * 清洗作者名：移除 Emoji 并处理 Suno 默认后缀
 */
const cleanArtistName = (name: string): string => {
    if (!name || name === 'Suno' || name === 'Suno AI') return 'Suno AI';
    return name
        .replace(/[🦁🎸🎤🎹✨🔥🌟🌈💎]/g, '')
        .replace(/^@|^by\s+/i, '')
        .replace(/\s*\|\s*Suno$/i, '')
        .trim() || 'Suno AI';
};

/**
 * 核心：从各种字符串中榨取出 36 位 UUID (只保留符合 Suno 特征的)
 */
const extractUUID = (text: string): string | null => {
    // 优先匹配包含 suno 关键词附近的 UUID
    const sunoMatch = text.match(/(?:song|suno\.ai|image|audio)[^a-z0-9]*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (sunoMatch) return sunoMatch[1];

    // 兜底正则
    const generalMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    return generalMatch ? generalMatch[0] : null;
};

const normalizeLyrics = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    let text = raw;
    const jsonMarkers = ['","type":"gen"', '"]})self.__next_f.push'];
    for (const m of jsonMarkers) {
        const idx = text.indexOf(m);
        if (idx !== -1) text = text.slice(0, idx);
    }
    text = text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    return text.trim() || undefined;
};

export type SortFilter = 'latest' | 'trending' | 'top_rated' | 'mine';

export const getSongFeed = async (filter: SortFilter = 'latest', artistQuery?: string, userId?: string): Promise<Song[]> => {
    let query = supabase.from('songs').select('*');

    // 🔥 过滤已删除的歌曲
    query = query.is('deleted_at', null);

    if (filter === 'mine' && userId) {
        query = query.eq('user_id', userId);
    } else if (artistQuery) {
        query = query.ilike('artist', `%${artistQuery}%`);
    }

    if (filter === 'latest' || filter === 'mine') {
        query = query.order('created_at', { ascending: false });
    } else if (filter === 'trending') {
        query = query.order('plays_count', { ascending: false });
    } else if (filter === 'top_rated') {
        query = query.order('average_rating', { ascending: false });
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message || "获取列表失败");
    return data || [];
};

export const getSongById = async (id: string): Promise<Song | null> => {
    const { data, error } = await supabase.from('songs').select('*').eq('id', id).single();
    if (error) return null;
    return data;
};

export const incrementPlays = async (id: string) => {
    const { data: song, error: fetchError } = await supabase.from('songs').select('plays_count').eq('id', id).single();
    if (song && !fetchError) {
        await supabase.from('songs').update({ plays_count: (song.plays_count || 0) + 1 }).eq('id', id);
    }
};

// 软删除单个歌曲
export const deleteSong = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");

    const { error, count } = await supabase
        .from('songs')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id', { count: 'exact' });

    if (error) throw new Error(error.message || "删除失败");
    if (count === 0) throw new Error("删除失败：权限不足或歌曲不存在");
};

// 批量软删除
export const deleteSongs = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");

    const { error, count } = await supabase
        .from('songs')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
        })
        .in('id', ids)
        .is('deleted_at', null)
        .select('id', { count: 'exact' });

    if (error) throw new Error(error.message || "批量删除失败");
    if (count === 0) throw new Error("操作无效：没有歌曲被删除");
};

// 获取删除历史
export const getDeletedSongs = async (): Promise<DeletedSong[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");

    const isAdmin = user.email === ADMIN_EMAIL;

    let query = supabase
        .from('deleted_songs_view')
        .select('*')
        .order('deleted_at', { ascending: false });

    // 非管理员只能看到自己删除的
    if (!isAdmin) {
        query = query.eq('deleted_by', user.id);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message || "获取删除历史失败");
    return data || [];
};

// 恢复已删除歌曲
export const restoreSong = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");

    const { error } = await supabase
        .from('songs')
        .update({
            deleted_at: null,
            deleted_by: null
        })
        .eq('id', id)
        .not('deleted_at', 'is', null);

    if (error) throw new Error(error.message || "恢复失败");
};

// 永久删除 (仅管理员)
export const permanentlyDeleteSong = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error("权限不足：仅管理员可永久删除");
    }

    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message || "永久删除失败");
};

const fetchWithTimeout = async (url: string, timeout = 15000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

const fetchHtml = async (url: string): Promise<string> => {
    const targetUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
    const proxies = [
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];
    for (const proxyGen of proxies) {
        try {
            const res = await fetchWithTimeout(proxyGen(targetUrl), 10000);
            if (res.ok) return await res.text();
        } catch { }
    }
    throw new Error("抓取超时。如果频繁失败，请使用右侧的 'Suno 导入' 模式。");
};

const backupToCloud = async (url: string, fileName: string, bucket: string = 'suno-media'): Promise<string> => {
    // 重试机制
    for (let i = 0; i < 3; i++) {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            // 增加超时时间到 30s
            const response = await fetchWithTimeout(proxyUrl, 30000);

            if (!response.ok) throw new Error(`Proxy error: ${response.status}`);

            const blob = await response.blob();

            // 校验：如果并不是真正的媒体文件（比如是 404 HTML 或极小的错误响应）
            if (blob.size < 1000) throw new Error("File too small, possibly invalid");

            const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
                contentType: blob.type,
                upsert: true
            });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
            return publicUrl;
        } catch (e) {
            console.warn(`Upload attempt ${i + 1} failed for ${fileName}:`, e);
            if (i === 2) return url; // 最后一次失败则回退到原始链接
            // 等待一秒再重试
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return url;
};

export const parseSunoLink = async (url: string): Promise<Song> => {
    let rawHtml = await fetchHtml(url);
    rawHtml = decodeHtml(rawHtml);

    // 1. 深度定位 ID (优先从源码链接特征中查找)
    let sunoId = extractUUID(url);
    if (!sunoId) {
        // 从 Canonical 或 OG URL 查找真实 UUID
        const urlMatches = rawHtml.match(/<link rel="canonical" href="([^"]+)"|<meta property="og:url" content="([^"]+)"/gi);
        if (urlMatches) {
            for (const match of urlMatches) {
                const id = extractUUID(match);
                if (id) { sunoId = id; break; }
            }
        }
    }
    // 暴力扫描作为最后手段
    if (!sunoId) sunoId = extractUUID(rawHtml);
    if (!sunoId) throw new Error("无法定位歌曲 ID。请尝试使用详情页长链接。");

    let finalArtist = 'Suno AI';
    let finalTitle = 'Suno Song';
    let imageUrl = `https://cdn1.suno.ai/image_${sunoId}.png`;
    let lyrics = '';

    // 2. 抓取元数据 (双轨制：Meta 标签 + JSON-LD)

    // A. Meta 标签策略 (最稳，不容易被混淆)
    const ogTitleMatch = rawHtml.match(/<meta property="og:title" content="([^"]+)"/i);
    if (ogTitleMatch) {
        const parts = ogTitleMatch[1].split(' by ');
        finalTitle = parts[0].replace(/歌名：/g, '').trim();
        if (parts[1]) finalArtist = parts[1].trim();
    }

    const ogImageMatch = rawHtml.match(/<meta property="og:image" content="([^"]+)"/i);
    if (ogImageMatch) imageUrl = ogImageMatch[1];

    const ogDescMatch = rawHtml.match(/<meta property="og:description" content="([^"]+)"/i);
    if (ogDescMatch && !lyrics) lyrics = normalizeLyrics(ogDescMatch[1]) || '';

    // B. JSON-LD 策略
    try {
        const ldMatch = rawHtml.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
        if (ldMatch) {
            for (const script of ldMatch) {
                const content = script.replace(/<script.*?>|<\/script>/g, '');
                const json = JSON.parse(content);
                if (json['@type'] === 'MusicRecording') {
                    finalTitle = json.name || finalTitle;
                    if (json.byArtist) {
                        const artist = Array.isArray(json.byArtist) ? json.byArtist[0].name : json.byArtist.name;
                        if (artist) finalArtist = artist;
                    }
                }
            }
        }
    } catch (e) { }

    // C. 句柄识别 (@handle)
    if (finalArtist === 'Suno AI' || !finalArtist) {
        const handleMatch = rawHtml.match(/<a[^>]+href="\/@([^"]+)"[^>]*>(.*?)<\/a>/i);
        if (handleMatch) finalArtist = handleMatch[2].trim();
    }

    // D. App Router Hydration (Robust Heuristic for SPLIT Chunks)
    try {
        // 1. 提取所有 Hydration 文本片段
        const chunks: string[] = [];
        const hydrationMatches = rawHtml.matchAll(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs);
        for (const match of hydrationMatches) {
            let raw = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            chunks.push(raw);
        }

        // 2. 尝试从 Title/Metadata Chunk 提取核心信息
        // (Suno 现在把 ID 和 Metadata 拆分了，所以我们分别查找)
        for (const chunk of chunks) {
            // 找标题/作者 (通常在一个 Metadata 对象里)
            const titleMatch = chunk.match(/"title":"((?:[^"\\\\]|\\\\.)*)"/);
            const handleMatch = chunk.match(/"handle":"([^"]+)"/);

            // 只有当这个 chunk 看起来像是 Metadata 时才采信
            if (titleMatch && chunk.includes('"is_public":')) {
                finalTitle = JSON.parse(`"${titleMatch[1]}"`);
                if (handleMatch) finalArtist = handleMatch[1];
            }
        }

        // 3. 启发式歌词查找 (Lyrics Heuristic)
        // 歌词现在通常作为纯文本存在于某个独立的 chunk 中
        // 特征：包含 [Verse], [Chorus] 或长度较大且有多行
        let bestLyrics = '';
        let maxScore = 0;

        for (const chunk of chunks) {
            // 忽略太短的
            if (chunk.length < 50) continue;
            // 忽略 JSON 结构密集的 (可能是配置信息)
            if (chunk.includes('{"') && chunk.length < 500) continue;

            let score = 0;
            // 强特征
            if (chunk.includes('[Verse')) score += 10;
            if (chunk.includes('[Chorus')) score += 10;
            if (chunk.includes('[Intro')) score += 10;
            if (chunk.includes('[Outro')) score += 10;
            if (chunk.includes('[Instrumental')) score += 10;

            // 弱特征
            const newlineCount = (chunk.match(/\\n/g) || []).length;
            if (newlineCount > 4) score += 5;

            // 如果 chunk 本身就是个被引号包围的 JSON 字符串值，去掉引号
            let cleanText = chunk;
            if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
                cleanText = cleanText.slice(1, -1);
            }
            cleanText = cleanText.replace(/\\n/g, '\n');

            // 过滤掉代码或 JS 或 React Hydration
            const badKeywords = [
                'function', 'return', '__next', '$Sreact',
                'react.fragment', 'react.element',
                'self.__next', 'webpack', 'module.exports'
            ];

            if (badKeywords.some(kw => cleanText.toLowerCase().includes(kw))) {
                score -= 100;
            }

            // 针对用户反馈的 `1:"$Sreact.fragment"` 以及 `b:T` 这种格式进行强力过滤
            // Next.js RSC payload 格式通常为 `ID:Type` 或 `ID:JSON`
            // 我们过滤掉所有 `字母/数字 + 冒号 + 字母/引号/[` 开头的行
            if (/^[a-zA-Z0-9]+:[a-zA-Z"\[]/.test(cleanText)) {
                score -= 100;
            }

            if (score > maxScore) {
                maxScore = score;
                bestLyrics = cleanText;
            }
        }

        if (maxScore > 0 && bestLyrics) {
            // 最后再做一次清洗，防止头部残留
            lyrics = bestLyrics.trim();
        }

    } catch (e) { console.warn("Hydration heuristic parse warning:", e); }

    // E. __NEXT_DATA__ (Legacy Pages Router)
    try {
        const jsonMatch = rawHtml.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (jsonMatch) {
            const nextData = JSON.parse(jsonMatch[1]);
            const clip = nextData.props?.pageProps?.clip || nextData.props?.pageProps?.song || nextData.props?.pageProps?.initialState?.songDetail?.song;
            if (clip) {
                finalTitle = clip.title || finalTitle;
                finalArtist = clip.display_name || clip.user?.display_name || finalArtist;
                lyrics = normalizeLyrics(clip.metadata?.prompt) || lyrics;
            }
        }
    } catch (e) { }

    return {
        suno_id: sunoId,
        title: finalTitle.replace(/\| Suno/i, '').trim(),
        artist: cleanArtistName(finalArtist),
        image_url: imageUrl,
        audio_url: `https://cdn1.suno.ai/${sunoId}.mp3`,
        duration: 0,
        tags: [],
        lyrics: lyrics,
        category: 'Pop'
    };
};

export const publishSongToCloud = async (song: Song, onProgress?: (status: string) => void): Promise<Song | null> => {
    const { data: existing } = await supabase.from('songs').select('*').eq('suno_id', song.suno_id).maybeSingle();
    if (existing) return existing;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");

    if (onProgress) onProgress('同步媒体资源...');
    const [cloudAudio, cloudImage] = await Promise.all([
        backupToCloud(song.audio_url, `${song.suno_id}.mp3`),
        backupToCloud(song.image_url, `image_${song.suno_id}.png`)
    ]);

    const { data, error } = await supabase.from('songs').insert({
        suno_id: song.suno_id,
        title: song.title,
        artist: song.artist,
        image_url: cloudImage,
        audio_url: cloudAudio,
        duration: song.duration,
        tags: song.tags,
        category: song.category,
        lyrics: song.lyrics,
        user_id: user.id
    }).select().single();

    if (error) throw new Error(error.message);
    return data;
};

export const getReviews = async (songId: string) => {
    const { data, error } = await supabase.from('reviews').select('*').eq('song_id', songId).order('created_at', { ascending: false });
    return data || [];
};
export const submitReview = async (song_id: string, rating: number, comment?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");
    await supabase.from('reviews').upsert({ song_id, user_id: user.id, user_email: user.email, rating, comment });
};
export const deleteReview = async (id: string) => { await supabase.from('reviews').delete().eq('id', id); };
export const updateSongLyrics = async (id: string, lyrics: string) => { await supabase.from('songs').update({ lyrics }).eq('id', id); };
export const bulkUpdateArtistName = async (target: string, replacement: string) => {
    const { data, error } = await supabase.from('songs').update({ artist: replacement }).eq('artist', target).select('*');
    if (error) throw new Error(error.message);
    return data?.length || 0;
};
export const getRandomSongId = async (excludeId?: string) => {
    let query = supabase.from('songs').select('id');
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.limit(50);
    return data ? data[Math.floor(Math.random() * data.length)]?.id : null;
};
export const getAdjacentSongIds = async (id: string) => {
    const { data: song } = await supabase.from('songs').select('created_at').eq('id', id).single();
    if (!song) return { nextId: null, prevId: null, firstId: null, lastId: null };
    const [n, p, f, l] = await Promise.all([
        supabase.from('songs').select('id').lt('created_at', song.created_at).order('created_at', { ascending: false }).limit(1),
        supabase.from('songs').select('id').gt('created_at', song.created_at).order('created_at', { ascending: true }).limit(1),
        supabase.from('songs').select('id').order('created_at', { ascending: false }).limit(1),
        supabase.from('songs').select('id').order('created_at', { ascending: true }).limit(1),
    ]);
    return { nextId: n.data?.[0]?.id, prevId: p.data?.[0]?.id, firstId: f.data?.[0]?.id, lastId: l.data?.[0]?.id };
};
