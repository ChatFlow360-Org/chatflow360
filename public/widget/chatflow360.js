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
      no: "No"
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
      no: "No"
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
  var SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

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
    realtimeConfig: null
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

  var rgb = hexToRgb(primaryColor);
  var primaryAlpha15 = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.15)";
  var primaryAlpha80 = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.80)";

  // ─── Styles ───────────────────────────────────────────────────────
  function injectStyles() {
    var posRight = position === "right";
    var css = [
      // Reset & container
      ".cf360-reset,.cf360-reset *,.cf360-reset *::before,.cf360-reset *::after{",
      "  box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
      "  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;line-height:1.5;",
      "}",
      ".cf360-container{",
      "  position:fixed;bottom:24px;" + (posRight ? "right:24px;" : "left:24px;"),
      "  z-index:2147483647;font-size:14px;",
      "}",

      // Bubble
      ".cf360-bubble{",
      "  width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;",
      "  background:" + primaryColor + ";color:#fff;display:flex;align-items:center;justify-content:center;",
      "  box-shadow:0 4px 14px rgba(0,0,0,0.25);transition:transform 0.2s ease,box-shadow 0.2s ease;",
      "  outline:none;position:relative;",
      "}",
      ".cf360-bubble:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,0.3);}",
      ".cf360-bubble:active{transform:scale(0.96);}",

      // Bubble pulse
      "@keyframes cf360-pulse{",
      "  0%{box-shadow:0 0 0 0 " + primaryAlpha80 + ";}",
      "  70%{box-shadow:0 0 0 14px rgba(0,0,0,0);}",
      "  100%{box-shadow:0 0 0 0 rgba(0,0,0,0);}",
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
      "  position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;",
      "  background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:none;",
      "  align-items:center;justify-content:center;border:2px solid #fff;",
      "}",
      ".cf360-badge--show{display:flex;}",

      // Chat window
      ".cf360-window{",
      "  position:absolute;bottom:72px;" + (posRight ? "right:0;" : "left:0;"),
      "  width:380px;height:520px;border-radius:16px;overflow:hidden;",
      "  background:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.18);",
      "  display:flex;flex-direction:column;",
      "  opacity:0;transform:translateY(16px) scale(0.95);pointer-events:none;",
      "  transition:opacity 0.25s ease,transform 0.25s ease;",
      "}",
      ".cf360-window--open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}",

      // Expanded panel mode (desktop only)
      ".cf360-window--expanded{",
      "  position:fixed;top:0;right:0;bottom:0;width:420px;height:100vh;",
      "  border-radius:0;box-shadow:-4px 0 24px rgba(0,0,0,0.15);",
      "}",

      // Header
      ".cf360-header{",
      "  background:" + primaryColor + ";color:#fff;padding:16px 20px;display:flex;",
      "  align-items:center;justify-content:space-between;flex-shrink:0;",
      "}",
      ".cf360-header-title{font-size:16px;font-weight:600;}",
      ".cf360-header-actions{display:flex;align-items:center;gap:4px;}",
      ".cf360-header-btn{background:none;border:none;color:#fff;cursor:pointer;padding:4px;",
      "  border-radius:6px;display:flex;align-items:center;justify-content:center;opacity:0.85;transition:opacity 0.15s;}",
      ".cf360-header-btn:hover{opacity:1;}",
      ".cf360-header-btn svg{width:20px;height:20px;fill:currentColor;}",
      ".cf360-header-btn--expand{display:none;}",
      "@media (min-width:481px){.cf360-header-btn--expand{display:flex;}}",

      // Messages area
      ".cf360-messages{",
      "  flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;",
      "  background:#fafafa;",
      "}",
      ".cf360-messages::-webkit-scrollbar{width:5px;}",
      ".cf360-messages::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px;}",

      // Message bubbles
      ".cf360-msg{max-width:80%;padding:10px 14px;border-radius:14px;word-wrap:break-word;font-size:14px;line-height:1.45;}",
      ".cf360-msg--visitor{",
      "  align-self:flex-start;background:#e9ecef;color:#1a1a1a;border-bottom-left-radius:4px;",
      "}",
      ".cf360-msg--ai,.cf360-msg--agent{",
      "  align-self:flex-end;background:" + primaryAlpha15 + ";color:#1a1a1a;border-bottom-right-radius:4px;",
      "}",
      ".cf360-msg--system{",
      "  align-self:center;background:transparent;color:#888;font-size:12px;font-style:italic;",
      "  text-align:center;padding:6px 10px;",
      "}",
      ".cf360-msg-time{font-size:11px;color:#999;margin-top:4px;}",

      // Typing indicator
      ".cf360-typing{align-self:flex-end;display:flex;align-items:center;gap:4px;padding:10px 14px;",
      "  background:" + primaryAlpha15 + ";border-radius:14px;border-bottom-right-radius:4px;}",
      "@keyframes cf360-dot{0%,80%,100%{opacity:0.3;transform:scale(0.8);}40%{opacity:1;transform:scale(1);}}",
      ".cf360-typing-dot{width:7px;height:7px;border-radius:50%;background:" + primaryColor + ";}",
      ".cf360-typing-dot:nth-child(1){animation:cf360-dot 1.2s 0s infinite;}",
      ".cf360-typing-dot:nth-child(2){animation:cf360-dot 1.2s 0.2s infinite;}",
      ".cf360-typing-dot:nth-child(3){animation:cf360-dot 1.2s 0.4s infinite;}",

      // Connecting banner
      ".cf360-connecting{",
      "  padding:8px 16px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;",
      "  flex-shrink:0;display:none;",
      "}",
      ".cf360-connecting--show{display:block;}",
      ".cf360-connecting--connected{background:#e0f5f5;color:#0d6e6e;}",

      // Input area
      ".cf360-input-area{",
      "  display:flex;align-items:center;padding:12px 16px 6px;gap:8px;border-top:1px solid #e5e5e5;",
      "  background:#fff;flex-shrink:0;",
      "}",
      ".cf360-input{",
      "  flex:1;border:1px solid #ddd;border-radius:24px;padding:10px 16px;font-size:14px;",
      "  outline:none;resize:none;font-family:inherit;background:#f9fafb;color:#1a1a1a;",
      "  transition:border-color 0.15s;",
      "}",
      ".cf360-input:focus{border-color:" + primaryColor + ";}",
      ".cf360-input::placeholder{color:#aaa;}",
      ".cf360-send-btn{",
      "  width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;",
      "  background:" + primaryColor + ";color:#fff;display:flex;align-items:center;justify-content:center;",
      "  transition:opacity 0.15s,transform 0.15s;outline:none;",
      "}",
      ".cf360-send-btn:hover{opacity:0.9;}",
      ".cf360-send-btn:active{transform:scale(0.92);}",
      ".cf360-send-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;}",
      ".cf360-send-btn svg{width:18px;height:18px;fill:currentColor;}",

      // End conversation badge
      ".cf360-end-conv{",
      "  display:none;padding:0 16px 0;flex-shrink:0;background:#fff;",
      "}",
      ".cf360-end-conv--show{display:block;}",
      ".cf360-end-conv button{",
      "  background:#0f1c2e;border:none;cursor:pointer;font-size:10px;color:#fff;",
      "  padding:3px 10px;border-radius:10px;font-family:inherit;transition:opacity 0.15s;",
      "}",
      ".cf360-end-conv button:hover{opacity:0.8;}",

      // Confirm dialog
      ".cf360-confirm{",
      "  display:none;padding:10px 16px;background:#fafafa;border-top:1px solid #e5e5e5;",
      "  flex-shrink:0;text-align:center;",
      "}",
      ".cf360-confirm--show{display:block;}",
      ".cf360-confirm-text{font-size:12px;color:#555;margin-bottom:8px;}",
      ".cf360-confirm-actions{display:flex;gap:8px;justify-content:center;}",
      ".cf360-confirm-btn{",
      "  border:none;cursor:pointer;font-size:12px;font-family:inherit;",
      "  padding:5px 16px;border-radius:6px;font-weight:500;transition:opacity 0.15s;",
      "}",
      ".cf360-confirm-btn:hover{opacity:0.85;}",
      ".cf360-confirm-btn--yes{background:#0f1c2e;color:#fff;}",
      ".cf360-confirm-btn--no{background:#e5e5e5;color:#333;}",

      // New conversation button
      ".cf360-new-conv{",
      "  padding:8px 16px;background:#f0f0f0;border:none;cursor:pointer;font-size:13px;",
      "  color:" + primaryColor + ";font-weight:600;text-align:center;width:100%;",
      "  transition:background 0.15s;flex-shrink:0;display:none;",
      "}",
      ".cf360-new-conv:hover{background:#e4e4e4;}",
      ".cf360-new-conv--show{display:block;}",

      // Footer
      ".cf360-footer{",
      "  padding:8px;text-align:center;font-size:11px;color:#aaa;flex-shrink:0;",
      "  background:#fff;border-top:1px solid #f0f0f0;",
      "}",
      ".cf360-footer a{color:#aaa;text-decoration:none;font-weight:600;transition:color 0.15s;}",
      ".cf360-footer a:hover{color:" + primaryColor + ";}",

      // Welcome state (empty messages)
      ".cf360-welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "  flex:1;padding:32px;text-align:center;color:#888;gap:12px;}",
      ".cf360-welcome-icon{width:48px;height:48px;border-radius:50%;background:" + primaryAlpha15 + ";",
      "  display:flex;align-items:center;justify-content:center;}",
      ".cf360-welcome-icon svg{width:24px;height:24px;fill:" + primaryColor + ";}",
      ".cf360-welcome-text{font-size:15px;font-weight:500;color:#555;}",
      ".cf360-welcome-sub{font-size:13px;color:#999;}",

      // Mobile fullscreen
      "@media (max-width:480px){",
      "  .cf360-container{bottom:0 !important;right:0 !important;left:0 !important;}",
      "  .cf360-window{",
      "    position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;",
      "    border-radius:0;max-height:none;",
      "  }",
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
  var typingEl, connectingEl, newConvBtn, endConvEl, confirmEl, expandBtn;
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

    // Header
    var header = el("div", "cf360-header");
    var title = el("span", "cf360-header-title");
    title.textContent = t("chatWithUs");
    var headerActions = el("div", "cf360-header-actions");
    expandBtn = el("button", "cf360-header-btn cf360-header-btn--expand");
    expandBtn.setAttribute("aria-label", "Expand");
    expandBtn.innerHTML = ICON_EXPAND;
    var closeBtn = el("button", "cf360-header-btn");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = ICON_CLOSE;
    headerActions.appendChild(expandBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(title);
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
    var wrapper = el("div", "cf360-msg cf360-msg--" + senderType);
    wrapper.textContent = msg.content || "";

    if (msg.createdAt) {
      var timeEl = el("div", "cf360-msg-time");
      timeEl.textContent = formatTime(msg.createdAt);
      wrapper.appendChild(timeEl);
    }

    return wrapper;
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
      message: text
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
    showWelcome();
    inputField.focus();
  }

  function showEndConfirm() {
    endConvEl.classList.remove("cf360-end-conv--show");
    confirmEl.classList.add("cf360-confirm--show");
  }

  function confirmEndConversation() {
    confirmEl.classList.remove("cf360-confirm--show");
    closeConversationApi(state.conversationId);
    startNewConversation();
  }

  function cancelEndConversation() {
    confirmEl.classList.remove("cf360-confirm--show");
    endConvEl.classList.add("cf360-end-conv--show");
  }

  // ─── Init ─────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildDOM();
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
