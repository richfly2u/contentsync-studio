import Link from "next/link";

export default function DMCAPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DMCA 政策</h1>
        <p className="text-gray-400 text-xs mb-8">數位千禧年著作權法案 — 侵權通知與下架程序</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">概述</h2>
            <p>
              ContentSync Studio 尊重他人智慧財產權。依據美國《數位千禧年著作權法案》（DMCA），
              我們將對收到的有效侵權通知做出回應，包括移除被指控侵權的內容或終止重複侵權者的帳戶。
            </p>
            <p className="mt-2">
              <strong>請注意：</strong>本服務不會長期儲存用戶內容。所有處理中的暫存檔案會在 24 小時內自動刪除。
              如您認為您的作品仍被未經授權使用，請依以下程序提交通知。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">提交通知</h2>
            <p>如您認為您的著作權內容被未經授權使用，請提供以下資訊至我們的指定代理人：</p>

            <div className="bg-gray-50 rounded-xl p-4 mt-3 space-y-2 text-sm">
              <p><strong>電子郵件：</strong> <a href="mailto:dmca@link2publish.app" className="text-blue-600 underline">dmca@link2publish.app</a></p>
              <p><strong>回覆時效：</strong> 1-2 個工作日</p>
            </div>

            <p className="mt-4 font-medium text-gray-900">通知須包含以下資訊：</p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>您授權代表著作權所有人的實體或電子簽名</li>
              <li>您主張遭受侵權之著作權作品的明確識別資訊</li>
              <li>您主張侵權之內容的明確識別資訊（如連結、時間戳等）</li>
              <li>您的姓名、地址、電話號碼及電子郵件地址</li>
              <li>您善意認為該內容的使用未經著作權所有人、其代理人或法律授權的聲明</li>
              <li>願就所提供資訊之正確性負擔偽證責任，且您為著作權所有人或被授權代表著作權所有人的聲明</li>
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">反通知（Counter-Notice）</h2>
            <p>
              若您因 DMCA 通知而被移除內容，且您認為該移除係出於誤認或誤判，
              您可向我們提交反通知。反通知應包含：
            </p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>您的實體或電子簽名</li>
              <li>被移除內容的識別資訊及其移除前的位置</li>
              <li>願就偽證責任負擔的聲明，表明您善意認為該內容係因誤認或誤判而被移除</li>
              <li>您的姓名、地址、電話號碼，以及同意接受聯邦地方法院管轄的聲明</li>
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">重複侵權政策</h2>
            <p>
              對於被認定為「重複侵權者」的用戶，我們將在適當情況下終止其帳戶。
              重複侵權的認定標準為：收到三起或以上針對同一用戶的有效 DMCA 通知。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">免責聲明</h2>
            <p>
              本 DMCA 政策旨在遵守美國 DMCA 相關規定。本服務不承諾或保證所有地區的著作權法律皆能被完全遵守。
              用戶有責任確保其使用行為符合當地法律。
            </p>
          </div>
        </section>
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
