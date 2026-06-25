/**
 * 通用媒體代理下載端點
 * 解決跨域 CDN 無法直接下載的問題
 * 支援 YouTube、小紅書、Facebook 等平台
 * GET /api/tools/download?url=https://...
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(JSON.stringify({ error: "缺少 url 參數" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.length > 2000) {
    return new Response(JSON.stringify({ error: "URL 過長" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // validate

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0 Safari/537.36",
        Referer: "https://www.xiaohongshu.com/",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `遠端錯誤 (${response.status})` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // Determine filename
    let filename = "download";
    if (contentType.startsWith("video/")) filename = "video.mp4";
    else if (contentType.startsWith("image/")) {
      const ext = contentType.split("/").pop() || "jpg";
      filename = `image.${ext}`;
    } else if (contentType.startsWith("audio/")) {
      const ext = contentType.split("/").pop() || "mp3";
      filename = `audio.${ext}`;
    }

    // Try to extract better filename from URL
    const urlMatch = targetUrl.match(/\/([^/?]+)\.([a-z0-9]+)(?:\?|$)/i);
    if (urlMatch) {
      filename = `download_${urlMatch[1].slice(0, 20)}.${urlMatch[2]}`;
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "public, max-age=86400");

    // Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, { headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "代理下載失敗：" + (err?.message || "未知錯誤") }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
