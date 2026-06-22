"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const handleExtract = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://108.61.163.87";
      const res = await fetch(`${apiBase}/api/v1/tools/extract-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), language: "zh" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "提取失敗，請檢查連結");
      } else {
        setResult(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
      }
    } catch (e: any) {
      setError(e.message || "網路錯誤");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      setUrl(await navigator.clipboard.readText());
    } catch { /* fallback */ }
  };

  const faqItems = [
    {
      q: "ContentSync Studio 完全免費嗎？",
      a: "我們提供免費方案，每月可處理 5 次影片。註冊後即可使用。Pro 方案 $12/月，無限次數。",
    },
    {
      q: "支援哪些影片平臺？",
      a: "支援 YouTube、TikTok、小紅書、Facebook、抖音、快手、B站、微博、Instagram 等 50+ 平臺。",
    },
    {
      q: "文案識別的準確率如何？支援哪些語言？",
      a: "採用 OpenAI Whisper 語音辨識引擎，中文/英文準確率超過 95%。支援中、英、日、韓等多種語言。",
    },
    {
      q: "提取文案需要多長時間？",
      a: "一般 1-5 分鐘內完成，取決於影片長度。短影片（3 分鐘內）通常 30 秒內完成。",
    },
    {
      q: "可以商用嗎？有版權問題嗎？",
      a: "提取自己上傳的影片文案完全沒問題。提取他人影片內容，建議用於學習參考，商用需自行確認版權。",
    },
    {
      q: "為什麼有些影片無法提取？",
      a: "部分私密帳號、付費內容或受版權保護的影片可能無法提取。請確保使用的是公開分享鏈接。",
    },
    {
      q: "使用安全嗎？會洩露信息嗎？",
      a: "我們使用 HTTPS 加密傳輸，不會儲存你的影片內容。提取完成的檔案會在 24 小時後自動刪除。",
    },
    {
      q: "移動端和電腦端都可以使用嗎？",
      a: "是的！響應式設計，手機瀏覽器直接打開即可使用，無需下載 App。",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">🎬 ContentSync Studio</Link>
          <nav className="flex gap-3 items-center">
            <Link href="/tools" className="text-sm text-blue-600 font-medium hover:text-blue-700">免費工具</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">登入</Link>
            <Link href="/register" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">免費註冊</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero：AnyToCopy 風格單一輸入框 ── */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              支援 50+ 平臺<br className="md:hidden" />
              <span className="text-blue-600">影片文案提取</span> &amp; <span className="text-blue-600">去浮水印</span> 工具
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              一鍵提取影片文案、影片轉音頻 MP3、圖片文字辨識。<br />
              AI 智能處理，批量下載，免費使用。
            </p>

            {/* 貼連結輸入框 */}  
            <div className="max-w-2xl mx-auto flex gap-2 mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExtract()}
                  placeholder="粘貼影片/圖片分享鏈接（支援抖音、小紅書、YouTube 等 50+ 平臺）"
                  className="w-full px-5 py-4 pr-12 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
                {url && (
                  <button onClick={() => setUrl("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                )}
              </div>
              <button onClick={handlePaste} className="px-5 py-4 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 shadow-sm">粘貼</button>
              <button
                onClick={handleExtract}
                disabled={loading || !url.trim()}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? "處理中..." : "開始提取"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">免費使用，無需登入。支援抖音、小紅書、YouTube、TikTok、快手、B站、微博等</p>

            {/* 搜即用結果 */}
            {error && (
              <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            {result && (
              <div ref={resultRef} className="max-w-2xl mx-auto mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-left animate-fade-in">
                <p className="text-sm text-green-700 font-medium mb-1">✅ 文案提取完成！</p>
                <p className="text-xs text-green-600 mb-3">{result.title} | 時長：{result.duration_seconds || "?"}秒</p>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto mb-3">{result.captions_cleaned}</div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result.captions_cleaned)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition-colors">📋 複製文稿</button>
                  <Link href="/register" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors">🚀 註冊解鎖 AI 優化 + 發布</Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 強大功能特性 ── */}
        <section className="py-16 max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">強大功能特性</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🌐", title: "50+ 平臺支援", desc: "支援抖音、小紅書、快手、B站、微博等 50+ 主流平臺，一鍵提取文案和去浮水印下載" },
              { icon: "🤖", title: "AI 智能識別", desc: "採用先進 AI 智能識別技術，自動提取影片文案，準確率高，處理速度快" },
              { icon: "🎵", title: "影片轉音頻", desc: "支援影片轉音頻 MP3，一鍵下載影片音頻，方便二次創作" },
              { icon: "📦", title: "批量下載", desc: "支援批量下載影片、圖片，提高工作效率" },
              { icon: "💧", title: "無浮水印下載", desc: "智能去除影片、圖片浮水印，高清無損下載，完美保存原始內容" },
              { icon: "🆓", title: "免費使用", desc: "完全免費，無需登錄即可使用，即用即走，保護隱私" },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-gray-100 p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 使用步驟 ── */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-10">三步輕鬆完成</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "複製分享鏈接", desc: "從抖音、小紅書等平臺複製作品分享鏈接，粘貼到輸入框中" },
                { step: "2", title: "一鍵提取", desc: "點擊開始提取，AI 智能識別文案、自動去浮水印，快速解析" },
                { step: "3", title: "下載保存", desc: "一鍵下載無浮水印影片，或者複製文案，開始二次創作" },
              ].map((s) => (
                <div key={s.step} className="bg-white p-8 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">{s.step}</div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 實際應用場景 ── */}
        <section className="py-16 max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-3">實際應用場景</h2>
          <p className="text-gray-500 text-center mb-10 text-sm">了解在不同行業和場景中的實際應用，激發創作靈感</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎨", title: "內容創作者", desc: "短視頻博主、UP主提取熱門視頻文案，學習爆款創作技巧，獲取創意靈感" },
              { icon: "📊", title: "數字營銷人員", desc: "研究競品視頻文案、分析行業趨勢、制定營銷策略" },
              { icon: "🛍️", title: "電商賣家", desc: "提取優質商品影片，優化產品詳情頁和推廣素材" },
              { icon: "👨‍🏫", title: "教育工作者", desc: "提取教學影片內容，製作課件、整理教學素材" },
              { icon: "🔬", title: "數據研究員", desc: "收集影片數據、分析內容趨勢、研究用戶行為" },
              { icon: "📰", title: "媒體從業者", desc: "快速獲取新聞素材、核實信息來源、製作專題報導" },
            ].map((u) => (
              <div key={u.title} className="bg-gray-50 p-6 rounded-xl">
                <div className="text-2xl mb-2">{u.icon}</div>
                <h3 className="font-bold mb-2">{u.title}</h3>
                <p className="text-gray-500 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 影片文案寫作技巧 ── */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-3">影片文案寫作技巧</h2>
            <p className="text-gray-500 text-center mb-10 text-sm">掌握短視頻文案創作核心技巧，提升播放量與互動率</p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: "🎣", title: "前 3 秒黃金鉤子", desc: "影片開頭的前 3 秒決定用戶是否繼續觀看。用提問、反常識觀點、驚人數據或痛點共鳴吸引注意力。", example: "「別再這樣做了！90%的人都不知道這個方法...」" },
                { icon: "❤️", title: "情感共鳴引發互動", desc: "好的文案觸動用戶情感，無論喜悅、憤怒、感動還是驚訝。講述真實故事，讓觀眾產生共鳴。", example: "「作為一個單親媽媽，我曾經也...」" },
                { icon: "📝", title: "清晰的內容結構", desc: "採用總分總、問題-解決方案等結構，讓內容邏輯清晰。關鍵信息前置，避免冗長鋪墊。", example: "「今天分享 3 個技巧：第一...第二...第三...」" },
                { icon: "🔑", title: "關鍵詞優化佈局", desc: "在標題、正文中合理佈局關鍵詞，提高被推薦和搜索到的機會。注意自然融入，避免堆砌。", example: "主題「減肥」→ 瘦身、健身、燃脂、飲食" },
                { icon: "📢", title: "明確的行動號召", desc: "結尾要有明確的行動號召，引導用戶點讚、評論、關注。提出問題或提供福利。", example: "「你有什麼更好的方法？評論區告訴我」" },
                { icon: "📖", title: "故事化敘事方法", desc: "用講故事的方式呈現內容，設置衝突、轉折和高潮。真實個人經歷比說教更有說服力。", example: "「3 個月前我還在為...發愁，直到我發現了這個方法」" },
              ].map((t) => (
                <div key={t.title} className="bg-white p-6 rounded-xl border border-gray-100">
                  <h3 className="font-bold mb-2"><span className="text-xl mr-1">{t.icon}</span>{t.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{t.desc}</p>
                  <p className="text-gray-400 text-xs italic">{t.example}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-3">常見問題</h2>
          <p className="text-gray-500 text-center mb-10 text-sm">關於 ContentSync Studio 的常見問題和解答</p>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center justify-between">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white text-center">
          <h2 className="text-3xl font-bold mb-3">準備開始使用了嗎？</h2>
          <p className="text-blue-100 mb-8">支援 50+ 平臺，免費使用，立即開始你的創作之旅</p>
          <Link href="/register" className="inline-block bg-white text-blue-700 px-10 py-3.5 rounded-xl text-lg font-bold hover:bg-blue-50 transition-colors shadow-lg">
            免費註冊開始使用
          </Link>
          <p className="text-blue-200 text-sm mt-4">或 <Link href="/tools" className="underline">先試用免費工具</Link>，無需註冊</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="font-bold mb-3">🎬 ContentSync Studio</h3>
            <p className="text-gray-500">支援 50+ 平臺影片文案提取、轉音頻、圖片文字辨識。免費在線使用。</p>
            <p className="text-gray-400 mt-2">&copy; 2026 ContentSync Studio</p>
            <p className="text-xs text-gray-400 mt-3 italic border-t border-gray-100 pt-3">
              僅供個人學習與研究用途。用戶須確保擁有內容使用權限。
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-3">工具</h3>
            <ul className="space-y-1 text-gray-500">
              <li><Link href="/tools" className="hover:text-blue-600">影片下載</Link></li>
              <li><Link href="/tools" className="hover:text-blue-600">文案提取</Link></li>
              <li><Link href="/tools" className="hover:text-blue-600">影片轉音頻</Link></li>
              <li><Link href="/tools" className="hover:text-blue-600">圖片文字辨識</Link></li>
              <li><Link href="/register" className="hover:text-blue-600">AI 文案優化</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-3">法律</h3>
            <ul className="space-y-1 text-gray-500">
              <li><Link href="/terms" className="hover:text-blue-600">使用條款</Link></li>
              <li><Link href="/dmca" className="hover:text-blue-600">DMCA</Link></li>
            </ul>
            <h3 className="font-bold mb-3 mt-5">支援平臺</h3>
            <ul className="space-y-1 text-gray-500">
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
