/**
 * Detect if a visitor message triggers human handoff.
 * Case-insensitive partial match against configured keywords.
 */
export function detectHandoff(
  message: string,
  keywords: string[],
  handoffEnabled: boolean
): boolean {
  if (!handoffEnabled || keywords.length === 0) {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * Default message sent when handoff is triggered.
 */
export function getHandoffMessage(lang: string = "en"): string {
  if (lang === "es") {
    return "Te estoy conectando con un agente humano. Por favor espera un momento.";
  }
  return "I'm connecting you with a human agent. Please wait a moment.";
}
