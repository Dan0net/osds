/**
 * Shared HTML email template with OSDS branding.
 * Used by both notification emails (via notify.js) and Supabase auth email templates.
 *
 * @param {string} title - Email heading
 * @param {string[]} bodyParagraphs - Array of paragraph strings
 * @param {string} [ctaText] - Button label
 * @param {string} [ctaUrl] - Button link
 * @param {string} [footerHtml] - Custom footer HTML (defaults to notification preferences link)
 */
export function emailTemplate(title, bodyParagraphs, ctaText, ctaUrl, footerHtml) {
  const siteUrl = (typeof process !== 'undefined' && process.env?.SITE_URL) || 'https://onestopdog.shop'
  const ctaHtml = ctaText && ctaUrl
    ? `<div style="text-align:center;margin:24px 0"><a href="${ctaUrl}" style="background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${ctaText}</a></div>`
    : ''

  const footer = footerHtml !== undefined
    ? footerHtml
    : `<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px"><a href="${siteUrl}/account/notifications" style="color:#9ca3af;text-decoration:underline">Manage your notification preferences</a></p>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px">
    <div style="text-align:center;padding:16px 0">
      <a href="${siteUrl}"><img src="${siteUrl}/osds-logo-512.png" alt="One Stop Dog Shop" width="256" style="width:256px;height:auto" /></a>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">${title}</h2>
      ${bodyParagraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.5">${p}</p>`).join('')}
      ${ctaHtml}
    </div>
    ${footer}
  </div>
</body>
</html>`
}
