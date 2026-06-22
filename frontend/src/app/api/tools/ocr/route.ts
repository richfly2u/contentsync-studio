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

    const { url: imageUrl } = body;
    if (!imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "缺少圖片 URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          text: "OCR 功能需要設定 OPENAI_API_KEY 環境變數才能使用。請在 Vercel 專案設定中加入。",
          language_detected: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "你是專業的文字辨識助手。請從圖片中提取所有可見的文字內容。如果文字是中文，保留繁體/簡體原貌。輸出純文字，不要 markdown 格式，不要添加任何說明。如果圖片中沒有文字，輸出「未偵測到文字」。",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "請辨識這張圖片中的所有文字" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ success: true, text, language_detected: "auto" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, text: "", error: `OCR 失敗：${e.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
