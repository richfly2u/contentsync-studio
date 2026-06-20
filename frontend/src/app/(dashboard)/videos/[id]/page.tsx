"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface VideoDetail {
  id: string;
  original_filename: string;
  source: string;
  status: string;
  duration_seconds: number | null;
  storage_url: string | null;
  created_at: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      fetchVideo(session.access_token);
    });
  }, [params.id]);

  const fetchVideo = async (token: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/videos/${params.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Video not found");
      const v = await res.json();
      setVideo(v);
    } catch (err) {
      console.error("Failed to fetch video", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">載入中...</div>;
  }

  if (!video) {
    return (
      <div className="p-8 text-center text-gray-500">
        影片不存在
        <br />
        <Link
          href="/dashboard/videos"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          回影片庫
        </Link>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    ready: "已完成",
    downloading: "下載中",
    processing: "處理中",
    failed: "失敗",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/videos"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 回影片庫
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h1 className="text-xl font-bold">{video.original_filename}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              video.status === "ready"
                ? "bg-green-100 text-green-800"
                : video.status === "downloading"
                ? "bg-blue-100 text-blue-800"
                : video.status === "failed"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {statusLabels[video.status] || video.status}
          </span>
          <span className="text-sm text-gray-500">
            {video.source === "youtube_download"
              ? "YouTube"
              : video.source === "tiktok_download"
              ? "TikTok"
              : video.source}
          </span>
          {video.duration_seconds && (
            <span className="text-sm text-gray-500">
              {Math.floor(video.duration_seconds / 60)}:
              {String(video.duration_seconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>

      {video.status === "ready" && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="font-bold mb-4">操作</h2>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/publish/${video.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              📤 發布此影片
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
