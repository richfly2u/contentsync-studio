"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PublishedItem {
  id: string;
  platform: string;
  platform_url: string;
  status: string;
  caption_text: string | null;
  published_at: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

export default function PublishedPage() {
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/publish`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error("Failed to fetch published", err);
    } finally {
      setLoading(false);
    }
  };

  const platformIcon: Record<string, string> = {
    youtube: "▶️",
    tiktok: "🎵",
    facebook: "👍",
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-100 text-green-800",
      publishing: "bg-blue-100 text-blue-800",
      scheduled: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          styles[status] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">發布管理</h1>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          還沒有發布過影片
          <br />
          <Link
            href="/dashboard/videos"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            前往影片庫
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-4"
            >
              <span className="text-2xl">
                {platformIcon[item.platform] || "📱"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{item.platform}</span>
                  {statusBadge(item.status)}
                </div>
                {item.caption_text && (
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {item.caption_text}
                  </p>
                )}
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  {item.published_at && (
                    <span>
                      {new Date(item.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <span>👁 {item.views_count}</span>
                  <span>❤️ {item.likes_count}</span>
                </div>
              </div>
              {item.platform_url && (
                <a
                  href={item.platform_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline shrink-0"
                >
                  檢視 →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
