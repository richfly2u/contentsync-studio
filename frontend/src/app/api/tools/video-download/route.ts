import { Innertube } from "youtubei.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url: string = body.url?.trim();

    if (!url) {
      return Response.json({ success: false, error: "請提供影片連結" }, { status: 400 });
    }

    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return await handleYouTube(url);
    }

    // Xiaohongshu (小紅書) — proxy to existing API
    if (url.includes("xiaohongshu") || url.includes("xhslink") || url.includes("rednote")) {
      return await handleXiaohongshu(url);
    }

    return Response.json({ success: false, error: "暫不支援此平台" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message || "解析失敗" }, { status: 500 });
  }
}

async function handleYouTube(url: string) {
  const yt = await Innertube.create();

  // Extract video ID
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    return Response.json({ success: false, error: "無效的 YouTube 連結" }, { status: 400 });
  }

  // Get video info
  const info = await yt.getInfo(videoId);

  // Get the best format
  const formats = info.streaming_data?.formats || [];
  const adaptive = info.streaming_data?.adaptive_formats || [];

  // Find the best MP4 format with video+audio
  let bestVideoUrl = "";
  let bestFormat = formats.find((f: any) =>
    f.mime_type?.includes("mp4") && f.has_audio && f.has_video
  );
  if (!bestFormat) {
    // Fallback to highest quality video-only format
    const videoOnly = adaptive
      .filter((f: any) => f.mime_type?.includes("mp4") && !f.has_audio)
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    if (videoOnly.length > 0) {
      bestVideoUrl = await videoOnly[0].decipher(yt.session.player);
    }
  } else {
    bestVideoUrl = await bestFormat.decipher(yt.session.player);
  }

  // Get thumbnails
  const thumbnails = info.basic_info?.thumbnail?.flatMap((t: any) => t.url ? [{ url: t.url }] : []) || [];
  if (thumbnails.length === 0 && info.basic_info?.thumbnail) {
    thumbnails.push({ url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` });
  }

  return Response.json({
    success: true,
    title: info.basic_info?.title || "YouTube 影片",
    video_url: bestVideoUrl,
    images: thumbnails.slice(0, 1),
    duration_seconds: info.basic_info?.duration || 0,
    platform: "YouTube",
  });
}

async function handleXiaohongshu(url: string) {
  const apiUrl = `https://xhs-html-downloader.vercel.app/api/parse?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl, { cache: "no-store" });

  if (!res.ok) {
    return Response.json({ success: false, error: "小紅書解析失敗" }, { status: 500 });
  }

  const data = await res.json();
  return Response.json(data);
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
