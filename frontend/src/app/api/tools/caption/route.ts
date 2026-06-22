export const runtime = "edge";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "無效的 JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { url } = body;
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "缺少 URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isXiaohongshu = url.includes("xiaohongshu.com") || url.includes("xhslink.com") || url.includes("rednote");
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    if (isXiaohongshu) {
      const parseRes = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await parseRes.json();
      if (!data.success) {
        return new Response(JSON.stringify({ success: false, error: "小紅書解析失敗" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          title: data.data.title || "小紅書筆記",
          captions_cleaned: data.data.description || "",
          captions_raw: data.data.description || "",
          duration_seconds: null,
          images: data.data.images || [],
          videoUrl: data.data.videoUrl,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
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
        let duration: number | null = null;
        if (infoRes && infoRes.ok) {
          const info = await infoRes.json();
          title = info?.videoDetails?.title || title;
          const secs = parseInt(info?.videoDetails?.lengthSeconds || "0", 10);
          duration = secs || null;
        }

        return new Response(
          JSON.stringify({
            success: true,
            title,
            captions_raw: transText || "此影片無可用字幕",
            captions_cleaned: transText || "此影片無可用字幕",
            duration_seconds: duration,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({
            success: true,
            title: "YouTube 影片",
            captions_raw: "YouTube 字幕提取失敗，請稍後再試",
            captions_cleaned: "YouTube 字幕提取失敗，請稍後再試",
            duration_seconds: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Other platforms
    try {
      const parseRes = await fetch("https://xhs-html-downloader.vercel.app/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await parseRes.json();
      if (data.success) {
        return new Response(
          JSON.stringify({
            success: true,
            title: data.data.title || "內容",
            captions_cleaned: data.data.description || "",
            captions_raw: data.data.description || "",
            duration_seconds: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: "暫不支援此平台。目前支援：小紅書、YouTube",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
