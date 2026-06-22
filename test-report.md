# link2publish.app 部署測試報告

**日期：** 2026-06-22  
**網域：** https://link2publish.app  
**後端：** VPS 108.61.163.87（Caddy → FastAPI）  
**前端：** Vercel（contentsync-studio.vercel.app）  
**SSL：** 自簽憑證（Cloudflare Proxy 處理 HTTPS）

---

## 測試結果

### 前台頁面

| 路徑 | HTTP 狀態 | 結果 |
|:---|:---:|:---:|
| `https://link2publish.app/` | 200 | ✅ |
| `https://link2publish.app/tools` | 200 | ✅ |
| `https://link2publish.app/terms` | 200 | ✅ |
| `https://link2publish.app/dmca` | 200 | ✅ |
| `https://www.link2publish.app/` | 200 | ✅ |

### 後端 API

| 端點 | HTTP 狀態 | 結果 |
|:---|:---:|:---:|
| `POST /api/v1/tools/video-download` | 200 | ✅ 11.3MB MP4 |
| `POST /api/v1/tools/extract-audio` | 200 | ✅ MP3 |
| `POST /api/v1/tools/extract-caption` | 200 | ✅ YT 字幕 |
| `POST /api/v1/tools/ocr` | 200 | ✅（需安裝 tesseract） |

---

## Caddy 設定

```
link2publish.app, www.link2publish.app {
    tls internal

    # API → 後端
    handle /api/* {
        reverse_proxy localhost:8000
    }

    # 其餘 → Vercel 前端
    handle {
        reverse_proxy https://contentsync-studio.vercel.app
    }
}
```

---

## Cloudflare DNS

| 類型 | 名稱 | 值 | Proxy |
|:---|:---|:---|:---:|
| A | `@` | `108.61.163.87` | 🟠 Proxied |
| A | `www` | `108.61.163.87` | 🟠 Proxied |

---

## 功能摘要

| 功能 | 免費（未登入） | 付費（已登入） |
|:---|---:|---:|
| 🎬 影片下載 | 3 次 | ✅ 無限 |
| 📝 文案提取 | ✅ 無限 | ✅ 無限 |
| 🎵 影片轉音頻 | ✅ 無限 | ✅ 無限 |
| 🖼️ OCR | ✅ 無限 | ✅ 無限 |
| 解析歷史（30條） | ✅ | ✅ |
| 臨時信箱封鎖 | ✅ | ✅ |
| Google 登入 | — | ✅ |

---

## 事項

- [ ] Cloudflare SSL/TLS 設定改成 **Full**（目前 Flexible）
- [ ] API 健康檢查 `/api/v1/health` 回傳 404（VPS 後端無此端點）
- [ ] OCR 需在 VPS 安裝 `tesseract-ocr`
- [ ] 後續可升級 Caddy Let's Encrypt（需 Cloudflare DNS challenge）
