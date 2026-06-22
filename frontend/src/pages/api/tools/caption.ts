import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, error: "缺少 URL" });
    }

    const isXiaohongshu = url.includes("xiaohongshu.com") || url.includes("xhslink.com") || url.includes("rednote");
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    if (isXiaohongshu) {
      const parseRes = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await parseRes.json();
      if (!data.success) {
        return res.json({ success: false, error: "小紅書解析失敗" });
      }
      return res.json({
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
      try {
        const videoId = extractYouTubeId(url);
        if (!videoId) throw new Error("無法解析 YouTube ID");

        const [transRes, infoRes] = await Promise.all([
          fetch(`https://youtubetranscript.com/?v=${videoId}`).catch(() => null),
          fetch(
            `https://youtubei.googleapis.com/youtubei/v1/player?key=AIzaSyA...qcW8`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId,
                context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00" } },
              }),
            }
          ).catch(() => null),
        ]);

        const transText = transRes ? await transRes.text() : "";
        let title = "YouTube 影片";
        let duration = null;
        if (infoRes && infoRes.ok) {
          const info = await infoRes.json();
          title = info?.videoDetails?.title || title;
          duration = parseInt(info?.videoDetails?.lengthSeconds || "0") || null;
        }

        return res.json({
          success: true,
          title,
          captions_raw: transText || "此影片無可用字幕",
          captions_cleaned: transText || "此影片無可用字幕",
          duration_seconds: duration,
        });
      } catch (ytErr: any) {
        return res.json({
          success: true,
          title: "YouTube 影片",
          captions_raw: "YouTube 字幕提取失敗，請稍後再試",
          captions_cleaned: "YouTube 字幕提取失敗，請稍後再試",
          duration_seconds: null,
        });
      }
    }

    // 其他平台
    try {
      const parseRes = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await parseRes.json();
      if (data.success) {
        return res.json({
          success: true,
          title: data.data.title || "內容",
          captions_cleaned: data.data.description || "",
          captions_raw: data.data.description || "",
          duration_seconds: null,
        });
      }
    } catch {}

    return res.json({
      success: false,
      error: "暫不支援此平台。目前支援：小紅書、YouTube",
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || "未知錯誤" });
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
