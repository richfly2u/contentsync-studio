"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        載入中...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          歡迎回來{user?.user_metadata?.full_name ? `，${user.user_metadata.full_name}` : ""}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          這是您的內容管理儀表板
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="text-2xl mb-2">🎬</div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-gray-500">本月發布</div>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-gray-500">AI 處理次數</div>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="text-2xl mb-2">📤</div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-gray-500">已連結平台</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h2 className="font-bold mb-4">快速開始</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/videos/new"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">📥</span>
            <div>
              <div className="font-medium">匯入影片</div>
              <div className="text-sm text-gray-500">
                貼上 YouTube/TikTok 連結
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/videos"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🎬</span>
            <div>
              <div className="font-medium">瀏覽影片庫</div>
              <div className="text-sm text-gray-500">查看所有已匯入的影片</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
