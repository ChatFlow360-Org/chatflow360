import type { PostChatSettings } from "@/lib/widget/post-chat";

interface Message {
  senderType: string;
  content: string;
  createdAt: string;
}

interface TranscriptEmailParams {
  settings: Required<PostChatSettings>;
  messages: Message[];
  visitorName: string;
  orgName: string;
  aiAgentName: string | null;
  lang: "en" | "es";
}

/**
 * Renders a branded HTML email for conversation transcripts.
 * Uses PostChatSettings for all customizable fields.
 */
export function renderTranscriptEmail({
  settings,
  messages,
  visitorName,
  orgName,
  aiAgentName,
  lang,
}: TranscriptEmailParams): { subject: string; html: string } {
  const isEs = lang === "es";
  const dateStr = new Date().toLocaleDateString(isEs ? "es" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Resolve template variables
  const resolve = (tpl: string) =>
    tpl
      .replace(/\{\{visitor_name\}\}/g, visitorName)
      .replace(/\{\{org_name\}\}/g, orgName)
      .replace(/\{\{date\}\}/g, dateStr);

  const subject = resolve(isEs ? settings.emailSubjectEs : settings.emailSubjectEn);
  const greeting = resolve(isEs ? settings.emailGreetingEs : settings.emailGreetingEn);
  const closing = resolve(isEs ? settings.emailClosingEs : settings.emailClosingEn);
  const footer = resolve(isEs ? settings.emailFooterTextEs : settings.emailFooterTextEn);
  const headerColor = settings.emailHeaderColor || "#1c2e47";

  // Build messages HTML
  const visitorColor = "#2f92ad";
  const messagesHtml = messages
    .map((m) => {
      const isVisitor = m.senderType === "visitor";
      const isAgent = m.senderType === "agent";
      const aiLabel = aiAgentName ? `${aiAgentName} (${isEs ? "IA" : "AI"})` : (isEs ? "IA" : "AI");
      const label = isVisitor ? visitorName : (isAgent ? (isEs ? "Agente" : "Agent") : aiLabel);
      const bgColor = isVisitor ? "#f0f4f8" : "#ffffff";
      const avatarBg = isVisitor ? visitorColor : headerColor;
      const avatarText = isVisitor ? visitorName.charAt(0).toUpperCase() : (isEs ? "IA" : "AI");
      const time = new Date(m.createdAt).toLocaleTimeString(isEs ? "es" : "en", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <tr>
          <td style="padding:6px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${bgColor};border-radius:8px;padding:12px 16px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:28px;height:28px;border-radius:50%;background:${avatarBg};color:#ffffff;font-size:11px;font-weight:700;text-align:center;vertical-align:middle;line-height:28px;" width="28" height="28">${escapeHtml(avatarText)}</td>
                      <td style="padding-left:10px;vertical-align:middle;">
                        <span style="font-size:12px;font-weight:600;color:#374151;">${escapeHtml(label)}</span>
                        <span style="font-size:11px;font-weight:400;color:#9ca3af;padding-left:6px;">${time}</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:6px 0 0 38px;font-size:14px;color:#1f2937;line-height:1.5;">${escapeHtml(m.content)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const logoHtml = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(orgName)}" style="max-height:80px;max-width:260px;" />`
    : `<span style="font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(orgName)}</span>`;

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
            <td style="background:${headerColor};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              ${logoHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1f2937;line-height:1.5;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${isEs ? "Aqu\u00ed tienes la transcripci\u00f3n de tu conversaci\u00f3n:" : "Here is your conversation transcript:"}</p>
              <!-- Messages -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${messagesHtml}
              </table>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.5;">${escapeHtml(closing)}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${escapeHtml(footer)}</p>
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
