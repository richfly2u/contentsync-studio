import * as ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const qualityLabels: Record<number, string> = {
  2160: "4K",
  1440: "2K",
  1080: "1080p",
  720: "720p",
  480: "480p",
  360: "360p",
  240: "240p",
  144: "144p",
};

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

    // Try generic yt-dlp for other platforms (Facebook, TikTok, etc.)
    return await handleGeneric(url);
  } catch (e: any) {
    return Response.json({ success: false, error: e?.message || "解析失敗" }, { status: 500 });
  }
}

async function handleYouTube(url: string) {
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    return Response.json({ success: false, error: "無效的 YouTube 連結" }, { status: 400 });
  }

  const info = await ytdl.getInfo(url, { requestOptions: { headers: { "Accept-Language": "zh-TW" } } });
  const formats = info.formats;
  const videoDetails = info.videoDetails;

  // Build video format options
  const videoFormats: any[] = [];
  const seenHeights = new Set<number>();

  // Separate formats by type
  const combinedFormats = formats.filter(
    (f: any) => f.hasVideo && f.hasAudio && f.container === "mp4"
  );
  const videoOnlyFormats = formats.filter(
    (f: any) => f.hasVideo && !f.hasAudio
  );

  // Process combined first (sorted by quality desc)
  for (const f of [...combinedFormats, ...videoOnlyFormats].sort((a, b) => (b.height || 0) - (a.height || 0))) {
    const height = f.height || 0;
    if (seenHeights.has(height)) continue;
    seenHeights.add(height);

    const label = qualityLabels[height] || `${height}p`;
    const sizeMb = f.contentLength
      ? (Number(f.contentLength) / 1024 / 1024).toFixed(1) + " MB"
      : "?";

    videoFormats.push({
      quality: label,
      height,
      url: f.url,
      size_mb: sizeMb,
      ext: f.container || "mp4",
      has_audio: f.hasAudio || false,
      has_video: true,
    });
  }

  // Build audio format options
  const audioFormats: any[] = [];
  const audioOnly = formats
    .filter((f: any) => f.hasAudio && !f.hasVideo && f.audioBitrate)
    .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

  const seenBitrates = new Set<number>();
  for (const f of audioOnly) {
    const br = f.audioBitrate || 0;
    if (seenBitrates.has(br)) continue;
    seenBitrates.add(br);

    const sizeMb = f.contentLength
      ? (Number(f.contentLength) / 1024 / 1024).toFixed(1) + " MB"
      : "?";

    audioFormats.push({
      quality: `${br} kbps`,
      bitrate: br,
      url: f.url,
      size_mb: sizeMb,
      ext: f.container || "m4a",
    });

    if (audioFormats.length >= 3) break;
  }

  const duration = parseInt(videoDetails.lengthSeconds || "0", 10);
  const thumbnail = videoDetails.thumbnails?.sort((a, b) => b.width - a.width)[0]?.url ||
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return Response.json({
    success: true,
    title: videoDetails.title || "YouTube 影片",
    thumbnail,
    duration_seconds: duration,
    duration_formatted: formatDuration(duration),
    platform: "YouTube",
    type: "video",
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

  // Transform xhs-html-downloader API response to our frontend format
  const images = (data.images || []).map((img: any) => ({
    url: img.downloadUrl || img.directUrl || img.previewUrl || "",
    width: img.width || 0,
    height: img.height || 0,
  }));

  const videoUrl = data.video?.downloadUrl || data.video?.directUrl || null;

  return Response.json({
    success: true,
    title: data.title || "小紅書筆記",
    description: data.description || "",
    thumbnail: data.cover || (images[0]?.url) || "",
    platform: "小紅書",
    type: videoUrl ? "video" : "images",
    images,
    videoUrl,
    imageCount: images.length,
    totalImages: images.length,
  });
}

async function handleGeneric(url: string) {
  // For Facebook, TikTok, Bilibili, etc. — try yt-dlp via distube
  try {
    const info = await ytdl.getInfo(url, { requestOptions: { headers: { "Accept-Language": "zh-TW" } } });
    const videoDetails = info.videoDetails;
    const duration = parseInt(videoDetails.lengthSeconds || "0", 10);
    const thumbnail = videoDetails.thumbnails?.sort((a, b) => b.width - a.width)[0]?.url || "";

    return Response.json({
      success: true,
      title: videoDetails.title || "影片",
      thumbnail,
      duration_seconds: duration,
      duration_formatted: formatDuration(duration),
      platform: "通用",
      type: "video",
      videoUrl: info.formats?.filter((f: any) => f.hasVideo && f.hasAudio)?.[0]?.url || "",
    });
  } catch (e: any) {
    return Response.json({
      success: false,
      error: `暫不支援此平台或無法解析：${e?.message || "未知錯誤"}`,
    }, { status: 400 });
  }
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
