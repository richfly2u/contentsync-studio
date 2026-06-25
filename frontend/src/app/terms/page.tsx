import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">🎬 ContentSync Studio</Link>
          <nav className="flex gap-3 items-center">
            <Link href="/tools" className="text-sm text-blue-600 font-medium">免費工具</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 text-sm text-gray-700 leading-relaxed">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">使用條款</h1>
        <p className="text-gray-400 text-xs mb-8">最後更新：2026 年 6 月</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. 接受條款</h2>
            <p>使用 ContentSync Studio（以下簡稱「本服務」）即表示您同意本使用條款。若您不同意，請勿使用本服務。</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. 服務說明</h2>
            <p>本服務提供以下工具：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>影片下載 — 從公開連結下載影片</li>
              <li>文案提取 — 將影片語音轉為文字</li>
              <li>影片轉音頻 — 提取影片中的音軌</li>
              <li>圖片文字辨識 — 從圖片中提取文字</li>
            </ul>
            <p className="mt-2">本服務僅提供技術處理，不對用戶輸入的內容承擔任何責任。</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. 用戶責任</h2>
            <p className="font-medium text-gray-900">使用本服務時，您聲明並保證：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>您擁有所提交內容的合法權利，或已獲得權利人的明確授權</li>
              <li>您不會使用本服務侵犯任何第三方的著作權、商標權、隱私權或其他權利</li>
              <li>您不會使用本服務規避任何平台的技術保護措施</li>
              <li>您不會將本服務用於任何非法目的</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. 合理使用</h2>
            <p>本服務提供的工具僅供以下用途：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>個人學習與研究</strong> — 分析影片內容、學習文案技巧</li>
              <li><strong>內容轉錄</strong> — 將影片語音轉為文字便於參考</li>
              <li><strong>個人備份</strong> — 備份您擁有版權的內容</li>
              <li><strong>合理使用範圍</strong> — 符合各國著作權法合理使用規定的用途</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. 智慧財產權</h2>
            <p>本服務不會儲存、佔有或主張任何用戶處理內容的所有權。所有處理後的檔案將在 24 小時內自動刪除。</p>
            <p className="mt-2">用戶提交的原始內容之智慧財產權歸原權利人所有。</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. 免責聲明</h2>
            <p>本服務以「現狀」提供，不提供任何明示或暗示的保證。我們不保證：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>服務不會中斷或無錯誤</li>
              <li>所有平台的下載功能持續可用</li>
              <li>處理結果的完整準確性</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. DMCA 與侵權通知</h2>
            <p>若您認為您的著作權內容被未經授權使用，請透過 <a href="/dmca" className="text-blue-600 underline">DMCA 頁面</a> 提交通知，我們將在收到有效通知後儘速處理。</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. 條款變更</h2>
            <p>我們保留隨時修改本條款的權利。重大變更將透過網站公告通知。</p>
          </div>
        </section>

        <div className="mt-12 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
          <p>如有任何疑問，請聯絡：legal@link2publish.app</p>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-xs text-gray-400">
        <p>&copy; 2026 ContentSync Studio. 僅供個人學習與研究用途。</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="/terms" className="text-blue-600 hover:underline">使用條款</Link>
          <Link href="/dmca" className="text-blue-600 hover:underline">DMCA</Link>
          <Link href="/tools" className="text-blue-600 hover:underline">免費工具</Link>
        </div>
      </footer>
    </div>
  );
}
