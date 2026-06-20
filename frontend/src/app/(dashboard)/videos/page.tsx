"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Video {
  id: string;
  source: string;
  source_url: string | null;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      fetchVideos(session.access_token);
    });
  }, [router]);

  const fetchVideos = async (token: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/videos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: "bg-green-100 text-green-800",
      downloading: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      ready: "已完成",
      downloading: "下載中",
      processing: "處理中",
      failed: "失敗",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          styles[status] || "bg-gray-100"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">影片庫</h1>
        <Link
          href="/dashboard/videos/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + 新增影片
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          還沒有影片
          <br />
          <Link
            href="/dashboard/videos/new"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            點此新增第一部影片
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/dashboard/videos/${video.id}`}
              className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-3xl text-gray-400 overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.original_filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🎬"
                )}
              </div>
              <h3 className="font-medium truncate">
                {video.original_filename}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {statusBadge(video.status)}
                <span className="text-xs text-gray-500">
                  {video.duration_seconds
                    ? `${Math.floor(video.duration_seconds / 60)}:${String(
                        video.duration_seconds % 60
                      ).padStart(2, "0")}`
                    : "--:--"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
