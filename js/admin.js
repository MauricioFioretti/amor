// ================== CONFIG (BACKEND WEB APP) ==================
// ⚠️ Pegá acá TU /exec del Apps Script NUEVO (OAuth Protected)
const API_BASE = "https://script.google.com/macros/s/AKfycbxR533VEsnctfiJ5qmb1H3srZX3LMRT3oWCUsLKaNP5pkXXQ-HU6ufU2AQULk5a3LQM/exec";

// ================== CONFIG OAUTH (GIS) ==================
const OAUTH_CLIENT_ID = "914190895179-uo7rd9mevu7hn0cdlkmqdppk4cqqn05a.apps.googleusercontent.com";

const OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets"
].join(" ");

// LocalStorage OAuth
const LS_OAUTH = "amor_admin_oauth_token_v1";        // {access_token, expires_at}
const LS_OAUTH_EMAIL = "amor_admin_oauth_email_v1";  // email para hint

// ================== HELPERS ==================
function formatearFecha(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function loadStoredOAuth() {
  try {
    const raw = localStorage.getItem(LS_OAUTH);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.access_token || !parsed?.expires_at) return null;
    return { access_token: parsed.access_token, expires_at: Number(parsed.expires_at) };
  } catch {
    return null;
  }
}
function saveStoredOAuth(access_token, expires_at) {
  try { localStorage.setItem(LS_OAUTH, JSON.stringify({ access_token, expires_at })); } catch {}
}
function clearStoredOAuth() {
  try { localStorage.removeItem(LS_OAUTH); } catch {}
}
function loadStoredOAuthEmail() {
  try {
    return String(localStorage.getItem(LS_OAUTH_EMAIL) || "").trim().toLowerCase();
  } catch {
    return "";
  }
}
function saveStoredOAuthEmail(email) {
  try { localStorage.setItem(LS_OAUTH_EMAIL, (email || "").toString()); } catch {}
}

// ===== DEBUG: Expirar token para probar reconexión =====
function forceExpireToken() {
  oauthAccessToken = "";
  oauthExpiresAt = 0;
  clearStoredOAuth();

  // opcional: limpiar hint
  // localStorage.removeItem(LS_OAUTH_EMAIL);

  console.warn("[DEBUG] Token expirado localmente. Próximo request debería pedir token de nuevo.");
}

let tokenClient = null;
let oauthAccessToken = "";
let oauthExpiresAt = 0;

function isTokenValid() {
  return !!oauthAccessToken && Date.now() < (oauthExpiresAt - 10_000);
}

function initOAuth() {
  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("GIS no está cargado (falta gsi/client en HTML)");
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: OAUTH_CLIENT_ID,
    scope: OAUTH_SCOPES,
    include_granted_scopes: true,
    use_fedcm_for_prompt: true,
    callback: () => {}
  });
}

function requestAccessToken({ prompt, hint } = {}) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("OAuth no inicializado"));

    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("popup_timeout_or_closed"));
    }, 45_000);

    tokenClient.callback = (resp) => {
      if (done) return;
      done = true;
      clearTimeout(timer);

      if (!resp || resp.error) {
        const err = String(resp?.error || "oauth_error");
        const sub = String(resp?.error_subtype || "");
        const msg = (err + (sub ? `:${sub}` : "")).toLowerCase();

        const e = new Error(err);
        e.isCanceled =
          msg.includes("popup_closed") ||
          msg.includes("popup_closed_by_user") ||
          msg.includes("access_denied") ||
          msg.includes("user_cancel") ||
          msg.includes("interaction_required");
        return reject(e);
      }

      const accessToken = resp.access_token;
      const expiresIn = Number(resp.expires_in || 3600);
      const expiresAt = Date.now() + (expiresIn * 1000);

      oauthAccessToken = accessToken;
      oauthExpiresAt = expiresAt;
      saveStoredOAuth(accessToken, expiresAt);

      resolve({ access_token: accessToken, expires_at: expiresAt });
    };

    const req = {};
    if (prompt !== undefined) req.prompt = prompt;
    if (hint && String(hint).includes("@")) req.hint = hint;

    try {
      tokenClient.requestAccessToken(req);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

async function ensureOAuthToken(allowInteractive = false, interactivePrompt = "consent") {
  if (isTokenValid()) return oauthAccessToken;

  const stored = loadStoredOAuth();
  if (stored?.access_token && stored?.expires_at && Date.now() < (stored.expires_at - 10_000)) {
    oauthAccessToken = stored.access_token;
    oauthExpiresAt = Number(stored.expires_at);
    return oauthAccessToken;
  }

  const hintEmail = (loadStoredOAuthEmail() || "").trim().toLowerCase();

  // Silent real (prompt:"") — intentar SIEMPRE, aunque no haya hint
  try {
    await requestAccessToken({ prompt: "", hint: hintEmail || undefined });
    if (isTokenValid()) return oauthAccessToken;
  } catch (e) {
    if (!allowInteractive) throw new Error("TOKEN_NEEDS_INTERACTIVE");
  }

  // Interactivo (con click del usuario)
  await requestAccessToken({ prompt: interactivePrompt ?? "consent", hint: hintEmail || undefined });

  if (!isTokenValid()) throw new Error("TOKEN_NEEDS_INTERACTIVE");
  return oauthAccessToken;
}

async function fetchUserEmailFromToken(accessToken) {
  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error("No se pudo obtener userinfo");
  const data = await r.json();
  return (data?.email || "").toString();
}

// ================== API (POST text/plain) ==================
async function apiPost_(payload) {
  let r, text;

  try {
    r = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload || {}),
      cache: "no-store",
      redirect: "follow"
    });
  } catch (e) {
    return { ok: false, error: "network_error", detail: String(e?.message || e) };
  }

  try {
    text = await r.text();
  } catch (e) {
    return { ok: false, error: "read_error", status: r.status, detail: String(e?.message || e) };
  }

  if (!r.ok) {
    return { ok: false, error: "http_error", status: r.status, detail: (text || "").slice(0, 800) };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "non_json", status: r.status, detail: (text || "").slice(0, 800) };
  }
}

async function apiCall(mode, payload = {}, opts = {}) {
  const allowInteractive = !!opts.allowInteractive;

  const token = await ensureOAuthToken(allowInteractive, opts.interactivePrompt || "consent");

  // guardar email hint
  try {
    const email = await fetchUserEmailFromToken(token);
    if (email) saveStoredOAuthEmail(email);
  } catch {}

  const body = { mode, access_token: token, ...(payload || {}) };

  let data = await apiPost_(body);

  if (!data?.ok && (data?.error === "missing_scope" || data?.error === "auth_required" || data?.error === "wrong_audience")) {
    const token2 = await ensureOAuthToken(true, "consent");
    body.access_token = token2;
    data = await apiPost_(body);
  }

  return data || { ok: false, error: "empty_response" };
}

// ================== APP ==================
function init() {
  // HEADER
  const header = document.querySelector("header");
  const seccionTitulo = document.createElement("section");
  seccionTitulo.className = "titulo";
  header.appendChild(seccionTitulo);

  const marca = document.createElement("div");
  marca.className = "marca";
  seccionTitulo.appendChild(marca);

  const bloqueTit = document.createElement("div");
  seccionTitulo.appendChild(bloqueTit);

  const h1 = document.createElement("h1");
  h1.innerText = "Admin";
  bloqueTit.appendChild(h1);

  const sub = document.createElement("p");
  sub.className = "sub";
  sub.innerText = "Escribí mensajitos y quedarán guardados para siempre 💌";
  bloqueTit.appendChild(sub);

  // MAIN
  const main = document.querySelector("main");

  // HERO
  const hero = document.createElement("section");
  hero.className = "hero";
  main.appendChild(hero);

  const heroMensaje = document.createElement("p");
  heroMensaje.className = "hero-mensaje";
  heroMensaje.innerText = "Cargando...";
  hero.appendChild(heroMensaje);

  const heroFecha = document.createElement("p");
  heroFecha.className = "hero-fecha";
  hero.appendChild(heroFecha);

  // FORM
  const seccionAgregar = document.createElement("section");
  seccionAgregar.className = "agregarMensaje";
  main.appendChild(seccionAgregar);

  const labelTexto = document.createElement("label");
  labelTexto.innerText = "Mensajito:";
  labelTexto.htmlFor = "texto-msg";
  seccionAgregar.appendChild(labelTexto);

  const textareaTexto = document.createElement("textarea");
  textareaTexto.id = "texto-msg";
  textareaTexto.rows = 3;
  textareaTexto.placeholder = "Ej: Te amo";
  seccionAgregar.appendChild(textareaTexto);

  const filaBotones = document.createElement("div");
  filaBotones.className = "fila-botones";
  seccionAgregar.appendChild(filaBotones);

  const btnGuardar = document.createElement("button");
  btnGuardar.innerText = "Guardar 💌";
  filaBotones.appendChild(btnGuardar);

  const btnRecargar = document.createElement("button");
  btnRecargar.className = "secundario";
  btnRecargar.innerText = "Recargar";
  filaBotones.appendChild(btnRecargar);

  // Timeline
  const timeline = document.createElement("section");
  timeline.className = "timeline";
  main.appendChild(timeline);

  async function renderMensajes(mensajes) {
    mensajes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (mensajes.length) {
      heroMensaje.innerText = mensajes[0].mensaje || "";
      heroFecha.innerText = formatearFecha(mensajes[0].timestamp);
    } else {
      heroMensaje.innerText = "Todavía no hay mensajitos ✨";
      heroFecha.innerText = "";
    }

    timeline.innerHTML = "";
    mensajes.forEach(m => {
      const card = document.createElement("article");
      card.className = "msg-card";

      const p = document.createElement("p");
      p.className = "msg-texto";
      p.innerText = m.mensaje || "";
      card.appendChild(p);

      const f = document.createElement("p");
      f.className = "msg-fecha";
      f.innerText = m.timestamp ? formatearFecha(m.timestamp) : "";
      card.appendChild(f);

      timeline.appendChild(card);
    });
  }

  async function cargarMensajes({ allowInteractive } = { allowInteractive: false }) {
    try {
      const resp = await apiCall("get", {}, { allowInteractive });
      if (!resp?.ok) throw new Error(resp?.error || "get_failed");
      const mensajes = Array.isArray(resp?.mensajes) ? resp.mensajes : [];
      await renderMensajes(mensajes);
    } catch (err) {
      console.error("Error cargarMensajes:", err);
      const msg = String(err?.message || err || "");
      if (msg === "TOKEN_NEEDS_INTERACTIVE") {
        heroMensaje.innerText = "Necesitás iniciar sesión para administrar 💌";
        heroFecha.innerText = "";
        return;
      }
      heroMensaje.innerText = "No pude cargar 😕 (mirá consola)";
      heroFecha.innerText = "";
    }
  }

  async function guardarMensaje(mensaje, { allowInteractive } = { allowInteractive: false }) {
    const m = (mensaje || "").trim();
    if (!m) return;

    try {
      const resp = await apiCall("add", { mensaje: m }, { allowInteractive });
      if (!resp?.ok) throw new Error(resp?.error || "add_failed");
      await cargarMensajes({ allowInteractive: false });
    } catch (err) {
      console.error("Error guardarMensaje:", err);
      const msg = String(err?.message || err || "");
      if (msg === "TOKEN_NEEDS_INTERACTIVE") {
        // si estaba sin sesión, intentamos interactivo por acción del usuario (click)
        await apiCall("add", { mensaje: m }, { allowInteractive: true });
        await cargarMensajes({ allowInteractive: false });
        return;
      }
    }
  }

  // EVENTOS
  btnGuardar.addEventListener("click", async () => {
    await guardarMensaje(textareaTexto.value, { allowInteractive: true }); // click => permitido popup si hace falta
    textareaTexto.value = "";
    textareaTexto.focus();
  });

  btnRecargar.addEventListener("click", () => cargarMensajes({ allowInteractive: true }));

  textareaTexto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      btnGuardar.click();
    }
  });

  // INIT load: intento silencioso primero
  cargarMensajes({ allowInteractive: false });

  // auto-refresh token (evita popups)
  setInterval(async () => {
    try {
      if (document.visibilityState !== "visible") return;
      if (!oauthAccessToken) return;
      if (Date.now() < (oauthExpiresAt - 120_000)) return;
      await ensureOAuthToken(false);
    } catch {}
  }, 20_000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    cargarMensajes({ allowInteractive: false });
  });
}

// INIT seguro
try {
  window.addEventListener("load", () => {
    try {
      initOAuth();

      const stored = loadStoredOAuth();
      if (stored?.access_token && Date.now() < (stored.expires_at - 10_000)) {
        oauthAccessToken = stored.access_token;
        oauthExpiresAt = stored.expires_at;
      }
    } catch {}

    init();
  });
} catch (e) {
  console.error("Init crash:", e);
}
