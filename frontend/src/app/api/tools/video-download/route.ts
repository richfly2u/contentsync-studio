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

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return await handleYouTube(url);
    }

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
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    return Response.json({ success: false, error: "無效的 YouTube 連結" }, { status: 400 });
  }

  const info = await yt.getInfo(videoId);
  const formats = info.streaming_data?.formats || [];
  const adaptive = info.streaming_data?.adaptive_formats || [];

  // Build video format options (with both video+audio)
  const videoFormats: any[] = [];
  const combinedFormats = formats.filter((f: any) => f.mime_type?.includes("mp4") && f.has_audio && f.has_video);

  // Quality labels mapping
  const qualityLabels: Record<string, string> = {
    "2160": "4K",
    "1440": "2K",
    "1080": "1080p",
    "720": "720p",
    "480": "480p",
    "360": "360p",
    "240": "240p",
    "144": "144p",
  };

  for (const f of combinedFormats) {
    const height = f.height || 0;
    const label = qualityLabels[String(height)] || `${height}p`;
    const url = await f.decipher(yt.session.player);
    const sizeMb = f.content_length ? (Number(f.content_length) / 1024 / 1024).toFixed(1) : "?";
    videoFormats.push({
      quality: label,
      height,
      url,
      size_mb: sizeMb + " MB",
      ext: "mp4",
      has_audio: true,
      has_video: true,
    });
  }

  // Also extract video-only formats for higher qualities (1080p+)
  const videoOnlyFormats = adaptive
    .filter((f: any) => f.mime_type?.includes("mp4") && !f.has_audio && f.has_video)
    .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

  const seenHeights = new Set(videoFormats.map((f: any) => f.height));
  for (const f of videoOnlyFormats) {
    const height = f.height || 0;
    if (seenHeights.has(height)) continue;
    seenHeights.add(height);

    const label = qualityLabels[String(height)] || `${height}p`;
    const url = await f.decipher(yt.session.player);
    const sizeMb = f.content_length ? (Number(f.content_length) / 1024 / 1024).toFixed(1) : "?";
    videoFormats.push({
      quality: label,
      height,
      url,
      size_mb: sizeMb + " MB",
      ext: "mp4",
      has_audio: false,
      has_video: true,
    });
  }

  // Sort by quality descending
  videoFormats.sort((a: any, b: any) => b.height - a.height);

  // Build audio format options
  const audioFormats: any[] = [];
  const audioOnly = adaptive
    .filter((f: any) => f.mime_type?.includes("mp4") && f.has_audio && !f.has_video)
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

  for (const f of audioOnly.slice(0, 3)) {
    const url = await f.decipher(yt.session.player);
    const bitrateKbps = f.bitrate ? Math.round(f.bitrate / 1000) : 0;
    const sizeMb = f.content_length ? (Number(f.content_length) / 1024 / 1024).toFixed(1) : "?";
    audioFormats.push({
      quality: bitrateKbps >= 128 ? `${bitrateKbps} kbps` : `${bitrateKbps} kbps`,
      bitrate: bitrateKbps,
      url,
      size_mb: sizeMb + " MB",
      ext: "m4a",
    });
  }

  // Thumbnail
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return Response.json({
    success: true,
    title: info.basic_info?.title || "YouTube 影片",
    thumbnail,
    duration_seconds: info.basic_info?.duration || 0,
    duration_formatted: formatDuration(info.basic_info?.duration || 0),
    platform: "YouTube",
    videoFormats,
    audioFormats,
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
