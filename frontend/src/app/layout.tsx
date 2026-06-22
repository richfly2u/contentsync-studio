import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-context";

export const metadata: Metadata = {
  title: "ContentSync Studio — 影片文案提取、下載、AI 發布工具",
  description: "支援 50+ 平臺影片文案提取、影片下載、轉音頻、圖片文字辨識。免費在線使用。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
