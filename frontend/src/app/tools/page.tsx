"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ─── 免費次數限制 ──────────────────────────────────────────────────
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

export default function ToolsPage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<ToolMode>("video-download");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [downloadCount, setDownloadCount] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [formatVideos, setFormatVideos] = useState<any[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDownloadCount(getDownloadCount());
    setHistory(getHistory());
    supabase?.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
  }, []);

  const remaining = FREE_DOWNLOAD_LIMIT - downloadCount;
  const isDownloadMode = mode === "video-download" || mode === "extract-audio";

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://108.61.163.87";

  const MODES: { id: ToolMode; label: string; desc: string }[] = [
    { id: "video-download", label: "影片下載",
      desc: `MP4${!user && remaining > 0 && remaining <= 3 ? `（剩${remaining}次）` : !user && remaining <= 0 ? "（已滿）" : user ? "（無限）" : ""}` },
    { id: "extract-caption", label: "文案提取", desc: "影片轉文字" },
    { id: "extract-audio", label: "影片轉音頻", desc: "提取 MP3" },
    { id: "ocr", label: "圖片文字", desc: "OCR 辨識" },
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

    // Download limit (only for non-logged-in users)
    if (!user && isDownloadMode && remaining <= 0) {
      setError(`免費試用次數已用完（${FREE_DOWNLOAD_LIMIT} 次）。`);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setFormatVideos([]);

    try {
      const endpoint = endpointMap[mode];
      const body: Record<string, any> =
        mode === "ocr"
          ? { image_url: targetUrl.trim(), language: "chi_sim+eng" }
          : { url: targetUrl.trim(), language: "zh" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`伺服器錯誤 (${res.status}): ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "處理失敗，請檢查連結是否正確");
      } else {
        setResult(data);

        // Increment download count
        if (!user && isDownloadMode) {
          incrementDownloadCount();
          setDownloadCount(getDownloadCount());
        }

        // Add to history
        const platform = detectPlatform(targetUrl);
        const hitem: HistoryItem = {
          id: targetUrl,
          url: targetUrl,
          title: data.title || "未命名",
          mode,
          type: mode === "video-download" ? "video" : mode === "extract-audio" ? "audio" : mode === "ocr" ? "text" : "text",
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
  }, [url, mode, user, remaining, isDownloadMode]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {}
  };

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setUrl(item.url);
    setMode(item.mode);
    setResult(item.result);
    setError("");
    setFormatVideos([]);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }, []);

  const isPremium = !!user;
  const needsUpgrade = !isPremium && isDownloadMode && remaining <= 0;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.1 5.2c0-1.5 1.7-2.4 2.9-1.5l8.2 6.3c1 .8 1 2.3 0 3.1L11 19.4c-1.2.9-2.9 0-2.9-1.5V5.2Z"/>
            </svg>
            <span className="font-bold text-sm">ContentSync Studio</span>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">免費工具</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${showHistory ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              最近解析 ({history.length})
            </button>
            {user ? (
              <span className="text-xs text-green-600 font-medium">✓ 已登入</span>
            ) : (
              <Link href="/register" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                註冊解鎖無限
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">HTML 網頁版</div>
          <h1 className="text-2xl font-bold text-gray-900">貼上連結，提取影片、圖片與文案</h1>
          <p className="text-sm text-gray-500 mt-1">支援小紅書、抖音、TikTok、YouTube、Facebook 等平台</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1.5 mb-4 justify-center flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id as ToolMode); setResult(null); setError(""); setFormatVideos([]); }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                mode === m.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {m.label}
              {m.desc && <span className="block text-[10px] opacity-70 mt-0.5">{m.desc}</span>}
            </button>
          ))}
        </div>

        {/* Parse Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-400 font-medium tracking-wider">STEP 01</span>
            <span className="text-xs font-bold text-gray-800">貼上分享內容</span>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-400">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Zm6 4v2"/>
              </svg>
              僅處理公開頁面
            </div>
          </div>

          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="貼上分享連結 👇"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={4096}
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400">{url.length} / 4096</span>
            {url && (
              <button onClick={() => setUrl("")} className="text-[10px] text-gray-400 hover:text-gray-600">清除</button>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={handlePaste} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              貼上剪貼簿
            </button>
            <button
              onClick={() => handleParse()}
              disabled={loading || !url.trim() || (needsUpgrade && isDownloadMode)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  處理中...
                </span>
              ) : needsUpgrade ? "已達上限，請註冊" : "開始解析"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-white border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v5m0 3h.01M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z"/>
            </svg>
            <div className="text-xs text-red-700">
              <strong className="block">解析未完成</strong>
              <p>{error}</p>
              {error.includes("已用完") && (
                <Link href="/register" className="inline-block mt-1 text-blue-600 underline font-medium">註冊解鎖無限次下載 →</Link>
              )}
            </div>
          </div>
        )}

        {/* Needs Upgrade */}
        {needsUpgrade && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm font-medium text-amber-800">免費試用次數已用完</p>
            <p className="text-xs text-amber-600 mt-1">註冊後可無限次下載，並使用 AI 文案優化功能</p>
            <Link href="/register" className="inline-block mt-3 bg-blue-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-blue-700">
              免費註冊 →
            </Link>
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-medium tracking-wider">STEP 02</span>
              <span className="text-xs font-bold text-gray-800">解析結果</span>
              <span className="ml-auto text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />已完成
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Media Panel */}
              <div className="bg-black/5">
                {mode === "video-download" && result.video_url && (
                  <div className="p-3">
                    <video src={result.video_url} controls playsInline preload="metadata" className="w-full rounded-lg max-h-80" />
                    <div className="mt-2 flex gap-1.5">
                      <a href={result.video_url} download target="_blank"
                        className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                        ⬇️ 下載 MP4
                      </a>
                      <button onClick={() => navigator.clipboard.writeText(result.video_url)}
                        className="px-3 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
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
                        className="px-3 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                        複製直連
                      </button>
                    </div>
                  </div>
                )}
                {mode === "extract-caption" && (
                  <div className="p-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto text-xs text-gray-700 whitespace-pre-wrap">
                      {result.captions_cleaned || result.captions_raw || "無文字內容"}
                    </div>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <button onClick={() => navigator.clipboard.writeText(result.captions_cleaned || "")}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">📋 複製乾淨文稿</button>
                      <button onClick={() => navigator.clipboard.writeText(result.captions_raw || "")}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">📋 複製原始文稿</button>
                    </div>
                  </div>
                )}
                {mode === "ocr" && (
                  <div className="p-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto text-xs text-gray-700 whitespace-pre-wrap">
                      {result.text || "無文字內容"}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(result.text || "")}
                      className="mt-2 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">📋 複製文字</button>
                  </div>
                )}
              </div>

              {/* Result Info */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1.5">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {mode === "video-download" ? "影片" : mode === "extract-audio" ? "音頻" : mode === "ocr" ? "文字" : "文稿"}
                  </span>
                  {result.title && <span className="truncate">{detectPlatform(url) || "媒體"}</span>}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{result.title || "未命名作品"}</h3>
                {result.duration_seconds && (
                  <div className="text-[11px] text-gray-500">時長：{formatDuration(result.duration_seconds)}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] text-gray-400 font-medium tracking-wider">RECENT</span>
                <h2 className="text-xs font-bold text-gray-800">最近解析</h2>
              </div>
              {history.length > 0 && (
                <button onClick={() => { clearHistory(); setHistory([]); }} className="text-[10px] text-gray-400 hover:text-gray-600">
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
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm shrink-0 overflow-hidden">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        item.type === "video" ? "🎬" : item.type === "audio" ? "🎵" : "📝"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-800 truncate">{item.title}</div>
                      <div className="text-[10px] text-gray-400">
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
        <div className="mt-8 py-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-center text-gray-500 mb-3">支援平台</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {["抖音", "小紅書", "YouTube", "TikTok", "快手", "B站", "微博", "Facebook", "Instagram", "Twitter/X"].map((p) => (
              <span key={p} className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">{p}</span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-6 text-center">
        <p className="text-[10px] text-gray-400">僅供個人學習與研究用途。用戶須確保擁有內容使用權限。</p>
        <div className="flex justify-center gap-4 mt-2 text-[10px]">
          <Link href="/terms" className="text-blue-600 hover:underline">使用條款</Link>
          <Link href="/dmca" className="text-blue-600 hover:underline">DMCA</Link>
        </div>
      </footer>
    </div>
  );
}
