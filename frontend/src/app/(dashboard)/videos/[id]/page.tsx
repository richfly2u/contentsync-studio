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
  language: string | null;
  created_at: string;
}

interface Transcript {
  raw_text: string | null;
  cleaned_text: string | null;
  optimized_text: string | null;
  summary: string | null;
  language: string;
  word_count: number | null;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    const videoId = params?.id;
    if (!videoId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      fetchData(session.access_token, videoId);
    });
  }, [params?.id]);

  const fetchData = async (token: string, videoId: string) => {
    try {
      // Fetch video
      const vRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/videos/${videoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!vRes.ok) throw new Error("Not found");
      const v = await vRes.json();
      setVideo(v);

      // Try fetching transcript
      const tRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/transcript/${videoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (tRes.ok) {
        setTranscript(await tRes.json());
        setActiveTab("optimized");
      }
    } catch (err) {
      console.error("Failed to fetch", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    const videoId = params?.id;
    if (!videoId) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/transcribe/${videoId}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to start transcription");

      // Poll for completion
      const poll = setInterval(async () => {
        const tRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ai/transcript/${videoId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (tRes.ok) {
          setTranscript(await tRes.json());
          setProcessing(false);
          setActiveTab("optimized");
          clearInterval(poll);
        }
      }, 3000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(poll);
        setProcessing(false);
      }, 600000);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
  if (!video) {
    return (
      <div className="p-8 text-center text-gray-500">
        影片不存在
        <br />
        <Link href="/dashboard/videos" className="text-blue-600 hover:underline mt-2 inline-block">
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
  const statusColors: Record<string, string> = {
    ready: "bg-green-100 text-green-800",
    downloading: "bg-blue-100 text-blue-800",
    processing: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/videos" className="text-sm text-blue-600 hover:underline">
          ← 回影片庫
        </Link>
      </div>

      {/* Video info card */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{video.original_filename}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[video.status] || "bg-gray-100"}`}>
                {statusLabels[video.status] || video.status}
              </span>
              <span className="text-sm text-gray-500">{video.source === "youtube_download" ? "YouTube" : video.source === "tiktok_download" ? "TikTok" : video.source}</span>
              {video.duration_seconds && (
                <span className="text-sm text-gray-500">
                  {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, "0")}
                </span>
              )}
              {video.language && <span className="text-sm text-gray-500">{video.language === "zh" ? "中文" : "English"}</span>}
            </div>
          </div>
          {video.status === "ready" && !transcript && (
            <button
              onClick={handleTranscribe}
              disabled={processing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? "AI 處理中..." : "🤖 AI 處理"}
            </button>
          )}
          {processing && (
            <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded">
              ⏳ AI 處理中...
            </span>
          )}
        </div>
      </div>

      {/* AI Results */}
      {transcript ? (
        <div className="bg-white rounded-xl border shadow-sm">
          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: "optimized", label: "優化文案" },
              { key: "summary", label: "摘要" },
              { key: "cleaned", label: "去除贅詞" },
              { key: "raw", label: "逐字稿" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "optimized" && (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {transcript.optimized_text || "尚無優化文案"}
              </div>
            )}
            {activeTab === "summary" && (
              <div className="whitespace-pre-wrap text-gray-800">
                {transcript.summary || "尚無摘要"}
              </div>
            )}
            {activeTab === "cleaned" && (
              <div className="whitespace-pre-wrap text-gray-800">
                {transcript.cleaned_text || "尚無去除贅詞版本"}
              </div>
            )}
            {activeTab === "raw" && (
              <div className="whitespace-pre-wrap text-sm text-gray-600">
                {transcript.raw_text || "尚無逐字稿"}
              </div>
            )}
            <div className="mt-4 text-xs text-gray-400">
              字數：{transcript.word_count || "?"} | 語言：{transcript.language === "zh" ? "中文" : "English"}
            </div>
          </div>
        </div>
      ) : video.status === "ready" && !processing ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          點擊「AI 處理」按鈕開始語音轉文字
        </div>
      ) : null}

      {/* Actions */}
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
