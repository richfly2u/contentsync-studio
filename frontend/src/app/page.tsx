import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🎬 ContentSync Studio</h1>
          <nav className="flex gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              登入
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              免費註冊
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6">
            一鍵影片
            <span className="text-blue-600"> AI 轉內容</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            貼上影片連結 → AI 自動轉文稿、優化文案、生成摘要 →
            一鍵發布到 YouTube、TikTok、小紅書、Facebook
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700"
            >
              免費開始使用
            </Link>
            <Link
              href="/login"
              className="border px-8 py-3 rounded-lg text-lg hover:bg-gray-50"
            >
              登入
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-3">📥</div>
              <h3 className="font-bold text-lg mb-2">貼連結即下載</h3>
              <p className="text-gray-600">
                支援 YouTube、TikTok、小紅書，貼上連結自動下載
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="font-bold text-lg mb-2">AI 智慧處理</h3>
              <p className="text-gray-600">
                語音轉文字、去除贅詞、文案優化、摘要生成，中英文都支援
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-3">📤</div>
              <h3 className="font-bold text-lg mb-2">一鍵跨平台發布</h3>
              <p className="text-gray-600">
                同時發布到 YouTube、TikTok、小紅書、Facebook，節省時間
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-gray-500 text-sm">
        &copy; 2026 ContentSync Studio. All rights reserved.
      </footer>
    </div>
  );
}
