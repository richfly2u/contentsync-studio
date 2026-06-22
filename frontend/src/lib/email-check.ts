// Comprehensive disposable email domain list
// Source: ChatGPT survey + community-maintained lists
const DISPOSABLE_DOMAINS = new Set([
  // ── 10分鐘/短時間臨時信箱 ──
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "10minemail.com", "10minemail.net", "10minemail.org",
  "5minmail.com", "5minmail.net",
  "minuteinbox.com",
  "throwawaymail.app", "throwawaymail.com",
  "tempail.com",
  "mail.gw",

  // ── 一般臨時信箱 ──
  "temp-mail.org", "temp-mail.net", "temp-mail.io",
  "tempmail.ing", "tempmail.lol", "tempmailg.com",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz",
  "mailinator.com", "mailinator.net", "mailinator.org",
  "mailinator2.com",
  "yopmail.com", "yopmail.net", "yopmail.fr",
  "sharklasers.com",
  "trashmail.ws", "trashmail.com", "trashmail.net",
  "maildrop.cc",
  "getnada.com", "nada.email",

  // ── 臨時信箱（可選網域型） ──
  "emailfake.com", "fakemailgenerator.com",
  "tempmail.com", "tempmail.net", "tempmail.org",
  "disposablemail.com",
  "mailsac.com", "mailsac.net",
  "mintemail.com",
  "mohmal.com",
  "muellmail.com",
  "smail.pw",
  "tmailor.com",
  "inboxes.com",
  "mailnesia.com",

  // ── 公開收件匣型（高隱私風險） ──
  "dropmail.me",
  "crazymailing.com",
  "burnermail.io", "burnermailbox.com",

  // ── 轉寄/匿名轉發型 ──
  "33mail.com",
  "addy.io",
  "simplelogin.io",

  // ── 其他常見 ──
  "spambox.us", "spambox.me",
  "dispostable.com",
  "mailexpire.com",
  "mailnator.com",
  "sogetthis.com",
  "spamgourmet.com", "spamgourmet.net",
  "jetable.org", "jetable.net",
  "emailondeck.com", "emailondeck.net",
  "mailmetrash.com",
  "maileater.com",
  "spamthis.co.uk",
  "thankyou2010.com",
  "trash2009.com",
  "tyldd.com",
  "uggsrock.com",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "wh4f.org",
  "whyspam.me",
  "willselfdestruct.com",
  "winemaven.info",
  "wronghead.com",
  "wuzup.net",
  "xagloo.com",
  "xemaps.com",
  "xents.com",
  "xmaily.com",
  "xoxy.net",
  "yep.it",
  "yogamaven.com",
  "ypmail.webarnak.fr.eu.org",
  "yuurok.com",
  "zehnminutenmail.de",
  "zippymail.info",
  "zoaxe.com",
  "zoemail.org",

  // ── 其他短暫信箱 ──
  "mailnator.com",
  "mt2009.com",
  "trashymail.com",

  // ── AdGuard 臨時信箱 ──
  "adguard.com",

  // ── Internxt 臨時信箱 ──
  "internxt.com",
]);

// Quick local check (synchronous, no API call)
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

// Full check: local list + API verification
export async function checkEmailDisposable(email: string): Promise<{ disposable: boolean; reason?: string }> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { disposable: false };

  // 1. Local check (instant)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { disposable: true, reason: "臨時信箱（黑名單比對）" };
  }

  // 2. API check via Disify (backup)
  try {
    const res = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.disposable) {
        return { disposable: true, reason: "臨時信箱（API 驗證）" };
      }
    }
  } catch {
    // API failure — fall through, allow registration
  }

  return { disposable: false };
}
