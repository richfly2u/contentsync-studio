"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PublishVideoPage() {
  const params = useParams();
  const getVideoId = () => { const r = params?.videoId; return r ? (Array.isArray(r) ? r[0] : r) : ""; };
  const [video, setVideo] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const platforms = [
    { id: "youtube", name: "YouTube", icon: "▶️" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "xiaohongshu", name: "小紅書", icon: "📕" },
    { id: "facebook", name: "Facebook", icon: "👍" },
  ];

  useEffect(() => {
    const rawId = params?.videoId;
    if (!rawId) return;
    const videoId = Array.isArray(rawId) ? rawId[0] : rawId;
    fetchData(videoId);
  }, [params?.videoId]);

  const fetchData = async (videoId: string) => {
    try {
      // Fetch video
      const vRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/videos/${videoId}`
      );
      if (!vRes.ok) throw new Error("Video not found");
      const v = await vRes.json();
      setVideo(v);

      // Fetch transcript for caption
      const tRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/transcript/${videoId}`
      );
      if (tRes.ok) {
        const t = await tRes.json();
        setTranscript(t);
        setCaption(t.optimized_text || t.summary || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
    const rawId = params?.videoId;
    if (!rawId) return;
    const videoId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (selectedPlatforms.length === 0) return;

    setPublishing(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: videoId,
          platforms: selectedPlatforms,
          caption_text: caption,
          scheduled_at: scheduleMode && scheduleDate
            ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "發布失敗");
      }

      const data = await res.json();
      setResult(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/videos/${getVideoId()}`} className="text-sm text-blue-600 hover:underline">
          ← 回影片詳情
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h1 className="text-xl font-bold">發布影片</h1>
        <p className="text-sm text-gray-500 mt-1">{video.original_filename}</p>
      </div>

      {result ? (
        <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-green-600">✅ 發布完成</h2>
          {result.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">{r.status === "published" ? "✅" : "❌"}</span>
              <span className="font-medium capitalize">{r.platform}</span>
              <span className="text-sm text-gray-500">{r.status === "published" ? "已發布" : "失敗"}</span>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline ml-auto">
                  檢視
                </a>
              )}
            </div>
          ))}
          <Link
            href={`/dashboard/videos/${getVideoId()}`}
            className="block text-center text-blue-600 hover:underline text-sm mt-4"
          >
            回到影片詳情
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
            <h2 className="font-bold">選擇發布平台</h2>
            <div className="space-y-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedPlatforms.includes(p.id)
                      ? "bg-blue-50 border-blue-300"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto">
                    {selectedPlatforms.includes(p.id) ? "✅" : "☐"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Toggle */}
          <div className="bg-white rounded-xl border p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">⏰ 排程發布</h2>
              <button
                onClick={() => setScheduleMode(!scheduleMode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  scheduleMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {scheduleMode ? "關閉排程" : "設定排程"}
              </button>
            </div>
            {scheduleMode && (
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">日期</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={scheduleMode}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">時間</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6 shadow-sm space-y-3">
            <h2 className="font-bold">發布文案</h2>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入發布文案..."
            />
            <p className="text-xs text-gray-400">{caption.length} 字元</p>
          </div>

          <button
            onClick={handlePublish}
            disabled={publishing || selectedPlatforms.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {publishing
              ? "發布中..."
              : `📤 發布到 ${selectedPlatforms.length} 個平台`}
          </button>
        </>
      )}
    </div>
  );
}
