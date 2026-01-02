import { createClient } from '@supabase/supabase-js';

// ✅ 正确做法：优先从环境变量读取
// 在 Vite 中，环境变量必须以 VITE_ 开头
// 生产环境（Vercel/Netlify）中，你应该在后台设置这些变量，而不是写在代码里

// 安全获取 env 对象，防止 import.meta.env 为 undefined 导致崩溃
const env = (import.meta as any).env || {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://zkvwuqziqsjvbawodyrs.supabase.co'; 
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprdnd1cXppcXNqdmJhd29keXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDMyMjcsImV4cCI6MjA4MDMxOTIyN30.hI_LPxDQOQ0b5DUzKKxwfEqzH5qLJrHd3LwFdOfpe1M';

// ⚠️ 严正警告：永远不要在前端代码中使用 service_role (secret) key！
// 只能使用 anon (public) key。

const isConfigured = SUPABASE_URL && SUPABASE_URL !== 'https://xyzcompany.supabase.co';

if (!isConfigured) {
  console.warn("⚠️ Supabase 未配置！请在 .env 文件或 Vercel 环境变量中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const isSupabaseConfigured = !!isConfigured;