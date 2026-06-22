"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";

export default function ToolsPage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"extract-caption" | "extract-audio" | "ocr">("extract-caption");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const endpoint = mode === "extract-caption" ? "/api/tools/caption"
        : mode === "ocr" ? "/api/tools/ocr"
        : "";
      if (!endpoint) {
        setError("此功能需要後端伺服器，即將推出獨立版本");
        setLoading(false);
        return;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), language: "zh" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "處理失敗，請檢查連結是否正確");
      } else {
        setResult(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
      }
    } catch (e: any) {
      setError(e.message || "網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [url, mode]);

  const placeholderText = {
    "extract-caption": "粘貼影片分享鏈接（支援抖音、小紅書、YouTube、TikTok 等）",
    "extract-audio": "粘貼影片分享鏈接，提取音頻 MP3",
    "ocr": "粘貼圖片網址（或上傳圖片），提取圖片中的文字",
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 導航欄 */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">🎬 ContentSync Studio</Link>
          <div className="flex gap-3 items-center">
            <Link href="/tools" className="text-sm text-blue-600 font-medium">免費工具</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">登入</Link>
            <Link href="/register" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">免費註冊</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">免費在線工具</h1>
        <p className="text-gray-500 text-center mb-10">貼上連結，一鍵搞定。無需登入，完全免費。</p>

        {/* 模式選擇 */}
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {[
            { id: "extract-caption", label: "📝 文案提取", desc: "影片轉文字" },
            { id: "extract-audio", label: "🎵 影片轉音頻", desc: "提取 MP3" },
            { id: "ocr", label: "🖼️ 圖片文字辨識", desc: "OCR" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id as any); setResult(null); setError(""); }}
              className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                mode === m.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {m.label}
              <span className="block text-xs opacity-70 mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* 輸入框（AnyToCopy 風格） */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={placeholderText[mode]}
              className="w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {url && (
              <button onClick={() => setUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            )}
          </div>
          <button onClick={handlePaste} className="px-4 py-3.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">粘貼</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="px-8 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "處理中..." : "開始提取"}
          </button>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-400 text-center mb-10">
          支援 50+ 平臺：抖音、小紅書、YouTube、TikTok、快手、B站、微博、Facebook 等
        </p>

        {/* 錯誤 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {/* 結果區 */}
        {result && (
          <div ref={resultRef} className="space-y-6 animate-fade-in">
            {/* Caption extract 結果 */}
            {mode === "extract-caption" && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-700 font-medium">✅ 提取完成</p>
                  <p className="text-xs text-green-600 mt-1">{result.title} | 時長：{result.duration_seconds || "?"}秒</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">原始文稿</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">{result.captions_raw}</div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">清除口頭禪後的乾淨文稿</h3>
                  <div className="bg-white border border-blue-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-60 overflow-y-auto">{result.captions_cleaned}</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result.captions_cleaned)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📋 複製乾淨文稿</button>
                  <button onClick={() => navigator.clipboard.writeText(result.captions_raw)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📋 複製原始文稿</button>
                </div>
              </>
            )}

            {/* Audio extract 結果 */}
            {mode === "extract-audio" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <p className="text-lg font-medium text-amber-700 mb-1">🎵 影片轉音頻</p>
                <p className="text-sm text-amber-600 mb-4">此功能需要後端伺服器支援，即將推出</p>
                <p className="text-xs text-gray-400">目前支援：📝 文案提取、🖼️ 圖片文字辨識</p>
              </div>
            )}

            {/* OCR 結果 */}
            {mode === "ocr" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <p className="text-sm font-medium text-green-700 mb-3">✅ 文字辨識完成</p>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-80 overflow-y-auto">{result.text}</div>
                <button onClick={() => navigator.clipboard.writeText(result.text)} className="mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📋 複製文字</button>
              </div>
            )}
          </div>
        )}

        {/* 支持平臺 */}
        <div className="mt-16 border-t border-gray-100 pt-8">
          <h2 className="text-lg font-bold text-center mb-4">支援 50+ 平臺</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {["抖音", "小紅書", "YouTube", "TikTok", "快手", "B站", "微博", "Facebook", "Instagram", "Twitter/X", "視頻號", "淘寶"].map((p) => (
              <div key={p} className="bg-gray-50 rounded-lg px-3 py-2 text-center text-sm text-gray-600">{p}</div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
        &copy; 2026 ContentSync Studio. 免費在線影片文案提取、音頻提取、圖片文字辨識工具。
      </footer>
    </div>
  );
}
