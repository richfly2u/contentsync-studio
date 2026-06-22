import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { url: imageUrl } = req.body || {};
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "缺少圖片 URL" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        text: "OCR 功能需要設定 OPENAI_API_KEY 環境變數才能使用。請在 Vercel 專案設定中加入。",
        language_detected: null,
      });
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

    return res.json({
      success: true,
      text,
      language_detected: "auto",
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, text: "", error: `OCR 失敗：${e.message}` });
  }
}
