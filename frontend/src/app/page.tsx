"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "@/lib/supabase";
import { useTheme } from "./theme-context";

// ─── Constants ──────────────────────────────────────────────────────
const FREE_DOWNLOAD_LIMIT = 3;
const STORAGE_KEY = "cs_download_count";
const HISTORY_KEY = "cs_parse_history";
const MAX_HISTORY = 30;

type ToolMode = "video-download" | "extract-caption" | "extract-audio" | "ocr";

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  mode: ToolMode;
  type: "video" | "images" | "text" | "audio";
  thumbnail?: string;
  platform?: string;
  timestamp: number;
  result: any;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getDownloadCount(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10); }
  catch { return 0; }
}

function incrementDownloadCount() {
  try { localStorage.setItem(STORAGE_KEY, String(getDownloadCount() + 1)); }
  catch {}
}

function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function addHistory(item: HistoryItem) {
  try {
    const list = getHistory().filter(h => h.id !== item.id);
    list.unshift(item);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

function detectPlatform(url: string): string {
  if (url.includes("xiaohongshu") || url.includes("xhslink") || url.includes("rednote")) return "小紅書";
  if (url.includes("youtube") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("douyin") || url.includes("iesdouyin")) return "抖音";
  if (url.includes("tiktok")) return "TikTok";
  if (url.includes("facebook") || url.includes("fb.com") || url.includes("fb.watch")) return "Facebook";
  if (url.includes("bilibili") || url.includes("b23.tv")) return "B站";
  if (url.includes("instagram") || url.includes("ins")) return "Instagram";
  if (url.includes("twitter") || url.includes("x.com")) return "X/Twitter";
  if (url.includes("weibo")) return "微博";
  return "其他";
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Theme Toggle Button ────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={theme === "dark" ? "切換亮色模式" : "切換暗色模式"}
    >
      {theme === "dark" ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function HomePage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<ToolMode>("video-download");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [downloadCount, setDownloadCount] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDownloadCount(getDownloadCount());
    setHistory(getHistory());
    supabase?.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
  }, []);

  const remaining = FREE_DOWNLOAD_LIMIT - downloadCount;
  const isDownloadMode = mode === "video-download" || mode === "extract-audio";

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://link2publish.app";

  const MODES: { id: ToolMode; label: string; icon: string; desc: string }[] = [
    { id: "video-download", label: "影片下載", icon: "🎬", desc: "MP4 下載" },
    { id: "extract-caption", label: "文案提取", icon: "📝", desc: "影片轉文字" },
    { id: "extract-audio", label: "影片轉音頻", icon: "🎵", desc: "提取 MP3" },
    { id: "ocr", label: "圖片文字", icon: "📷", desc: "OCR 辨識" },
  ];

  const endpointMap: Record<ToolMode, string> = {
    "video-download": `${apiBase}/api/v1/tools/video-download`,
    "extract-caption": `${apiBase}/api/v1/tools/extract-caption`,
    "extract-audio": `${apiBase}/api/v1/tools/extract-audio`,
    ocr: `${apiBase}/api/v1/tools/ocr`,
  };

  const handleParse = useCallback(async (parseUrl?: string) => {
    const targetUrl = parseUrl || url;
    if (!targetUrl.trim()) return;

    if (!user && isDownloadMode && remaining <= 0) {
      setError(`免費試用次數已用完（${FREE_DOWNLOAD_LIMIT} 次）。`);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const endpoint = endpointMap[mode];
      const body: Record<string, any> =
        mode === "ocr"
          ? { image_url: targetUrl.trim(), language: "chi_sim+eng" }
          : { url: targetUrl.trim(), language: "zh" };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add Turnstile token for unauthenticated users
      if (!user && turnstileToken) {
        headers["x-turnstile-token"] = turnstileToken;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`伺服器錯誤 (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "處理失敗，請檢查連結是否正確");
      } else {
        setResult(data);

        if (!user && isDownloadMode) {
          incrementDownloadCount();
          setDownloadCount(getDownloadCount());
        }

        const platform = detectPlatform(targetUrl);
        const hitem: HistoryItem = {
          id: targetUrl,
          url: targetUrl,
          title: data.title || "未命名",
          mode,
          type: mode === "video-download" ? "video" : mode === "extract-audio" ? "audio" : "text",
          platform,
          timestamp: Date.now(),
          result: data,
        };
        if (data.images?.length) hitem.thumbnail = data.images[0]?.url;
        if (data.videoUrl) hitem.thumbnail = data.videoUrl;
        addHistory(hitem);
        setHistory(getHistory());

        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
      }
    } catch (e: any) {
      setError(e.message || "網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [url, mode, user, remaining, isDownloadMode, turnstileToken]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {}
  };

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setUrl(item.url);
    setMode(item.mode);
    setResult(item.result);
    setError("");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }, []);

  const isPremium = !!user;
  const needsUpgrade = !isPremium && isDownloadMode && remaining <= 0;

  // ─── Landing page sections data ───────────────────────────────────
  const faqItems = [
    { q: "ContentSync Studio 完全免費嗎？", a: "我們提供免費方案，每月可處理 3 次影片下載或音頻提取。文案提取、OCR 圖片辨識無限制，無需註冊即可使用。Pro 方案 $12/月，無限次數。" },
    { q: "支援哪些影片平臺？", a: "支援 YouTube、TikTok、小紅書、Facebook、抖音、快手、B站、微博、Instagram、Twitter/X 等 50+ 平臺。" },
    { q: "文案識別的準確率如何？", a: "採用 OpenAI Whisper 語音辨識引擎，中文/英文準確率超過 95%。支援中、英、日、韓等多種語言。" },
    { q: "提取文案需要多長時間？", a: "一般 1-5 分鐘內完成，取決於影片長度。短影片（3 分鐘內）通常 30 秒內完成。" },
    { q: "可以商用嗎？有版權問題嗎？", a: "提取自己上傳的影片文案完全沒問題。提取他人影片內容，建議用於學習參考，商用需自行確認版權。" },
    { q: "為什麼有些影片無法提取？", a: "部分私密帳號、付費內容或受版權保護的影片可能無法提取。請確保使用的是公開分享鏈接。" },
    { q: "使用安全嗎？會洩露信息嗎？", a: "我們使用 HTTPS 加密傳輸，不會儲存你的影片內容。提取完成的檔案會在 24 小時後自動刪除。" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ═══ Header ═══ */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 sticky top-0 bg-white/95 dark:bg-gray-900/85 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.1 5.2c0-1.5 1.7-2.4 2.9-1.5l8.2 6.3c1 .8 1 2.3 0 3.1L11 19.4c-1.2.9-2.9 0-2.9-1.5V5.2Z"/>
            </svg>
            <span className="font-bold text-sm">ContentSync Studio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt={user.email}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-medium">
                    {(user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[80px] truncate hidden sm:block">
                  {user.email?.split("@")[0] || "User"}
                </span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1.5">
                  登入
                </Link>
                <Link href="/register" className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                  免費註冊
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ═══ Hero + Tool Panel ═══ */}
        <section className="py-8 md:py-12" style={{background: 'transparent'}}>
          <div className="max-w-4xl mx-auto px-4">
            {/* Hero Text */}
            <div className="text-center mb-4">
              <div className="text-[11px] sm:text-xs md:text-sm uppercase tracking-widest mb-1.5" style={{color: '#d4a017', fontWeight: 800, letterSpacing: '0.15em', textShadow: '0 0 20px rgba(212,160,23,0.5), 0 0 40px rgba(212,160,23,0.3)'}}>✦ 免費線上工具 ✦</div>
              <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold leading-snug" style={{color: 'var(--text)'}}>
                貼上連結，提取影片、文案與圖片
              </h1>
              <span className="text-[11px] sm:text-sm md:text-base" style={{color: 'var(--muted)'}}>50+ 平台免登入</span>
            </div>

            {/* ── Tool Panel ── */}
            <div className="glass-card p-4 md:p-5">
              {/* Step 01 indicator */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider">STEP 01</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">貼上分享內容</span>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {MODES.map((m, idx) => {
                  const colors = [
                    { border: 'rgba(52,211,153,0.4)', glow: 'rgba(52,211,153,0.9)', shadow: 'rgba(52,211,153,0.4)' },
                    { border: 'rgba(96,165,250,0.4)', glow: 'rgba(96,165,250,0.9)', shadow: 'rgba(96,165,250,0.4)' },
                    { border: 'rgba(251,191,36,0.4)', glow: 'rgba(251,191,36,0.9)', shadow: 'rgba(251,191,36,0.4)' },
                    { border: 'rgba(168,85,247,0.4)', glow: 'rgba(168,85,247,0.9)', shadow: 'rgba(168,85,247,0.4)' },
                  ];
                  const c = colors[idx];
                  const isActive = mode === m.id;
                  return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id as ToolMode); setResult(null); setError(""); }}
                    className={`w-full px-2 py-3 rounded-xl text-xs font-medium transition-all duration-200 text-center ${
                      isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}
                    style={isActive ? {
                      background: idx === 0 ? 'linear-gradient(135deg, #059669, #10b981)' :
                                   idx === 1 ? 'linear-gradient(135deg, #3b82f6, #6366f1)' :
                                   idx === 2 ? 'linear-gradient(135deg, #d97706, #f59e0b)' :
                                               'linear-gradient(135deg, #7c3aed, #9333ea)',
                      border: '1.5px solid transparent',
                      boxShadow: `0 0 20px ${c.glow}, 0 0 50px ${c.glow}, 0 0 100px ${c.shadow}, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`
                    } : {
                      background: 'var(--surface)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1.5px solid ${c.border}`,
                      boxShadow: `0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)`
                    }}
                  >
                    <span>{m.icon}</span>
                    <span className="ml-1">{m.label}</span>
                    {m.desc && <span className="ml-1 text-[10px] opacity-70">{m.desc}</span>}
                  </button>
                  );
                })}
              </div>

              {/* Input Row */}
              <div className="flex items-start gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={"張貼影片/圖片\n分享連結"}
                    className="w-full px-5 py-4 bg-blue-50/60 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700/50 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-200/40 dark:focus:ring-blue-700/30 focus:bg-white dark:focus:bg-gray-900/80 resize-none shadow-sm"
                    rows={2}
                    maxLength={4096}
                  />
                  {url && (
                    <button onClick={() => setUrl("")} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
                  )}
                </div>
                <button onClick={handlePaste} className="px-4 py-3 border border-gray-200 dark:border-gray-700/30 rounded-xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shrink-0">
                  粘貼
                </button>
                <button
                  onClick={() => handleParse()}
                  disabled={loading || !url.trim() || (needsUpgrade && isDownloadMode)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shrink-0 shadow-lg shadow-blue-600/30"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      處理中...
                    </span>
                  ) : needsUpgrade ? "已達上限，請註冊" : "開始提取"}
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between mt-3 text-[10px]">
                <span className="text-gray-400 dark:text-gray-500">
                  {url.length > 0 ? `${url.length} / 4096` : "免費使用，無需登入"}
                </span>
                <div className="flex items-center gap-3">
                  {isDownloadMode && !user && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {remaining > 0 ? `剩餘 ${remaining} 次下載` : "次數已用完"}
                    </span>
                  )}
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      showHistory
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                        : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    最近解析 ({history.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Turnstile verification for non-logged-in users */}
            {!user && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center mt-3" style={{minHeight: '0px'}}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                  options={{
                    theme: 'auto',
                  }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="max-w-2xl mx-auto mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v5m0 3h.01M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z"/>
                </svg>
                <div>
                  <strong className="block mb-0.5">解析未完成</strong>
                  <p>{error}</p>
                  {error.includes("已用完") && (
                    <Link href="/register" className="inline-block mt-1 text-blue-600 dark:text-blue-400 underline font-medium">註冊解鎖無限次下載 →</Link>
                  )}
                </div>
              </div>
            )}

            {/* Needs Upgrade */}
            {needsUpgrade && !error && (
              <div className="max-w-2xl mx-auto mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">免費試用次數已用完</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">註冊後可無限次下載，並使用 AI 文案優化功能</p>
                <Link href="/register" className="inline-block mt-3 bg-blue-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-blue-700">
                  免費註冊 →
                </Link>
              </div>
            )}

            {/* Result */}
            {result && (
              <div ref={resultRef} className="max-w-2xl mx-auto mt-6 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider">STEP 02</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">解析結果</span>
                  <span className="ml-auto text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />已完成
                  </span>
                </div>

                <div className="glass-card overflow-hidden">
                  {/* Media Panel */}
                  <div className="bg-gray-50 dark:bg-gray-900/50">
                    {mode === "video-download" && result.video_url && (
                      <div className="p-3">
                        <video src={result.video_url} controls playsInline preload="metadata" className="w-full rounded-lg max-h-80" />
                        <div className="mt-2 flex gap-1.5">
                          <a href={result.video_url} download target="_blank"
                            className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                            ⬇️ 下載 MP4
                          </a>
                          <button onClick={() => navigator.clipboard.writeText(result.video_url)}
                            className="px-3 text-xs border border-gray-200 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">
                            複製直連
                          </button>
                        </div>
                      </div>
                    )}
                    {mode === "extract-audio" && result.audio_url && (
                      <div className="p-3">
                        <audio src={result.audio_url} controls className="w-full" />
                        <div className="mt-2 flex gap-1.5">
                          <a href={result.audio_url} download target="_blank"
                            className="flex-1 text-center text-xs bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700">
                            ⬇️ 下載 MP3
                          </a>
                          <button onClick={() => navigator.clipboard.writeText(result.audio_url)}
                            className="px-3 text-xs border border-gray-200 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">
                            複製直連
                          </button>
                        </div>
                      </div>
                    )}
                    {mode === "extract-caption" && (
                      <div className="p-3">
                        <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/30 rounded-lg p-3 max-h-48 overflow-y-auto text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {result.captions_cleaned || result.captions_raw || "無文字內容"}
                        </div>
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          <button onClick={() => navigator.clipboard.writeText(result.captions_cleaned || "")}
                            className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">📋 複製乾淨文稿</button>
                          <button onClick={() => navigator.clipboard.writeText(result.captions_raw || "")}
                            className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">📋 複製原始文稿</button>
                        </div>
                      </div>
                    )}
                    {mode === "ocr" && (
                      <div className="p-3">
                        <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/30 rounded-lg p-3 max-h-48 overflow-y-auto text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {result.text || "無文字內容"}
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(result.text || "")}
                          className="mt-2 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">📋 複製文字</button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
                      <span className="bg-gray-50 dark:bg-gray-800/40 px-1.5 py-0.5 rounded">
                        {mode === "video-download" ? "影片" : mode === "extract-audio" ? "音頻" : mode === "ocr" ? "文字" : "文稿"}
                      </span>
                      {result.title && <span className="truncate">{detectPlatform(url)}</span>}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{result.title || "未命名作品"}</h3>
                    {result.duration_seconds && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">時長：{formatDuration(result.duration_seconds)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            {showHistory && (
              <div className="glass-card p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider">RECENT</span>
                    <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200">最近解析</h2>
                  </div>
                  {history.length > 0 && (
                    <button onClick={() => { clearHistory(); setHistory([]); }} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      清除紀錄
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">尚無解析紀錄</p>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {history.map((item) => (
                      <button
                        key={item.id + item.timestamp}
                        onClick={() => loadHistoryItem(item)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-left transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-sm shrink-0 overflow-hidden">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            item.type === "video" ? "🎬" : item.type === "audio" ? "🎵" : "📝"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">
                            {item.platform || "媒體"} · {new Date(item.timestamp).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Supported Platforms */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/30 text-center">
              <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">支援平台</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {["抖音", "小紅書", "YouTube", "TikTok", "快手", "B站", "微博", "Facebook", "Instagram", "Twitter/X"].map((p) => (
                  <span key={p} className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Features ═══ */}
        <section className="py-16 max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">強大功能特性</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🌐", title: "50+ 平臺支援", desc: "支援抖音、小紅書、快手、B站、微博等 50+ 主流平臺，一鍵提取文案和下載影片" },
              { icon: "🤖", title: "AI 智能識別", desc: "採用先進 AI 智能識別技術，自動提取影片文案，準確率高，處理速度快" },
              { icon: "🎵", title: "影片轉音頻", desc: "支援影片轉音頻 MP3，一鍵下載影片音頻，方便二次創作" },
              { icon: "📦", title: "批量下載", desc: "支援批量下載影片、圖片，提高工作效率" },
              { icon: "📝", title: "文案提取", desc: "YouTube、抖音、小紅書等平臺影片自動轉文字，支援多國語言" },
              { icon: "🆓", title: "免費使用", desc: "完全免費，無需登錄即可使用，即用即走，保護隱私" },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/30 p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Steps ═══ */}
        <section className="bg-gray-50 dark:bg-gray-800/40 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-10">三步輕鬆完成</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "複製分享鏈接", desc: "從抖音、小紅書等平臺複製作品分享鏈接，粘貼到輸入框中" },
                { step: "2", title: "一鍵提取", desc: "點擊開始提取，AI 智能識別文案、自動解析，快速完成" },
                { step: "3", title: "下載保存", desc: "一鍵下載無浮水印影片，或者複製文案，開始二次創作" },
              ].map((s) => (
                <div key={s.step} className="bg-white dark:bg-gray-800/60 p-8 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">{s.step}</div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Use Cases ═══ */}
        <section className="py-16 max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-3">實際應用場景</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">了解在不同行業和場景中的實際應用，激發創作靈感</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎨", title: "內容創作者", desc: "短視頻博主、UP主提取熱門視頻文案，學習爆款創作技巧" },
              { icon: "📊", title: "數字營銷人員", desc: "研究競品視頻文案、分析行業趨勢、制定營銷策略" },
              { icon: "🛍️", title: "電商賣家", desc: "提取優質商品影片，優化產品詳情頁和推廣素材" },
              { icon: "👨‍🏫", title: "教育工作者", desc: "提取教學影片內容，製作課件、整理教學素材" },
              { icon: "🔬", title: "數據研究員", desc: "收集影片數據、分析內容趨勢、研究用戶行為" },
              { icon: "📰", title: "媒體從業者", desc: "快速獲取新聞素材、核實信息來源、製作專題報導" },
            ].map((u) => (
              <div key={u.title} className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-xl">
                <div className="text-2xl mb-2">{u.icon}</div>
                <h3 className="font-bold mb-2">{u.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Writing Tips ═══ */}
        <section className="bg-gray-50 dark:bg-gray-800/40 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-3">影片文案寫作技巧</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">掌握短視頻文案創作核心技巧，提升播放量與互動率</p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: "🎣", title: "前 3 秒黃金鉤子", desc: "影片開頭的前 3 秒決定用戶是否繼續觀看。用提問、反常識觀點、驚人數據或痛點共鳴吸引注意力。", example: "「別再這樣做了！90%的人都不知道這個方法...」" },
                { icon: "❤️", title: "情感共鳴引發互動", desc: "好的文案觸動用戶情感，無論喜悅、憤怒、感動還是驚訝。講述真實故事，讓觀眾產生共鳴。", example: "「作為一個單親媽媽，我曾經也...」" },
                { icon: "📝", title: "清晰的內容結構", desc: "採用總分總、問題-解決方案等結構，讓內容邏輯清晰。關鍵信息前置，避免冗長鋪墊。", example: "「今天分享 3 個技巧：第一...第二...第三...」" },
                { icon: "🔑", title: "關鍵詞優化佈局", desc: "在標題、正文中合理佈局關鍵詞，提高被推薦和搜索到的機會。注意自然融入，避免堆砌。", example: "主題「減肥」→ 瘦身、健身、燃脂、飲食" },
                { icon: "📢", title: "明確的行動號召", desc: "結尾要有明確的行動號召，引導用戶點讚、評論、關注。提出問題或提供福利。", example: "「你有什麼更好的方法？評論區告訴我」" },
                { icon: "📖", title: "故事化敘事方法", desc: "用講故事的方式呈現內容，設置衝突、轉折和高潮。真實個人經歷比說教更有說服力。", example: "「3 個月前我還在為...發愁，直到我發現了這個方法」" },
              ].map((t) => (
                <div key={t.title} className="bg-white dark:bg-gray-800/60 p-6 rounded-xl border border-gray-200 dark:border-gray-700/30">
                  <h3 className="font-bold mb-2"><span className="text-xl mr-1">{t.icon}</span>{t.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{t.desc}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs italic">{t.example}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="py-16 max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-3">常見問題</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">關於 ContentSync Studio 的常見問題和解答</p>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <details key={i} className="group border border-gray-200 dark:border-gray-700/30 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-between">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white text-center">
          <h2 className="text-3xl font-bold mb-3">準備開始使用了嗎？</h2>
          <p className="text-blue-100 mb-8">支援 50+ 平臺，免費使用，立即開始你的創作之旅</p>
          <Link href="/register" className="inline-block bg-white text-blue-700 px-10 py-3.5 rounded-xl text-lg font-bold hover:bg-blue-50 transition-colors shadow-lg">
            免費註冊開始使用
          </Link>
          <p className="text-blue-200 text-sm mt-4">或直接在輸入框中粘貼連結開始，無需註冊</p>
        </section>
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-10 bg-white dark:bg-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.1 5.2c0-1.5 1.7-2.4 2.9-1.5l8.2 6.3c1 .8 1 2.3 0 3.1L11 19.4c-1.2.9-2.9 0-2.9-1.5V5.2Z"/>
              </svg>
              <h3 className="font-bold">ContentSync Studio</h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400">支援 50+ 平臺影片文案提取、轉音頻、圖片文字辨識。免費在線使用。</p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">&copy; 2026 ContentSync Studio</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 italic border-t border-gray-200 dark:border-gray-700/30 pt-3">
              僅供個人學習與研究用途。用戶須確保擁有內容使用權限。
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-3">工具</h3>
            <ul className="space-y-1 text-gray-500 dark:text-gray-400">
              <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">影片下載</Link></li>
              <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">文案提取</Link></li>
              <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">影片轉音頻</Link></li>
              <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">圖片文字辨識</Link></li>
              <li><Link href="/register" className="hover:text-blue-600 dark:hover:text-blue-400">AI 文案優化</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-3">法律</h3>
            <ul className="space-y-1 text-gray-500 dark:text-gray-400">
              <li><Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">使用條款</Link></li>
              <li><Link href="/dmca" className="hover:text-blue-600 dark:hover:text-blue-400">DMCA</Link></li>
            </ul>
            <h3 className="font-bold mb-3 mt-5">支援平臺</h3>
            <ul className="space-y-1 text-gray-500 dark:text-gray-400">
              {["抖音", "小紅書", "YouTube", "TikTok", "快手", "B站", "微博", "Facebook", "Instagram"].map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
