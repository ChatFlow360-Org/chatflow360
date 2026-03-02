/**
 * ChatFlow360 — Embeddable Chat Widget
 * (c) 2026 ChatFlow360. All rights reserved.
 *
 * Embed snippet:
 * <script src="https://app.chatflow360.com/widget/chatflow360.js"
 *   data-key="PUBLIC_KEY" data-lang="en" data-color="#2f92ad" defer></script>
 */
(function () {
  "use strict";

  // ─── Prevent double-init ───────────────────────────────────────────
  if (window.__cf360_loaded) return;
  window.__cf360_loaded = true;

  // ─── Config from script attributes ────────────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("chatflow360.js") !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptTag) return;

  var publicKey = scriptTag.getAttribute("data-key");
  if (!publicKey) {
    console.error("[ChatFlow360] data-key attribute is required.");
    return;
  }

  var primaryColor = scriptTag.getAttribute("data-color") || "#2f92ad";
  var position = scriptTag.getAttribute("data-position") || "right";
  var lang = scriptTag.getAttribute("data-lang") || detectLanguage();

  // Derive API base from script src
  var apiBaseUrl = (function () {
    var src = scriptTag.src || "";
    var idx = src.indexOf("/widget/chatflow360.js");
    if (idx === -1) return ""; // relative (local dev)
    return src.substring(0, idx);
  })();

  // ─── Language detection ───────────────────────────────────────────
  function detectLanguage() {
    var navLang = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return navLang.indexOf("es") === 0 ? "es" : "en";
  }

  // ─── Translations ─────────────────────────────────────────────────
  var translations = {
    en: {
      chatWithUs: "Chat with us",
      typeMessage: "Type a message\u2026",
      send: "Send",
      connecting: "Connecting you with an agent\u2026",
      connectedAgent: "Chatting with a specialized human agent",
      powered: "Powered by",
      newConversation: "New conversation",
      endConversation: "End conversation",
      confirmEnd: "Are you sure you want to end this conversation?",
      yes: "Yes",
      no: "No",
      rateTitle: "How was your experience?",
      rateThanks: "Thanks for your feedback!",
      rateSkip: "Skip",
      transcriptTitle: "Get a transcript via email",
      transcriptName: "Your name",
      transcriptEmail: "Your email",
      transcriptSend: "Send transcript",
      transcriptSkip: "No thanks",
      transcriptSuccess: "Transcript sent! Check your inbox.",
      transcriptError: "Could not send transcript. Please try again.",
      transcriptPhoneCode: "+1",
      transcriptPhoneNumber: "Phone (optional)",
      postChatDone: "Conversation ended"
    },
    es: {
      chatWithUs: "Chatea con nosotros",
      typeMessage: "Escribe un mensaje\u2026",
      send: "Enviar",
      connecting: "Conect\u00e1ndote con un agente\u2026",
      connectedAgent: "Chateando con un agente humano especializado",
      powered: "Impulsado por",
      newConversation: "Nueva conversaci\u00f3n",
      endConversation: "Finalizar conversaci\u00f3n",
      confirmEnd: "\u00bfSeguro que deseas finalizar esta conversaci\u00f3n?",
      yes: "S\u00ed",
      no: "No",
      rateTitle: "\u00bfC\u00f3mo fue tu experiencia?",
      rateThanks: "\u00a1Gracias por tu opinión!",
      rateSkip: "Omitir",
      transcriptTitle: "Recibe la transcripci\u00f3n por email",
      transcriptName: "Tu nombre",
      transcriptEmail: "Tu email",
      transcriptSend: "Enviar transcripci\u00f3n",
      transcriptSkip: "No, gracias",
      transcriptSuccess: "\u00a1Transcripci\u00f3n enviada! Revisa tu bandeja.",
      transcriptError: "No se pudo enviar. Int\u00e9ntalo de nuevo.",
      transcriptPhoneCode: "+1",
      transcriptPhoneNumber: "Tel\u00e9fono (opcional)",
      postChatDone: "Conversaci\u00f3n finalizada"
    }
  };

  function t(key) {
    var dict = translations[lang] || translations.en;
    return dict[key] || key;
  }

  // ─── Visitor ID ───────────────────────────────────────────────────
  var VISITOR_KEY = "cf360_visitor_id";

  function getVisitorId() {
    var id = null;
    try { id = localStorage.getItem(VISITOR_KEY); } catch (e) { /* private browsing */ }
    if (!id) {
      id = generateId();
      try { localStorage.setItem(VISITOR_KEY, id); } catch (e) { /* noop */ }
    }
    return id;
  }

  function generateId() {
    // UUID v4 using crypto.getRandomValues() for secure randomness
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Set version 4 (0100) and variant 10xx per RFC 4122
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = [];
      for (var i = 0; i < 16; i++) {
        hex.push(("0" + bytes[i].toString(16)).slice(-2));
      }
      return (
        hex.slice(0, 4).join("") + "-" +
        hex.slice(4, 6).join("") + "-" +
        hex.slice(6, 8).join("") + "-" +
        hex.slice(8, 10).join("") + "-" +
        hex.slice(10, 16).join("")
      );
    }
    // Fallback for ancient browsers without crypto API
    var d = Date.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  var visitorId = getVisitorId();

  // ─── Conversation persistence ─────────────────────────────────────
  var CONV_KEY = "cf360_conv_" + publicKey;
  var CONV_TS_KEY = "cf360_conv_ts_" + publicKey;
  var VISITOR_INFO_KEY = "cf360_visitor_info";
  var SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

  function getStoredVisitorInfo() {
    try {
      var raw = localStorage.getItem(VISITOR_INFO_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveVisitorInfo(info) {
    try {
      localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify(info));
    } catch (e) { /* noop */ }
  }

  function getConversationId() {
    try { return localStorage.getItem(CONV_KEY) || null; } catch (e) { return null; }
  }

  function setConversationId(id) {
    try {
      localStorage.setItem(CONV_KEY, id);
      localStorage.setItem(CONV_TS_KEY, String(Date.now()));
    } catch (e) { /* noop */ }
  }

  function touchConversationTimestamp() {
    try { localStorage.setItem(CONV_TS_KEY, String(Date.now())); } catch (e) { /* noop */ }
  }

  function clearConversationId() {
    try {
      localStorage.removeItem(CONV_KEY);
      localStorage.removeItem(CONV_TS_KEY);
    } catch (e) { /* noop */ }
  }

  function isSessionExpired() {
    try {
      var ts = localStorage.getItem(CONV_TS_KEY);
      if (!ts) return false;
      return (Date.now() - parseInt(ts, 10)) > SESSION_TIMEOUT_MS;
    } catch (e) { return false; }
  }

  // Check session timeout on init — clear stale conversation
  (function checkSessionTimeout() {
    var staleId = getConversationId();
    if (staleId && isSessionExpired()) {
      closeConversationApi(staleId);
      clearConversationId();
    }
  })();

  // ─── State ────────────────────────────────────────────────────────
  var state = {
    open: false,
    conversationId: getConversationId(),
    sending: false,
    polling: false,
    pollingTimer: null,
    lastMessageId: null,
    resolved: false,
    realtimeConfig: null,
    postChatConfig: null, // fetched from /api/widget/config
    contactName: null
  };

  // ─── Realtime Typing via Supabase Broadcast (Phoenix Channels) ──
  var realtime = {
    ws: null,
    ref: 0,
    heartbeatTimer: null,
    channelJoined: false,
    typingTimeout: null,
    lastTypingSent: 0,
    THROTTLE_MS: 2000,
    TYPING_TIMEOUT_MS: 3000
  };

  function rtConnect(config) {
    if (!config || !config.url || !config.key || !config.channel) return;
    state.realtimeConfig = config;

    try {
      var wsUrl = config.url.replace(/^http/, "ws") +
        "/realtime/v1/websocket?apikey=" + config.key + "&vsn=1.0.0";
      var ws = new WebSocket(wsUrl);
      realtime.ws = ws;

      ws.onopen = function () {
        // Send access_token (required by Supabase Realtime before any channel ops)
        realtime.ref++;
        ws.send(JSON.stringify({
          topic: "realtime:system",
          event: "access_token",
          payload: { access_token: config.key },
          ref: String(realtime.ref)
        }));

        // Join the typing channel
        realtime.ref++;
        ws.send(JSON.stringify({
          topic: "realtime:" + config.channel,
          event: "phx_join",
          payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" } } },
          ref: String(realtime.ref)
        }));

        // Start heartbeat every 30s
        realtime.heartbeatTimer = setInterval(function () {
          if (ws.readyState === 1) {
            realtime.ref++;
            ws.send(JSON.stringify({
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: String(realtime.ref)
            }));
          }
        }, 30000);
      };

      ws.onmessage = function (evt) {
        try {
          var msg = JSON.parse(evt.data);
          if (msg.event === "phx_reply" && msg.payload && msg.payload.status === "ok") {
            realtime.channelJoined = true;
          }
          // Receive typing event from agent
          if (msg.event === "broadcast" && msg.payload && msg.payload.event === "typing") {
            var payload = msg.payload.payload || {};
            if (payload.role === "agent" && payload.isTyping) {
              showTyping();
              // Auto-hide after timeout
              clearTimeout(realtime.typingTimeout);
              realtime.typingTimeout = setTimeout(hideTyping, realtime.TYPING_TIMEOUT_MS);
            } else if (payload.role === "agent" && !payload.isTyping) {
              clearTimeout(realtime.typingTimeout);
              hideTyping();
            }
          }
        } catch (e) { /* ignore malformed */ }
      };

      ws.onclose = function () {
        rtCleanup();
        // Reconnect after 5s if conversation still active
        if (state.conversationId && !state.resolved) {
          setTimeout(function () {
            if (state.realtimeConfig) rtConnect(state.realtimeConfig);
          }, 5000);
        }
      };

      ws.onerror = function () {
        // onclose will fire after onerror
      };
    } catch (e) {
      console.error("[ChatFlow360] Realtime error:", e);
    }
  }

  function rtSendTyping(isTyping) {
    if (!realtime.ws || realtime.ws.readyState !== 1 || !realtime.channelJoined) return;
    if (!state.realtimeConfig) return;

    // Throttle: max 1 event per THROTTLE_MS
    var now = Date.now();
    if (isTyping && (now - realtime.lastTypingSent) < realtime.THROTTLE_MS) return;
    realtime.lastTypingSent = now;

    realtime.ref++;
    realtime.ws.send(JSON.stringify({
      topic: "realtime:" + state.realtimeConfig.channel,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "typing",
        payload: { role: "visitor", isTyping: isTyping }
      },
      ref: String(realtime.ref)
    }));
  }

  function rtCleanup() {
    if (realtime.heartbeatTimer) {
      clearInterval(realtime.heartbeatTimer);
      realtime.heartbeatTimer = null;
    }
    clearTimeout(realtime.typingTimeout);
    realtime.channelJoined = false;
    if (realtime.ws) {
      try { realtime.ws.close(); } catch (e) { /* noop */ }
      realtime.ws = null;
    }
  }

  // ─── Color helpers ────────────────────────────────────────────────
  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 47, g: 146, b: 173 }; // fallback to CTA
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  /** Validate hex color to prevent CSS injection via server-provided values. */
  function safeHex(color, fallback) {
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
  }

  var rgb = hexToRgb(primaryColor);
  var primaryAlpha15 = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.15)";
  var primaryAlpha80 = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.80)";

  // ─── Styles ───────────────────────────────────────────────────────
  function injectStyles() {
    var posRight = position === "right";
    // Darker shade for visitor bubble backgrounds
    var darkerRgb = { r: Math.round(rgb.r * 0.85), g: Math.round(rgb.g * 0.85), b: Math.round(rgb.b * 0.85) };
    var primaryDarker = "rgb(" + darkerRgb.r + "," + darkerRgb.g + "," + darkerRgb.b + ")";
    var css = [
      // Reset & container
      ".cf360-reset,.cf360-reset *,.cf360-reset *::before,.cf360-reset *::after{",
      "  box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
      "  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;line-height:1.5;",
      "}",
      ".cf360-container{",
      "  position:fixed;bottom:24px;" + (posRight ? "right:24px;" : "left:24px;"),
      "  z-index:2147483647;font-size:14px;",
      "}",

      // Bubble
      ".cf360-bubble{",
      "  width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;",
      "  background:linear-gradient(135deg," + primaryColor + "," + primaryDarker + ");color:#fff;display:flex;align-items:center;justify-content:center;",
      "  box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 0 " + primaryAlpha80 + ";transition:transform 0.2s ease,box-shadow 0.2s ease;",
      "  outline:none;position:relative;",
      "}",
      ".cf360-bubble:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,0.25);}",
      ".cf360-bubble:active{transform:scale(0.95);}",

      // Bubble pulse
      "@keyframes cf360-pulse{",
      "  0%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 0 " + primaryAlpha80 + ";}",
      "  70%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 14px rgba(0,0,0,0);}",
      "  100%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 0 rgba(0,0,0,0);}",
      "}",
      ".cf360-bubble--pulse{animation:cf360-pulse 2s ease infinite;}",

      // Bubble SVG icons
      ".cf360-bubble svg{width:26px;height:26px;fill:currentColor;transition:transform 0.3s ease,opacity 0.3s ease;}",
      ".cf360-bubble .cf360-icon-chat,.cf360-bubble .cf360-icon-close{display:flex;align-items:center;justify-content:center;}",
      ".cf360-bubble .cf360-icon-close{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(90deg) scale(0);opacity:0;}",
      ".cf360-bubble--open .cf360-icon-chat{transform:rotate(-90deg) scale(0);opacity:0;}",
      ".cf360-bubble--open .cf360-icon-close{transform:translate(-50%,-50%) rotate(0) scale(1);opacity:1;}",

      // Unread badge
      ".cf360-badge{",
      "  position:absolute;top:-2px;right:-2px;width:22px;height:22px;border-radius:50%;",
      "  background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:none;",
      "  align-items:center;justify-content:center;border:2px solid #fff;",
      "}",
      ".cf360-badge--show{display:flex;}",

      // Chat window
      ".cf360-window{",
      "  position:absolute;bottom:76px;" + (posRight ? "right:0;" : "left:0;"),
      "  width:380px;height:560px;border-radius:20px 20px 12px 12px;overflow:hidden;",
      "  background:#fff;box-shadow:0 8px 48px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.08);",
      "  display:flex;flex-direction:column;",
      "  opacity:0;transform:translateY(16px) scale(0.95);pointer-events:none;",
      "  transition:opacity 0.25s ease,transform 0.25s ease;",
      "}",
      ".cf360-window--open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}",

      // Expanded panel mode (desktop only)
      ".cf360-window--expanded{",
      "  position:fixed;top:0;right:0;bottom:0;width:420px;height:100vh;",
      "  border-radius:0;box-shadow:-4px 0 24px rgba(0,0,0,0.12);",
      "}",
      ".cf360-window--expanded .cf360-header{border-radius:0;}",

      // Header — two-row with bot avatar + curved bottom overlap
      ".cf360-header{",
      "  background:linear-gradient(135deg,#1c2e47 0%," + primaryColor + " 100%);color:#fff;padding:18px 20px 30px;display:flex;",
      "  align-items:center;gap:14px;flex-shrink:0;position:relative;",
      "  border-radius:20px 20px 0 0;",
      "}",
      ".cf360-header-avatar{",
      "  width:42px;height:42px;border-radius:50%;flex-shrink:0;position:relative;",
      "  background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;",
      "}",
      ".cf360-header-avatar svg{width:22px;height:22px;fill:#fff;}",
      ".cf360-header-info{flex:1;min-width:0;}",
      ".cf360-header-title{font-size:16px;font-weight:600;letter-spacing:-0.01em;display:block;}",
      ".cf360-header-subtitle{font-size:12px;opacity:0.7;margin-top:2px;display:block;}",
      ".cf360-header-actions{display:flex;align-items:center;gap:2px;flex-shrink:0;}",
      ".cf360-header-btn{background:none;border:none;color:#fff;cursor:pointer;padding:6px;",
      "  border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:0.7;transition:opacity 0.15s,background 0.15s;}",
      ".cf360-header-btn:hover{opacity:1;background:rgba(255,255,255,0.1);}",
      ".cf360-header-btn svg{width:18px;height:18px;fill:currentColor;}",
      ".cf360-header-btn--expand{display:none;}",
      "@media (min-width:481px){.cf360-header-btn--expand{display:flex;}}",

      // Online indicator dot — positioned relative to avatar
      ".cf360-online-dot{",
      "  width:10px;height:10px;border-radius:50%;background:#34d399;border:2px solid #1c2e47;",
      "  position:absolute;bottom:0;right:0;",
      "}",

      // Messages area — overlaps header with rounded top
      ".cf360-messages{",
      "  flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:6px;",
      "  background:#f8fafc;border-radius:16px 16px 0 0;margin-top:-16px;position:relative;z-index:1;",
      "}",
      ".cf360-messages::-webkit-scrollbar{width:4px;}",
      ".cf360-messages::-webkit-scrollbar-track{background:transparent;}",
      ".cf360-messages::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px;}",
      ".cf360-messages::-webkit-scrollbar-thumb:hover{background:#9ca3af;}",

      // Message row wrapper
      ".cf360-msg-row{display:flex;flex-direction:column;margin-bottom:2px;}",
      ".cf360-msg-row--visitor{align-items:flex-end;}",
      ".cf360-msg-row--ai,.cf360-msg-row--agent{align-items:flex-start;}",
      ".cf360-msg-row--system{align-items:center;}",

      // Message bubbles — modern rounded
      ".cf360-msg{max-width:78%;padding:10px 16px;word-wrap:break-word;font-size:14px;line-height:1.5;letter-spacing:-0.01em;}",

      // Visitor — right side, brand color, white text
      ".cf360-msg--visitor{",
      "  background:" + primaryColor + ";color:#fff;",
      "  border-radius:20px 20px 6px 20px;",
      "}",

      // AI/Agent — left side, soft gray, dark text
      ".cf360-msg--ai,.cf360-msg--agent{",
      "  background:#e8ecf1;color:#1e293b;",
      "  border-radius:20px 20px 20px 6px;",
      "}",

      // System message
      ".cf360-msg--system{",
      "  background:transparent;color:#94a3b8;font-size:12px;font-style:italic;",
      "  text-align:center;padding:6px 10px;max-width:100%;",
      "}",

      // Timestamp
      ".cf360-msg-time{font-size:11px;color:#94a3b8;margin-top:3px;padding:0 4px;}",
      ".cf360-msg-row--visitor .cf360-msg-time{text-align:right;}",
      ".cf360-msg-row--ai .cf360-msg-time,.cf360-msg-row--agent .cf360-msg-time{text-align:left;}",

      // Typing indicator — wave dots (iMessage-style)
      ".cf360-typing{",
      "  align-self:flex-start;display:flex;align-items:flex-end;gap:4px;padding:14px 20px;",
      "  background:#e8ecf1;border-radius:20px 20px 20px 6px;min-height:44px;",
      "}",
      "@keyframes cf360-wave{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-8px);}}",
      ".cf360-typing-dot{width:7px;height:7px;border-radius:50%;background:" + primaryColor + ";opacity:0.6;",
      "  animation:cf360-wave 1.3s cubic-bezier(0.4,0,0.2,1) infinite;}",
      ".cf360-typing-dot:nth-child(2){animation-delay:0.15s;}",
      ".cf360-typing-dot:nth-child(3){animation-delay:0.3s;}",

      // Connecting banner
      ".cf360-connecting{",
      "  padding:8px 16px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;",
      "  flex-shrink:0;display:none;",
      "}",
      ".cf360-connecting--show{display:block;}",
      ".cf360-connecting--connected{background:#dcfce7;color:#166534;}",

      // Input area
      ".cf360-input-area{",
      "  display:flex;align-items:center;padding:12px 14px;gap:10px;",
      "  background:#fff;flex-shrink:0;border-top:1px solid #f1f5f9;",
      "}",
      ".cf360-input{",
      "  flex:1;border:1px solid #e2e8f0;border-radius:24px;padding:0 18px;font-size:14px;",
      "  height:42px;line-height:42px;",
      "  outline:none;resize:none;font-family:inherit;background:#f1f5f9;color:#1e293b;",
      "  transition:border-color 0.2s,box-shadow 0.2s;",
      "}",
      ".cf360-input:focus{border-color:" + primaryColor + ";box-shadow:0 0 0 3px " + primaryAlpha15 + ";background:#fff;}",
      ".cf360-input::placeholder{color:#94a3b8;}",
      ".cf360-send-btn{",
      "  width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;",
      "  background:" + primaryColor + ";color:#fff;display:flex;align-items:center;justify-content:center;",
      "  transition:opacity 0.15s,transform 0.15s,box-shadow 0.15s;outline:none;",
      "  box-shadow:0 2px 8px rgba(0,0,0,0.12);",
      "}",
      ".cf360-send-btn:hover{opacity:0.9;box-shadow:0 4px 12px rgba(0,0,0,0.18);}",
      ".cf360-send-btn:active{transform:scale(0.92);}",
      ".cf360-send-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}",
      ".cf360-send-btn svg{width:18px;height:18px;fill:currentColor;}",

      // End conversation
      ".cf360-end-conv{",
      "  display:none;padding:0 14px 10px;flex-shrink:0;background:#fff;",
      "}",
      ".cf360-end-conv--show{display:block;}",
      ".cf360-end-conv button{",
      "  background:#1e293b;border:none;cursor:pointer;font-size:11px;color:#fff;",
      "  padding:5px 16px;border-radius:16px;font-family:inherit;transition:all 0.15s;font-weight:500;",
      "}",
      ".cf360-end-conv button:hover{background:#334155;}",

      // Confirm dialog
      ".cf360-confirm{",
      "  display:none;padding:14px 16px;background:#f8fafc;border-top:1px solid #f1f5f9;",
      "  flex-shrink:0;text-align:center;",
      "}",
      ".cf360-confirm--show{display:block;}",
      ".cf360-confirm-text{font-size:13px;color:#475569;margin-bottom:10px;}",
      ".cf360-confirm-actions{display:flex;gap:8px;justify-content:center;}",
      ".cf360-confirm-btn{",
      "  border:none;cursor:pointer;font-size:13px;font-family:inherit;",
      "  padding:6px 20px;border-radius:20px;font-weight:500;transition:all 0.15s;",
      "}",
      ".cf360-confirm-btn:hover{opacity:0.85;}",
      ".cf360-confirm-btn--yes{background:#ef4444;color:#fff;}",
      ".cf360-confirm-btn--no{background:#e2e8f0;color:#475569;}",

      // Post-chat overlay
      ".cf360-postchat{",
      "  display:none;position:absolute;top:0;left:0;right:0;bottom:0;",
      "  background:#ffffff;z-index:10;flex-direction:column;align-items:center;",
      "  overflow:hidden;",
      "}",
      ".cf360-postchat--show{display:flex;}",
      // Gradient header band
      ".cf360-postchat-hero{",
      "  width:100%;padding:28px 24px 40px;display:flex;align-items:center;justify-content:center;",
      "  background:linear-gradient(135deg,#1c2e47 0%," + primaryColor + " 100%);",
      "  position:relative;flex-shrink:0;",
      "}",
      ".cf360-postchat-hero img{max-height:36px;max-width:160px;object-fit:contain;}",
      // Wave separator
      ".cf360-postchat-wave{",
      "  width:100%;margin-top:-24px;flex-shrink:0;display:block;",
      "}",
      ".cf360-postchat-wave svg{display:block;width:100%;height:24px;}",
      // Content area
      ".cf360-postchat-body{",
      "  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "  padding:12px 24px 32px;text-align:center;",
      "}",
      "@keyframes cf360FadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}",
      ".cf360-postchat-body>*{animation:cf360FadeUp 0.35s ease-out both;}",
      ".cf360-postchat-body>*:nth-child(2){animation-delay:0.08s;}",
      ".cf360-postchat-body>*:nth-child(3){animation-delay:0.16s;}",
      ".cf360-postchat-title{font-size:15px;font-weight:600;color:#1e293b;margin-bottom:20px;}",

      // Rating stars
      ".cf360-stars{display:flex;gap:6px;justify-content:center;margin-bottom:20px;}",
      ".cf360-star{",
      "  width:36px;height:36px;cursor:pointer;background:none;border:none;padding:0;",
      "  transition:transform 0.15s;",
      "}",
      ".cf360-star:hover{transform:scale(1.2);}",
      ".cf360-star svg{width:36px;height:36px;fill:#d1d5db;transition:fill 0.15s;}",
      ".cf360-star--active svg{fill:#f59e0b;}",
      ".cf360-star--hover svg{fill:#fbbf24;}",

      // Transcript form (contenteditable divs — immune to browser autofill)
      ".cf360-transcript-form{width:100%;max-width:260px;display:flex;flex-direction:column;gap:10px;}",
      ".cf360-transcript-input{",
      "  width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;",
      "  font-size:14px;font-family:inherit;outline:none;transition:border-color 0.15s;",
      "  box-sizing:border-box;min-height:20px;line-height:20px;white-space:nowrap;overflow:hidden;",
      "}",
      ".cf360-transcript-input:focus{border-color:" + primaryColor + ";}",
      ".cf360-transcript-input:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;}",
      ".cf360-phone-row{display:flex;gap:8px;width:100%;}",
      ".cf360-phone-code{",
      "  width:56px;flex-shrink:0;padding:10px 6px;border:1.5px solid #e2e8f0;border-radius:8px;",
      "  font-size:14px;font-family:inherit;outline:none;transition:border-color 0.15s;",
      "  box-sizing:border-box;text-align:center;min-height:20px;line-height:20px;white-space:nowrap;overflow:hidden;",
      "}",
      ".cf360-phone-code:focus{border-color:" + primaryColor + ";}",
      ".cf360-phone-code:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;}",
      ".cf360-postchat-btn{",
      "  padding:10px 20px;border:none;border-radius:8px;cursor:pointer;",
      "  font-size:14px;font-family:inherit;font-weight:500;transition:all 0.15s;",
      "}",
      ".cf360-postchat-btn--primary{background:" + primaryColor + ";color:#fff;}",
      ".cf360-postchat-btn--primary:hover{opacity:0.9;}",
      ".cf360-postchat-btn--ghost{background:none;color:#6b7280;font-size:13px;}",
      ".cf360-postchat-btn--ghost:hover{color:#1e293b;}",
      ".cf360-postchat-actions{display:flex;flex-direction:column;gap:8px;width:100%;max-width:260px;margin-top:4px;}",
      ".cf360-postchat-msg{font-size:14px;color:#6b7280;margin-bottom:12px;}",
      ".cf360-postchat-check{width:48px;height:48px;margin-bottom:12px;}",
      ".cf360-postchat-check svg{fill:#10b981;width:48px;height:48px;}",
      ".cf360-postchat-error{color:#ef4444;}",

      // New conversation button
      ".cf360-new-conv{",
      "  padding:10px 16px;background:#f1f5f9;border:none;cursor:pointer;font-size:13px;",
      "  color:" + primaryColor + ";font-weight:600;text-align:center;width:100%;",
      "  transition:background 0.15s;flex-shrink:0;display:none;",
      "}",
      ".cf360-new-conv:hover{background:#e2e8f0;}",
      ".cf360-new-conv--show{display:block;}",

      // Footer
      ".cf360-footer{",
      "  padding:8px;text-align:center;font-size:11px;color:#94a3b8;flex-shrink:0;",
      "  background:#fff;",
      "}",
      ".cf360-footer a{color:#94a3b8;text-decoration:none;font-weight:600;transition:color 0.15s;}",
      ".cf360-footer a:hover{color:" + primaryColor + ";}",

      // Welcome state
      ".cf360-welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "  flex:1;padding:40px 32px;text-align:center;color:#94a3b8;gap:16px;}",
      ".cf360-welcome-icon{width:56px;height:56px;border-radius:50%;background:" + primaryAlpha15 + ";",
      "  display:flex;align-items:center;justify-content:center;}",
      ".cf360-welcome-icon svg{width:28px;height:28px;fill:" + primaryColor + ";}",
      ".cf360-welcome-text{font-size:16px;font-weight:600;color:#1e293b;letter-spacing:-0.01em;}",
      ".cf360-welcome-sub{font-size:13px;color:#94a3b8;line-height:1.5;}",

      // Mobile fullscreen
      "@media (max-width:480px){",
      "  .cf360-container{bottom:0 !important;right:0 !important;left:0 !important;}",
      "  .cf360-window{",
      "    position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;",
      "    border-radius:0;max-height:none;",
      "  }",
      "  .cf360-header{border-radius:0;}",
      "  .cf360-bubble{position:fixed;bottom:16px;" + (posRight ? "right:16px;" : "left:16px;") + "}",
      "}"
    ].join("\n");

    var style = document.createElement("style");
    style.id = "cf360-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── SVG Icons ────────────────────────────────────────────────────
  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.92 2 10.5c0 2.55 1.33 4.84 3.42 6.4L4 22l4.35-2.18C9.5 20.27 10.72 20.5 12 20.5c5.52 0 10-3.42 10-7.5S17.52 2 12 2z"/><circle cx="8" cy="10.5" r="1.5" fill="' + primaryColor + '"/><circle cx="12" cy="10.5" r="1.5" fill="' + primaryColor + '"/><circle cx="16" cy="10.5" r="1.5" fill="' + primaryColor + '"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var ICON_MSG = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  var ICON_EXPAND = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
  var ICON_COLLAPSE = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';

  // ─── DOM Elements ─────────────────────────────────────────────────
  var container, bubble, badge, chatWindow, messagesArea, inputField, sendBtn;
  var typingEl, connectingEl, newConvBtn, endConvEl, confirmEl, expandBtn, postChatEl;
  var isExpanded = false;

  function buildDOM() {
    // Container
    container = el("div", "cf360-container cf360-reset");
    document.body.appendChild(container);

    // Bubble button
    bubble = el("button", "cf360-bubble cf360-bubble--pulse");
    bubble.setAttribute("aria-label", t("chatWithUs"));
    bubble.innerHTML =
      '<span class="cf360-icon-chat">' + ICON_CHAT + '</span>' +
      '<span class="cf360-icon-close">' + ICON_CLOSE + '</span>';
    badge = el("span", "cf360-badge");
    badge.textContent = "0";
    bubble.appendChild(badge);
    container.appendChild(bubble);

    // Chat window
    chatWindow = el("div", "cf360-window");

    // Header — with bot avatar
    var header = el("div", "cf360-header");

    var avatar = el("div", "cf360-header-avatar");
    avatar.innerHTML = ICON_MSG;
    var onlineDot = el("span", "cf360-online-dot");
    avatar.appendChild(onlineDot);
    header.appendChild(avatar);

    var headerInfo = el("div", "cf360-header-info");
    var title = el("span", "cf360-header-title");
    title.textContent = t("chatWithUs");
    var subtitle = el("span", "cf360-header-subtitle");
    subtitle.textContent = lang === "es" ? "Normalmente respondemos al instante" : "We typically reply instantly";
    headerInfo.appendChild(title);
    headerInfo.appendChild(subtitle);
    header.appendChild(headerInfo);

    var headerActions = el("div", "cf360-header-actions");
    expandBtn = el("button", "cf360-header-btn cf360-header-btn--expand");
    expandBtn.setAttribute("aria-label", "Expand");
    expandBtn.innerHTML = ICON_EXPAND;
    var closeBtn = el("button", "cf360-header-btn");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = ICON_CLOSE;
    headerActions.appendChild(expandBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(headerActions);
    chatWindow.appendChild(header);

    // Connecting banner
    connectingEl = el("div", "cf360-connecting");
    connectingEl.textContent = t("connecting");
    chatWindow.appendChild(connectingEl);

    // Messages
    messagesArea = el("div", "cf360-messages");
    chatWindow.appendChild(messagesArea);

    // New conversation button
    newConvBtn = el("button", "cf360-new-conv");
    newConvBtn.textContent = t("newConversation");
    chatWindow.appendChild(newConvBtn);

    // Input area
    var inputArea = el("div", "cf360-input-area");
    inputField = document.createElement("input");
    inputField.type = "text";
    inputField.className = "cf360-input";
    inputField.placeholder = t("typeMessage");
    inputField.maxLength = 1000;
    inputField.setAttribute("autocomplete", "off");
    sendBtn = el("button", "cf360-send-btn");
    sendBtn.setAttribute("aria-label", t("send"));
    sendBtn.innerHTML = ICON_SEND;
    inputArea.appendChild(inputField);
    inputArea.appendChild(sendBtn);
    chatWindow.appendChild(inputArea);

    // End conversation badge
    endConvEl = el("div", "cf360-end-conv");
    var endConvBtn = el("button", "");
    endConvBtn.textContent = t("endConversation");
    endConvBtn.type = "button";
    endConvEl.appendChild(endConvBtn);
    chatWindow.appendChild(endConvEl);

    // Confirm dialog
    confirmEl = el("div", "cf360-confirm");
    var confirmText = el("div", "cf360-confirm-text");
    confirmText.textContent = t("confirmEnd");
    var confirmActions = el("div", "cf360-confirm-actions");
    var confirmYes = el("button", "cf360-confirm-btn cf360-confirm-btn--yes");
    confirmYes.textContent = t("yes");
    confirmYes.type = "button";
    var confirmNo = el("button", "cf360-confirm-btn cf360-confirm-btn--no");
    confirmNo.textContent = t("no");
    confirmNo.type = "button";
    confirmActions.appendChild(confirmYes);
    confirmActions.appendChild(confirmNo);
    confirmEl.appendChild(confirmText);
    confirmEl.appendChild(confirmActions);
    chatWindow.appendChild(confirmEl);

    // Post-chat overlay (rating + transcript)
    postChatEl = el("div", "cf360-postchat");
    chatWindow.appendChild(postChatEl);

    // Footer
    var footer = el("div", "cf360-footer");
    var footerText = document.createTextNode(t("powered") + " ");
    var footerLink = document.createElement("a");
    footerLink.href = "https://chatflow360.com";
    footerLink.target = "_blank";
    footerLink.rel = "noopener noreferrer";
    footerLink.textContent = "ChatFlow360";
    footer.appendChild(footerText);
    footer.appendChild(footerLink);
    chatWindow.appendChild(footer);

    container.appendChild(chatWindow);

    // ─── Event listeners ──────────────────────────────────────────
    bubble.addEventListener("click", toggleWidget);
    closeBtn.addEventListener("click", closeWidget);
    expandBtn.addEventListener("click", toggleExpand);
    sendBtn.addEventListener("click", handleSend);
    newConvBtn.addEventListener("click", startNewConversation);
    endConvBtn.addEventListener("click", showEndConfirm);
    confirmYes.addEventListener("click", confirmEndConversation);
    confirmNo.addEventListener("click", cancelEndConversation);

    inputField.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        rtSendTyping(false);
        handleSend();
      }
    });

    // Broadcast visitor typing on input
    var typingStopTimer = null;
    inputField.addEventListener("input", function () {
      rtSendTyping(true);
      clearTimeout(typingStopTimer);
      typingStopTimer = setTimeout(function () {
        rtSendTyping(false);
      }, 2000);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) {
        closeWidget();
      }
    });
  }

  // ─── DOM helpers ──────────────────────────────────────────────────
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    });
  }

  // ─── Widget toggle ────────────────────────────────────────────────
  function toggleWidget() {
    if (state.open) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function openWidget() {
    state.open = true;
    bubble.classList.add("cf360-bubble--open");
    bubble.classList.remove("cf360-bubble--pulse");
    chatWindow.classList.add("cf360-window--open");
    badge.classList.remove("cf360-badge--show");
    badge.textContent = "0";

    if (state.conversationId) {
      fetchHistory(state.conversationId);
    } else {
      showWelcome();
    }

    setTimeout(function () { inputField.focus(); }, 300);
  }

  function closeWidget() {
    state.open = false;
    bubble.classList.remove("cf360-bubble--open");
    chatWindow.classList.remove("cf360-window--open");
    // Collapse back on close so next open is compact
    if (isExpanded) {
      isExpanded = false;
      chatWindow.classList.remove("cf360-window--expanded");
      expandBtn.innerHTML = ICON_EXPAND;
      expandBtn.setAttribute("aria-label", "Expand");
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      chatWindow.classList.add("cf360-window--expanded");
      expandBtn.innerHTML = ICON_COLLAPSE;
      expandBtn.setAttribute("aria-label", "Collapse");
    } else {
      chatWindow.classList.remove("cf360-window--expanded");
      expandBtn.innerHTML = ICON_EXPAND;
      expandBtn.setAttribute("aria-label", "Expand");
    }
  }

  // ─── Welcome state ────────────────────────────────────────────────
  function showWelcome() {
    messagesArea.innerHTML = "";
    var welcome = el("div", "cf360-welcome");

    var iconWrap = el("div", "cf360-welcome-icon");
    iconWrap.innerHTML = ICON_MSG;
    welcome.appendChild(iconWrap);

    var wText = el("div", "cf360-welcome-text");
    wText.textContent = t("chatWithUs");
    welcome.appendChild(wText);

    var wSub = el("div", "cf360-welcome-sub");
    wSub.textContent = lang === "es"
      ? "Env\u00edanos un mensaje para comenzar."
      : "Send us a message to get started.";
    welcome.appendChild(wSub);

    messagesArea.appendChild(welcome);
    state.resolved = false;
    newConvBtn.classList.remove("cf360-new-conv--show");
    connectingEl.textContent = t("connecting");
    connectingEl.classList.remove("cf360-connecting--show", "cf360-connecting--connected");
  }

  // ─── Message rendering ────────────────────────────────────────────
  function renderMessage(msg) {
    var senderType = (msg.senderType || "visitor").toLowerCase();

    // Row wrapper for alignment
    var row = el("div", "cf360-msg-row cf360-msg-row--" + senderType);

    // Bubble
    var bubble = el("div", "cf360-msg cf360-msg--" + senderType);
    bubble.textContent = msg.content || "";
    row.appendChild(bubble);

    // Timestamp below bubble
    if (msg.createdAt) {
      var timeEl = el("div", "cf360-msg-time");
      timeEl.textContent = formatTime(msg.createdAt);
      row.appendChild(timeEl);
    }

    return row;
  }

  function appendMessage(msg) {
    // Remove welcome if present
    var welcome = messagesArea.querySelector(".cf360-welcome");
    if (welcome) welcome.remove();

    var rendered = renderMessage(msg);
    messagesArea.appendChild(rendered);
    scrollToBottom();

    if (msg.id) {
      state.lastMessageId = msg.id;
    }
  }

  function formatTime(dateStr) {
    try {
      var d = new Date(dateStr);
      var hours = d.getHours();
      var mins = d.getMinutes();
      return (hours < 10 ? "0" : "") + hours + ":" + (mins < 10 ? "0" : "") + mins;
    } catch (e) {
      return "";
    }
  }

  // ─── Typing indicator ─────────────────────────────────────────────
  function showTyping() {
    if (typingEl) return;
    typingEl = el("div", "cf360-typing");
    for (var i = 0; i < 3; i++) {
      typingEl.appendChild(el("span", "cf360-typing-dot"));
    }
    messagesArea.appendChild(typingEl);
    scrollToBottom();
  }

  function switchToConnectedBanner() {
    connectingEl.textContent = t("connectedAgent");
    connectingEl.classList.add("cf360-connecting--show", "cf360-connecting--connected");
  }

  function hideTyping() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
    }
    typingEl = null;
  }

  // ─── API calls ────────────────────────────────────────────────────
  function apiUrl(path) {
    return apiBaseUrl + path;
  }

  function closeConversationApi(conversationId) {
    if (!conversationId) return;
    try {
      fetch(apiUrl("/api/chat/" + conversationId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId }),
      }).catch(function () { /* fire-and-forget */ });
    } catch (e) { /* noop */ }
  }

  function sendMessage(text) {
    if (state.sending) return;
    state.sending = true;
    sendBtn.disabled = true;
    touchConversationTimestamp();

    // Show visitor message immediately
    appendMessage({ content: text, senderType: "visitor", createdAt: new Date().toISOString() });
    inputField.value = "";
    showTyping();

    var body = {
      publicKey: publicKey,
      visitorId: visitorId,
      message: text,
      pageUrl: window.location.href
    };

    if (state.conversationId) {
      body.conversationId = state.conversationId;
    }

    fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        // Store conversationId
        if (data.conversationId) {
          state.conversationId = data.conversationId;
          setConversationId(data.conversationId);
          endConvEl.classList.add("cf360-end-conv--show");
        }
        if (data.contactName) {
          state.contactName = data.contactName;
        }

        // Connect realtime if config provided
        if (data.realtimeConfig && !realtime.ws) {
          rtConnect(data.realtimeConfig);
        }

        // Render AI response
        if (data.message) {
          hideTyping();
          appendMessage(data.message);
        }

        // Handoff or awaiting agent → keep typing dots visible, start polling
        if (data.handoffTriggered || data.awaitingAgent) {
          connectingEl.classList.add("cf360-connecting--show");
          startPolling();
        } else {
          hideTyping();
        }
      })
      .catch(function (err) {
        hideTyping();
        appendMessage({
          content: lang === "es"
            ? "Error al enviar el mensaje. Intenta de nuevo."
            : "Failed to send message. Please try again.",
          senderType: "system"
        });
        console.error("[ChatFlow360] Send error:", err);
      })
      .finally(function () {
        state.sending = false;
        sendBtn.disabled = false;
        inputField.focus();
      });
  }

  function fetchHistory(conversationId) {
    messagesArea.innerHTML = "";

    fetch(apiUrl("/api/chat/" + conversationId + "?visitorId=" + encodeURIComponent(visitorId)))
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 404) {
            clearConversationId();
            state.conversationId = null;
            showWelcome();
            return null;
          }
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;

        // Check if conversation is resolved/closed
        var convStatus = (data.status || "").toLowerCase();
        if (convStatus === "resolved" || convStatus === "closed") {
          state.resolved = true;
          newConvBtn.classList.add("cf360-new-conv--show");
        } else {
          endConvEl.classList.add("cf360-end-conv--show");
        }

        // Render messages
        var messages = data.messages || [];
        for (var i = 0; i < messages.length; i++) {
          appendMessage(messages[i]);
        }

        // If human mode, start polling and show correct banner
        if (data.responderMode === "human") {
          // Check if agent already replied (any agent message in history)
          var hasAgentReply = messages.some(function (m) {
            return (m.senderType || "").toLowerCase() === "agent";
          });
          if (hasAgentReply) {
            switchToConnectedBanner();
          } else {
            connectingEl.textContent = t("connecting");
            connectingEl.classList.remove("cf360-connecting--connected");
            connectingEl.classList.add("cf360-connecting--show");
          }
          startPolling();
        }
      })
      .catch(function (err) {
        console.error("[ChatFlow360] Fetch history error:", err);
        showWelcome();
      });
  }

  // ─── Polling (human handoff) ──────────────────────────────────────
  function startPolling() {
    if (state.polling) return;
    state.polling = true;
    poll();
  }

  function stopPolling() {
    state.polling = false;
    if (state.pollingTimer) {
      clearTimeout(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function poll() {
    if (!state.polling || !state.conversationId) return;

    fetch(apiUrl("/api/chat/" + state.conversationId + "?visitorId=" + encodeURIComponent(visitorId)))
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;

        // Find new messages
        var messages = data.messages || [];
        var foundLast = !state.lastMessageId;
        var newMessages = [];

        for (var i = 0; i < messages.length; i++) {
          if (foundLast) {
            newMessages.push(messages[i]);
          } else if (messages[i].id === state.lastMessageId) {
            foundLast = true;
          }
        }

        // Render new messages (skip visitor messages — we already showed them)
        for (var j = 0; j < newMessages.length; j++) {
          var sType = (newMessages[j].senderType || "").toLowerCase();
          if (sType !== "visitor") {
            hideTyping();
            appendMessage(newMessages[j]);

            // Agent replied → switch banner from "connecting" to "connected"
            if (sType === "agent") {
              switchToConnectedBanner();
            }

            // If it's a badge-worthy message and widget is closed
            if (!state.open) {
              var currentCount = parseInt(badge.textContent, 10) || 0;
              badge.textContent = String(currentCount + 1);
              badge.classList.add("cf360-badge--show");
            }
          }
        }

        // Check if responder mode changed back to AI or conversation resolved
        if (data.responderMode === "ai") {
          connectingEl.textContent = t("connecting");
          connectingEl.classList.remove("cf360-connecting--show", "cf360-connecting--connected");
          stopPolling();
        }

        var convStatus = (data.status || "").toLowerCase();
        if (convStatus === "resolved" || convStatus === "closed") {
          connectingEl.textContent = t("connecting");
          connectingEl.classList.remove("cf360-connecting--show", "cf360-connecting--connected");
          state.resolved = true;
          newConvBtn.classList.add("cf360-new-conv--show");
          stopPolling();
        }
      })
      .catch(function (err) {
        console.error("[ChatFlow360] Polling error:", err);
      })
      .finally(function () {
        if (state.polling) {
          state.pollingTimer = setTimeout(poll, 5000);
        }
      });
  }

  // ─── Handlers ─────────────────────────────────────────────────────
  function handleSend() {
    var text = (inputField.value || "").trim();
    if (!text || state.sending) return;
    sendMessage(text);
  }

  function startNewConversation() {
    stopPolling();
    rtCleanup();
    state.realtimeConfig = null;
    clearConversationId();
    state.conversationId = null;
    state.lastMessageId = null;
    state.resolved = false;
    endConvEl.classList.remove("cf360-end-conv--show");
    confirmEl.classList.remove("cf360-confirm--show");
    postChatEl.classList.remove("cf360-postchat--show");
    postChatEl.innerHTML = "";
    showWelcome();
    inputField.focus();
  }

  function showEndConfirm() {
    endConvEl.classList.remove("cf360-end-conv--show");
    confirmEl.classList.add("cf360-confirm--show");
  }

  function confirmEndConversation() {
    confirmEl.classList.remove("cf360-confirm--show");
    var closingConvId = state.conversationId;
    closeConversationApi(closingConvId);

    // Check if we have post-chat steps
    var cfg = state.postChatConfig;
    var hasRating = cfg && cfg.enableRating;
    var hasTranscript = cfg && cfg.enableTranscript;

    if (hasRating || hasTranscript) {
      showPostChatFlow(closingConvId, hasRating, hasTranscript);
    } else {
      startNewConversation();
    }
  }

  function cancelEndConversation() {
    confirmEl.classList.remove("cf360-confirm--show");
    endConvEl.classList.add("cf360-end-conv--show");
  }

  // ─── Post-Chat Multi-Step Flow ──────────────────────────────────

  function showPostChatFlow(convId, showRating, showTranscript) {
    // Hide input area and other controls
    endConvEl.classList.remove("cf360-end-conv--show");
    postChatEl.innerHTML = "";
    postChatEl.classList.add("cf360-postchat--show");

    if (showRating) {
      showRatingStep(convId, showTranscript);
    } else if (showTranscript) {
      showTranscriptStep(convId);
    }
  }

  // Build gradient hero + wave + body container for post-chat steps
  function buildPostChatLayout() {
    postChatEl.innerHTML = "";
    var cfg = state.postChatConfig;
    var logoUrl = cfg && cfg.logoUrl ? cfg.logoUrl : "";

    // Gradient hero with optional logo
    var hero = el("div", "cf360-postchat-hero");
    if (logoUrl) {
      var logoImg = document.createElement("img");
      logoImg.src = logoUrl;
      logoImg.alt = "Logo";
      hero.appendChild(logoImg);
    }
    postChatEl.appendChild(hero);

    // Wave SVG separator
    var wave = el("div", "cf360-postchat-wave");
    wave.innerHTML = '<svg viewBox="0 0 400 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 24V0c66.7 16 133.3 24 200 24S333.3 16 400 0v24z" fill="#fff"/></svg>';
    postChatEl.appendChild(wave);

    // Body container (content goes here)
    var body = el("div", "cf360-postchat-body");
    postChatEl.appendChild(body);
    return body;
  }

  function showRatingStep(convId, showTranscript) {
    var body = buildPostChatLayout();

    var titleEl = el("div", "cf360-postchat-title");
    titleEl.textContent = t("rateTitle");
    body.appendChild(titleEl);

    var starsContainer = el("div", "cf360-stars");
    var selectedRating = 0;

    var STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

    for (var i = 1; i <= 5; i++) {
      (function (rating) {
        var starBtn = el("button", "cf360-star");
        starBtn.type = "button";
        starBtn.innerHTML = STAR_SVG;
        starBtn.setAttribute("aria-label", rating + " star" + (rating > 1 ? "s" : ""));
        starBtn.addEventListener("mouseenter", function () {
          highlightStars(starsContainer, rating);
        });
        starBtn.addEventListener("mouseleave", function () {
          highlightStars(starsContainer, selectedRating);
        });
        starBtn.addEventListener("click", function () {
          selectedRating = rating;
          highlightStars(starsContainer, rating);
          // Submit rating
          submitRating(convId, rating, showTranscript);
        });
        starsContainer.appendChild(starBtn);
      })(i);
    }
    body.appendChild(starsContainer);

    var skipBtn = el("button", "cf360-postchat-btn cf360-postchat-btn--ghost");
    skipBtn.textContent = t("rateSkip");
    skipBtn.type = "button";
    skipBtn.addEventListener("click", function () {
      if (showTranscript) {
        showTranscriptStep(convId);
      } else {
        showPostChatDone();
      }
    });
    body.appendChild(skipBtn);
  }

  function highlightStars(container, upTo) {
    var stars = container.children;
    for (var i = 0; i < stars.length; i++) {
      if (i < upTo) {
        stars[i].classList.add("cf360-star--active");
      } else {
        stars[i].classList.remove("cf360-star--active");
      }
    }
  }

  function submitRating(convId, rating, showTranscript) {
    fetch(apiUrl("/api/widget/rating"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: convId,
        visitorId: visitorId,
        rating: rating
      })
    }).catch(function () { /* fire-and-forget */ });

    // Brief "thanks" then next step
    var body = buildPostChatLayout();
    var msg = el("div", "cf360-postchat-msg");
    msg.textContent = t("rateThanks");
    body.appendChild(msg);

    setTimeout(function () {
      if (showTranscript) {
        showTranscriptStep(convId);
      } else {
        showPostChatDone();
      }
    }, 1200);
  }

  function showTranscriptStep(convId) {
    var body = buildPostChatLayout();

    var titleEl = el("div", "cf360-postchat-title");
    titleEl.textContent = t("transcriptTitle");
    body.appendChild(titleEl);

    var form = el("div", "cf360-transcript-form");

    // Contenteditable fields — browsers NEVER autofill these (not form elements).
    // Helper: create a contenteditable div that behaves like an input.
    function ceField(className, placeholder, maxLen, filterFn) {
      var d = document.createElement("div");
      d.className = className;
      d.setAttribute("contenteditable", "true");
      d.setAttribute("role", "textbox");
      d.setAttribute("data-placeholder", placeholder);
      d.addEventListener("input", function () {
        // Strip any HTML (paste protection) — keep plain text only
        var txt = d.textContent || "";
        if (filterFn) txt = filterFn(txt);
        if (maxLen && txt.length > maxLen) txt = txt.slice(0, maxLen);
        if (txt !== (d.textContent || "")) {
          d.textContent = txt;
          // Move cursor to end after sanitization
          var range = document.createRange();
          var sel = window.getSelection();
          range.selectNodeContents(d);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
      // Prevent Enter key (single line)
      d.addEventListener("keydown", function (e) {
        if (e.key === "Enter") e.preventDefault();
      });
      // Paste as plain text only
      d.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text/plain");
        text = text.replace(/[\r\n]/g, "");
        document.execCommand("insertText", false, text);
      });
      return d;
    }

    var nameInput = ceField("cf360-transcript-input", t("transcriptName"), 100);
    var emailInput = ceField("cf360-transcript-input", t("transcriptEmail"), 254);

    var phoneRow = el("div", "cf360-phone-row");
    var phoneCode = ceField("cf360-phone-code", "+1", 5, function (v) {
      v = v.replace(/[^0-9+]/g, "");
      if (v && v.charAt(0) !== "+") v = "+" + v;
      return v;
    });
    var phoneNumber = ceField("cf360-transcript-input", t("transcriptPhoneNumber"), 15, function (v) {
      return v.replace(/[^0-9\-() ]/g, "");
    });

    phoneRow.appendChild(phoneCode);
    phoneRow.appendChild(phoneNumber);

    form.appendChild(nameInput);
    form.appendChild(emailInput);
    form.appendChild(phoneRow);
    body.appendChild(form);

    // Pre-fill from AI extraction or localStorage (no autofill interference possible)
    var storedInfo = getStoredVisitorInfo();
    // Clear corrupted legacy phone field (from old browser-autofill sessions)
    if (storedInfo.phone && !storedInfo.phoneCode) {
      delete storedInfo.phone;
      saveVisitorInfo(storedInfo);
    }
    var wantName = state.contactName || storedInfo.name || "";
    var wantEmail = storedInfo.email || "";
    var wantCode = storedInfo.phoneCode || t("transcriptPhoneCode");
    var wantNum = storedInfo.phoneNumber || "";
    nameInput.textContent = wantName;
    emailInput.textContent = wantEmail;
    phoneCode.textContent = wantCode;
    phoneNumber.textContent = wantNum;

    var actions = el("div", "cf360-postchat-actions");

    var sendTranscriptBtn = el("button", "cf360-postchat-btn cf360-postchat-btn--primary");
    sendTranscriptBtn.textContent = t("transcriptSend");
    sendTranscriptBtn.type = "button";

    var skipBtn = el("button", "cf360-postchat-btn cf360-postchat-btn--ghost");
    skipBtn.textContent = t("transcriptSkip");
    skipBtn.type = "button";

    actions.appendChild(sendTranscriptBtn);
    actions.appendChild(skipBtn);
    body.appendChild(actions);

    sendTranscriptBtn.addEventListener("click", function () {
      var name = (nameInput.textContent || "").trim();
      var email = (emailInput.textContent || "").trim();
      var code = (phoneCode.textContent || "").trim();
      var num = (phoneNumber.textContent || "").trim();
      var phone = num ? (code + num) : "";
      if (!name || !email) return;
      // Basic email validation
      if (email.indexOf("@") === -1 || email.indexOf(".") === -1) return;
      // Phone validation: if number provided, code must start with + and number must have 7+ digits
      if (num) {
        if (!code || code.charAt(0) !== "+" || code.replace(/\D/g, "").length < 1) {
          phoneCode.focus();
          return;
        }
        if (num.replace(/\D/g, "").length < 7) {
          phoneNumber.focus();
          return;
        }
      }

      sendTranscriptBtn.disabled = true;
      sendTranscriptBtn.textContent = "...";

      // Save visitor info to localStorage for future pre-fill (code + number separate)
      saveVisitorInfo({ name: name, email: email, phoneCode: code, phoneNumber: num });

      fetch(apiUrl("/api/widget/transcript"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          visitorId: visitorId,
          email: email,
          name: name,
          phone: phone || undefined,
          lang: lang
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          showTranscriptSuccess();
        })
        .catch(function () {
          showTranscriptError(convId, sendTranscriptBtn);
        });
    });

    skipBtn.addEventListener("click", function () {
      showPostChatDone();
    });

    // Smart focus: skip pre-filled fields (no delay needed — no autofill to wait for)
    if (wantName) {
      if (wantEmail) {
        phoneNumber.focus();
      } else {
        emailInput.focus();
      }
    } else {
      nameInput.focus();
    }
  }

  function showTranscriptSuccess() {
    var body = buildPostChatLayout();

    var checkEl = el("div", "cf360-postchat-check");
    checkEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    body.appendChild(checkEl);

    var msg = el("div", "cf360-postchat-msg");
    msg.textContent = t("transcriptSuccess");
    body.appendChild(msg);

    setTimeout(function () {
      showPostChatDone();
    }, 2000);
  }

  function showTranscriptError(convId, btn) {
    btn.disabled = false;
    btn.textContent = t("transcriptSend");
    // Show inline error briefly
    var bodyEl = postChatEl.querySelector(".cf360-postchat-body") || postChatEl;
    var existing = bodyEl.querySelector(".cf360-postchat-error");
    if (existing) existing.remove();
    var errEl = el("div", "cf360-postchat-msg cf360-postchat-error");
    errEl.textContent = t("transcriptError");
    bodyEl.appendChild(errEl);
  }

  function showPostChatDone() {
    postChatEl.innerHTML = "";
    postChatEl.classList.remove("cf360-postchat--show");
    startNewConversation();
  }

  // ─── Apply Appearance Config ─────────────────────────────────────
  function applyAppearance(cfg) {
    if (!cfg) return;

    // Update header texts (bilingual: pick by widget language)
    var titleEl = document.querySelector(".cf360-header-title");
    var subtitleEl = document.querySelector(".cf360-header-subtitle");
    var cfgTitle = lang === "es" ? (cfg.headerTitleEs || cfg.headerTitleEn) : (cfg.headerTitleEn || cfg.headerTitleEs);
    var cfgSubtitle = lang === "es" ? (cfg.headerSubtitleEs || cfg.headerSubtitleEn) : (cfg.headerSubtitleEn || cfg.headerSubtitleEs);
    // Legacy single-field fallback
    cfgTitle = cfgTitle || cfg.headerTitle;
    cfgSubtitle = cfgSubtitle || cfg.headerSubtitle;
    if (cfgTitle && titleEl) titleEl.textContent = cfgTitle;
    if (cfgSubtitle && subtitleEl) subtitleEl.textContent = cfgSubtitle;

    // Build CSS overrides (safeHex prevents CSS injection via malformed color values)
    var hc = safeHex(cfg.headerColor, primaryColor);
    var hic = safeHex(cfg.headerIconColor, "#ffffff");
    var bc = safeHex(cfg.bubbleColor, primaryColor);
    var bic = safeHex(cfg.bubbleIconColor, "#ffffff");
    var vbg = safeHex(cfg.visitorBubbleBg, primaryColor);
    var vbt = safeHex(cfg.visitorBubbleText, "#ffffff");
    var abg = safeHex(cfg.aiBubbleBg, "#e8ecf1");
    var abt = safeHex(cfg.aiBubbleText, "#1e293b");
    var sbc = safeHex(cfg.sendButtonColor, primaryColor);

    // Compute derived values
    var bcRgb = hexToRgb(bc);
    var bcDarker = "rgb(" + Math.round(bcRgb.r * 0.85) + "," + Math.round(bcRgb.g * 0.85) + "," + Math.round(bcRgb.b * 0.85) + ")";
    var bcAlpha15 = "rgba(" + bcRgb.r + "," + bcRgb.g + "," + bcRgb.b + ",0.15)";
    var bcAlpha80 = "rgba(" + bcRgb.r + "," + bcRgb.g + "," + bcRgb.b + ",0.80)";
    var sbcRgb = hexToRgb(sbc);
    var sbcAlpha15 = "rgba(" + sbcRgb.r + "," + sbcRgb.g + "," + sbcRgb.b + ",0.15)";

    var overrides = [
      ".cf360-header{background:linear-gradient(135deg,#1c2e47 0%," + hc + " 100%);}",
      ".cf360-postchat-hero{background:linear-gradient(135deg,#1c2e47 0%," + hc + " 100%);}",
      ".cf360-header-btn{color:" + hic + ";}",
      ".cf360-header-avatar svg{fill:" + hic + ";}",
      ".cf360-bubble{background:linear-gradient(135deg," + bc + "," + bcDarker + ");color:" + bic + ";}",
      ".cf360-bubble svg{fill:" + bic + ";}",
      "@keyframes cf360-pulse{0%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 0 " + bcAlpha80 + ";}70%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 14px rgba(0,0,0,0);}100%{box-shadow:0 4px 20px rgba(0,0,0,0.2),0 0 0 0 rgba(0,0,0,0);}}",
      ".cf360-msg--visitor{background:" + vbg + ";color:" + vbt + ";}",
      ".cf360-msg--ai,.cf360-msg--agent{background:" + abg + ";color:" + abt + ";}",
      ".cf360-typing{background:" + abg + ";}",
      ".cf360-typing-dot{background:" + sbc + ";}",
      ".cf360-send-btn{background:" + sbc + ";}",
      ".cf360-input:focus{border-color:" + sbc + ";box-shadow:0 0 0 3px " + sbcAlpha15 + ";}",
      ".cf360-new-conv{color:" + sbc + ";}",
      ".cf360-footer a:hover{color:" + sbc + ";}",
      ".cf360-welcome-icon{background:" + bcAlpha15 + ";}",
      ".cf360-welcome-icon svg{fill:" + bc + ";}"
    ].join("\n");

    // Remove old overrides if any
    var oldOverride = document.getElementById("cf360-appearance-overrides");
    if (oldOverride) oldOverride.remove();

    var style = document.createElement("style");
    style.id = "cf360-appearance-overrides";
    style.textContent = overrides;
    document.head.appendChild(style);
  }

  // ─── Fetch Config ───────────────────────────────────────────────
  function fetchAppearanceConfig() {
    var url = apiBaseUrl + "/api/widget/config?key=" + encodeURIComponent(publicKey);
    try {
      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.appearance) {
            applyAppearance(data.appearance);
          }
          if (data && data.postChat) {
            state.postChatConfig = data.postChat;
          }
        })
        .catch(function () { /* use data-color defaults — config fetch is non-blocking */ });
    } catch (e) { /* noop */ }
  }

  // ─── Init ─────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildDOM();
    fetchAppearanceConfig();
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
