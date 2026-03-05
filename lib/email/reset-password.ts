/**
 * Branded bilingual HTML email for password reset.
 * Uses the same visual style as the transcript email.
 */

interface ResetPasswordEmailParams {
  resetUrl: string;
  lang: "en" | "es";
}

export function renderResetPasswordEmail({
  resetUrl,
  lang,
}: ResetPasswordEmailParams): { subject: string; html: string } {
  const isEs = lang === "es";

  const subject = isEs
    ? "Restablece tu contraseña — ChatFlow360"
    : "Reset your password — ChatFlow360";

  const heading = isEs ? "Restablecer contraseña" : "Reset your password";

  const body = isEs
    ? "Recibimos una solicitud para restablecer la contraseña de tu cuenta de ChatFlow360. Haz clic en el botón de abajo para crear una nueva contraseña."
    : "We received a request to reset the password for your ChatFlow360 account. Click the button below to create a new password.";

  const buttonText = isEs ? "Restablecer contraseña" : "Reset Password";

  const expiry = isEs
    ? "Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo."
    : "This link expires in 1 hour. If you didn\u2019t request this, you can safely ignore this email.";

  const footer = isEs
    ? "\u00a9 2026 ChatFlow360. Todos los derechos reservados."
    : "\u00a9 2026 ChatFlow360. All rights reserved.";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#fafcfe;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              <img src="https://app.chatflow360.com/logo.png" alt="ChatFlow360" style="max-height:80px;max-width:260px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1f2937;text-align:center;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;text-align:center;">${body}</p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <a href="${escapeHtml(resetUrl)}" target="_blank" style="display:inline-block;background:#2f92ad;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;text-align:center;">${expiry}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
