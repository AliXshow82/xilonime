const RESEND_API_URL = 'https://api.resend.com/emails';

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function canSendEmail() {
  return !!resendConfig();
}

export async function sendSignupCode({ email, name, code }) {
  const config = resendConfig();
  if (!config) throw new Error('Email service is not configured');
  const appUrl = process.env.XILONIME_PUBLIC_URL || 'https://xilonime.ir';
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: 'Xilonimeh verification code',
      text: `Hi ${name || 'Xilonimeh user'},\n\nYour Xilonimeh verification code is: ${code}\n\nThis code expires in 10 minutes.\n${appUrl}\n`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#1d1d1f">
        <h2>Xilonimeh verification</h2>
        <p>Hi ${escapeHtml(name || 'Xilonimeh user')},</p>
        <p>Your verification code is:</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#ff6a00">${escapeHtml(code)}</p>
        <p>This code expires in 10 minutes.</p>
        <p><a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a></p>
      </div>`
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Email service request failed');
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}
