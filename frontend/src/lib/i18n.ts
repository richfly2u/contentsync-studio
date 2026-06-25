type Lang = "en" | "zh-TW" | "zh-CN" | "ja" | "ko";

type TValue = string | ((...args: any[]) => string);

const translations: Record<Lang, Record<string, TValue>> = {
  "en": {
    brand: "ContentSync",
    tag: "FREE ONLINE TOOL",
    untitled: "Untitled",
    headline1: "Video & Media",
    headline2: "Downloader",
    desc: "Download videos from YouTube, Xiaohongshu, TikTok and more. Free, fast, no registration required.",
    input_placeholder: "Paste video link here...",
    download_btn: "Download",
    paste_btn: "Paste",
    processing: "Processing",
    fetching_formats: "Fetching available formats...",
    audio: "Audio",
    video: "Video",
    tools: "Advanced Tools",
    extract_caption: "📝 Caption",
    extract_audio: "🎵 Audio",
    ocr: "📷 OCR",
    caption_done: "Caption extracted",
    audio_done: "Audio extracted",
    ocr_done: "OCR complete",
    copy_text: "📋 Copy Text",
    download_audio: "⬇️ Download MP3",
    no_text: "No content",
    history: "History",
    clear: "Clear",
    no_history: "No history yet",
    supported_platforms: "Supported Platforms",
    login: "Login",
    remaining: (n: number) => `${n} free downloads remaining`,
    exhausted: "Free trials exhausted, please register",
    upgrade_title: "Free trials exhausted",
    upgrade_desc: "Register for unlimited downloads",
    upgrade_btn: "Register Free →",
    terms: "By using our service you accept our Terms of Service.",
    download_video: (size?: string) => size ? `Download Video (${size})` : "Download Video (Best Quality)",
    footer: "ContentSync Studio © 2026 — For personal study and research use only",
    error_title: "Parse failed",
    download: "Download",
  },
  "zh-TW": {
    brand: "ContentSync",
    tag: "免費線上工具",
    untitled: "未命名",
    headline1: "影片與媒體",
    headline2: "下載器",
    desc: "從 YouTube、小紅書、TikTok 等平台下載影片。免費、快速、無需註冊。",
    input_placeholder: "貼上影片連結...",
    download_btn: "下載",
    paste_btn: "粘貼",
    processing: "處理中",
    fetching_formats: "正在獲取可用格式...",
    audio: "音訊",
    video: "影片",
    tools: "進階工具",
    extract_caption: "📝 提取文案",
    extract_audio: "🎵 下載音訊",
    ocr: "📷 OCR 辨識",
    caption_done: "文案提取完成",
    audio_done: "音訊提取完成",
    ocr_done: "OCR 辨識完成",
    copy_text: "📋 複製文字",
    download_audio: "⬇️ 下載 MP3",
    no_text: "無文字內容",
    history: "紀錄",
    clear: "清除",
    no_history: "尚無紀錄",
    supported_platforms: "支援平台",
    login: "登入",
    remaining: (n: number) => `剩餘 ${n} 次免費下載`,
    exhausted: "次數已用完，請註冊",
    upgrade_title: "免費試用次數已用完",
    upgrade_desc: "註冊後可無限次下載",
    upgrade_btn: "免費註冊 →",
    terms: "使用服務即表示您接受我們的使用條款。",
    download_video: (size?: string) => size ? `下載影片 (${size})` : "下載影片 (最佳品質)",
    footer: "ContentSync Studio © 2026 — 僅供個人學習與研究用途",
    error_title: "解析未完成",
    download: "下載",
  },
  "zh-CN": {
    brand: "ContentSync",
    tag: "免费在线工具",
    untitled: "未命名",
    headline1: "视频与媒体",
    headline2: "下载器",
    desc: "从 YouTube、小红书、TikTok 等平台下载视频。免费、快速、无需注册。",
    input_placeholder: "粘贴视频链接...",
    download_btn: "下载",
    paste_btn: "粘贴",
    processing: "处理中",
    fetching_formats: "正在获取可用格式...",
    audio: "音频",
    video: "视频",
    tools: "高级工具",
    extract_caption: "📝 提取文案",
    extract_audio: "🎵 下载音频",
    ocr: "📷 OCR 识别",
    caption_done: "文案提取完成",
    audio_done: "音频提取完成",
    ocr_done: "OCR 识别完成",
    copy_text: "📋 复制文字",
    download_audio: "⬇️ 下载 MP3",
    no_text: "无文字内容",
    history: "记录",
    clear: "清除",
    no_history: "暂无记录",
    supported_platforms: "支持平台",
    login: "登录",
    remaining: (n: number) => `剩余 ${n} 次免费下载`,
    exhausted: "次数已用完，请注册",
    upgrade_title: "免费试用次数已用完",
    upgrade_desc: "注册后可无限次下载",
    upgrade_btn: "免费注册 →",
    terms: "使用服务即表示您接受我们的使用条款。",
    download_video: (size?: string) => size ? `下载视频 (${size})` : "下载视频 (最佳品质)",
    footer: "ContentSync Studio © 2026 — 仅供个人学习与研究用途",
    error_title: "解析未完成",
    download: "下载",
  },
  "ja": {
    brand: "ContentSync",
    tag: "無料オンラインツール",
    untitled: "無題",
    headline1: "動画・メディア",
    headline2: "ダウンローダー",
    desc: "YouTube、Xiaohongshu、TikTokなどから動画をダウンロード。無料、高速、登録不要。",
    input_placeholder: "動画リンクを貼り付け...",
    download_btn: "ダウンロード",
    paste_btn: "貼り付け",
    processing: "処理中",
    fetching_formats: "形式を取得中...",
    audio: "音声",
    video: "動画",
    tools: "高度なツール",
    extract_caption: "📝 字幕",
    extract_audio: "🎵 音声",
    ocr: "📷 OCR",
    caption_done: "字幕を抽出しました",
    audio_done: "音声を抽出しました",
    ocr_done: "OCR 完了",
    copy_text: "📋 コピー",
    download_audio: "⬇️ MP3をダウンロード",
    no_text: "コンテンツがありません",
    history: "履歴",
    clear: "クリア",
    no_history: "履歴がありません",
    supported_platforms: "対応プラットフォーム",
    login: "ログイン",
    remaining: (n: number) => `残り ${n} 回の無料ダウンロード`,
    exhausted: "無料回数を使い切りました",
    upgrade_title: "無料トライアル終了",
    upgrade_desc: "登録して無制限ダウンロード",
    upgrade_btn: "無料登録 →",
    terms: "本サービスをご利用いただくことで、利用規約に同意したものとみなされます。",
    download_video: (size?: string) => size ? `動画をダウンロード (${size})` : "動画をダウンロード (最高品質)",
    footer: "ContentSync Studio © 2026 — 個人の学習・研究目的のみ",
    error_title: "解析失敗",
    download: "ダウンロード",
  },
  "ko": {
    brand: "ContentSync",
    tag: "무료 온라인 도구",
    untitled: "제목 없음",
    headline1: "비디오 및 미디어",
    headline2: "다운로더",
    desc: "YouTube, Xiaohongshu, TikTok 등에서 동영상을 다운로드하세요. 무료, 빠름, 회원가입 불필요.",
    input_placeholder: "동영상 링크 붙여넣기...",
    download_btn: "다운로드",
    paste_btn: "붙여넣기",
    processing: "처리 중",
    fetching_formats: "사용 가능한 형식을 가져오는 중...",
    audio: "오디오",
    video: "비디오",
    tools: "고급 도구",
    extract_caption: "📝 자막",
    extract_audio: "🎵 오디오",
    ocr: "📷 OCR",
    caption_done: "자막 추출 완료",
    audio_done: "오디오 추출 완료",
    ocr_done: "OCR 완료",
    copy_text: "📋 복사",
    download_audio: "⬇️ MP3 다운로드",
    no_text: "내용 없음",
    history: "기록",
    clear: "지우기",
    no_history: "기록이 없습니다",
    supported_platforms: "지원 플랫폼",
    login: "로그인",
    remaining: (n: number) => `무료 다운로드 ${n}회 남음`,
    exhausted: "무료 횟수를 모두 사용했습니다",
    upgrade_title: "무료 체험 종료",
    upgrade_desc: "가입하면 무제한 다운로드",
    upgrade_btn: "무료 가입 →",
    terms: "서비스를 사용함으로써 이용약관에 동의합니다.",
    download_video: (size?: string) => size ? `동영상 다운로드 (${size})` : "동영상 다운로드 (최고 품질)",
    footer: "ContentSync Studio © 2026 — 개인 학습 및 연구용",
    error_title: "분석 실패",
    download: "다운로드",
  },
};

export type { Lang };

export function getT(lang: Lang) {
  const t = translations[lang] || translations["en"];
  return (key: string, ...args: any[]) => {
    const val = (t as any)[key];
    if (typeof val === "function") return val(...args);
    return val !== undefined ? val : key;
  };
}

export function getLangLabel(lang: Lang): string {
  const labels: Record<Lang, string> = {
    "en": "English",
    "zh-TW": "中文(台灣)",
    "zh-CN": "中文(简体)",
    "ja": "日本語",
    "ko": "한국어",
  };
  return labels[lang] || "English";
}

export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("cs_lang") as Lang | null;
  if (stored && translations[stored]) return stored;
  const nav = navigator.language || (navigator as any).userLanguage || "";
  if (nav.startsWith("zh-TW") || nav.startsWith("zh-HK")) return "zh-TW";
  if (nav.startsWith("zh")) return "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem("cs_lang", lang); } catch {}
}

const platformLabels: Record<string, Record<Lang, string>> = {
  YouTube: { en: "YouTube", "zh-TW": "YouTube", "zh-CN": "YouTube", ja: "YouTube", ko: "YouTube" },
  Xiaohongshu: { en: "Xiaohongshu", "zh-TW": "小紅書", "zh-CN": "小红书", ja: "小紅書", ko: "샤오홍슈" },
  TikTok: { en: "TikTok", "zh-TW": "TikTok", "zh-CN": "TikTok", ja: "TikTok", ko: "TikTok" },
  Bilibili: { en: "Bilibili", "zh-TW": "B站", "zh-CN": "B站", ja: "Bilibili", ko: "Bilibili" },
};

const platformIcons: Record<string, string> = {
  YouTube: "▶️",
  Xiaohongshu: "📕",
  TikTok: "🎵",
  Bilibili: "📺",
};

export function getPlatformLabel(key: string, lang: Lang): string {
  return platformLabels[key]?.[lang] || key;
}

export function getPlatformIcon(key: string): string {
  return platformIcons[key] || "🌐";
}
