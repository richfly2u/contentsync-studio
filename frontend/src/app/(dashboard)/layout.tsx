import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: "📊" },
  { href: "/dashboard/videos", label: "影片庫", icon: "🎬" },
  { href: "/dashboard/videos/new", label: "新增影片", icon: "➕" },
  { href: "/dashboard/publish", label: "發布管理", icon: "📤" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/dashboard" className="text-lg font-bold">
            🎬 ContentSync
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          ContentSync Studio v0.1
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6 bg-white">
          <h2 className="text-lg font-semibold flex-1">ContentSync Studio</h2>
          <a
            href="/settings"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            設定
          </a>
        </header>
        <div className="flex-1 bg-gray-50">{children}</div>
      </main>
    </div>
  );
}
