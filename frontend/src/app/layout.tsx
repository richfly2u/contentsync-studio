import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentSync Studio",
  description: "AI-powered creator content management. Transcribe, optimize, and publish across platforms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
