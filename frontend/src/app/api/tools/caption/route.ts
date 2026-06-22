import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ success: false, error: "缺少 URL" }, { status: 400 });

    // 判斷平台
    const isXiaohongshu = url.includes("xiaohongshu.com") || url.includes("xhslink.com") || url.includes("rednote");
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    if (isXiaohongshu) {
      // 用已有的 xhs-html-downloader API
      const res = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) {
        return NextResponse.json({ success: false, error: "小紅書解析失敗" });
      }
      return NextResponse.json({
        success: true,
        title: data.data.title || "小紅書筆記",
        captions_cleaned: data.data.description || "",
        captions_raw: data.data.description || "",
        duration_seconds: null,
        images: data.data.images || [],
        videoUrl: data.data.videoUrl,
      });
    }

    if (isYouTube) {
      // YouTube: 用 youtubei 內建字幕 API
      try {
        const videoId = extractYouTubeId(url);
        if (!videoId) throw new Error("無法解析 YouTube ID");

        // 呼叫 transcript API (youtubetranscript.com)
        const transRes = await fetch(`https://youtubetranscript.com/?v=${videoId}`);
        const transText = await transRes.text();

        // 嘗試用字幕 API
        const captionRes = await fetch(
          `https://youtubei.googleapis.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId,
              context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00" } },
            }),
          }
        );
        const videoInfo = await captionRes.json();
        const title = videoInfo?.videoDetails?.title || "YouTube 影片";

        // 獲取標題和描述
        return NextResponse.json({
          success: true,
          title,
          captions_raw: transText || "無法提取字幕（可能無字幕）",
          captions_cleaned: transText || "無法提取字幕（可能無字幕）",
          duration_seconds: parseInt(videoInfo?.videoDetails?.lengthSeconds || "0"),
        });
      } catch (ytErr: any) {
        return NextResponse.json({
          success: true,
          title: "YouTube 影片",
          captions_raw: "YouTube 字幕提取可能需要更長時間。請稍後再試。",
          captions_cleaned: "YouTube 字幕提取可能需要更長時間。請稍後再試。",
          duration_seconds: null,
        });
      }
    }

    // 其他平台：嘗試用 xhs-html-downloader 的通用 parser
    try {
      const res = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        return NextResponse.json({
          success: true,
          title: data.data.title || "內容",
          captions_cleaned: data.data.description || "",
          captions_raw: data.data.description || "",
          duration_seconds: null,
        });
      }
    } catch {}

    return NextResponse.json({
      success: false,
      error: `暫不支援此平台。目前支援：小紅書、YouTube`,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "未知錯誤" }, { status: 500 });
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
