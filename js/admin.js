// ================== CONFIG (DIRECT GOOGLE SHEETS API) ==================
const SPREADSHEET_ID = "1fWVZRExk6cnMK3fLHnM3S1pLc0TWk0pJ2dkUFoO0ZcU";
const SHEET_NAME = "Sheet1";

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
    if (ts === null || ts === undefined) return "";
    const raw = (typeof ts === "string") ? ts.trim() : ts;

    const n = (typeof raw === "number") ? raw : (typeof raw === "string" && raw !== "" ? Number(raw) : NaN);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      const ms = Math.round((n - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
      }
    }

    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) {
      return d1.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
    }

    const m = String(raw).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const hh = Number(m[4] || 0);
      const mi = Number(m[5] || 0);
      const ss = Number(m[6] || 0);
      const d2 = new Date(yyyy, mm - 1, dd, hh, mi, ss);
      if (!isNaN(d2.getTime())) {
        return d2.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
      }
    }

    return "";
  } catch {
    return "";
  }
}

function timestampToMs(ts) {
  // Devuelve milisegundos desde Epoch (Number) o 0 si no se puede parsear.
  try {
    if (ts === null || ts === undefined) return 0;

    const raw = (typeof ts === "string") ? ts.trim() : ts;

    // 1) Número (serial Sheets) o string numérico
    const n = (typeof raw === "number")
      ? raw
      : (typeof raw === "string" && raw !== "" ? Number(raw) : NaN);

    if (!Number.isNaN(n) && Number.isFinite(n)) {
      // Sheets serial: days since 1899-12-30
      return Math.round((n - 25569) * 86400 * 1000);
    }

    // 2) ISO u otro formato parseable por Date()
    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) return d1.getTime();

    // 3) dd/mm/yyyy (o dd-mm-yyyy) con hora opcional
    const m = String(raw).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const hh = Number(m[4] || 0);
      const mi = Number(m[5] || 0);
      const ss = Number(m[6] || 0);
      const d2 = new Date(yyyy, mm - 1, dd, hh, mi, ss);
      if (!isNaN(d2.getTime())) return d2.getTime();
    }

    return 0;
  } catch {
    return 0;
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
// ================== API (DIRECT GOOGLE SHEETS API) ==================
async function apiPost_(payload) {
  const mode = (payload?.mode || "").toString().toLowerCase();
  const token = (payload?.access_token || "").toString();
  if (!token) return { ok: false, error: "auth_required" };

  const sheetEsc = encodeURIComponent(SHEET_NAME);

  try {
    if (mode === "get") {
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}` +
        `/values/${sheetEsc}!A2:D?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      const txt = await r.text();
      if (!r.ok) return { ok: false, error: "get_failed", detail: txt.slice(0, 800) };

      const json = JSON.parse(txt);
      const values = Array.isArray(json?.values) ? json.values : [];

      const mensajes = values
        .map((row, idx) => {
          const mensaje = (row?.[0] || "").toString();
          const timestamp = (row?.[1] ?? "");
          const likedRaw = (row?.[2] ?? "");
          const likedAt = (row?.[3] ?? "");

          const likedStr = (likedRaw ?? "").toString().trim().toLowerCase();
          const liked = likedStr === "true" || likedStr === "1" || likedStr === "yes" || likedStr === "si";

          return {
            rowNumber: idx + 2,
            mensaje,
            timestamp,
            liked,
            liked_at: likedAt
          };
        })
        .filter(m => (m.mensaje || "").trim() !== "");

      return { ok: true, mensajes };
    }

    if (mode === "add") {
      const mensaje = (payload?.mensaje || "").toString().trim();
      if (!mensaje) return { ok: false, error: "invalid_data" };

      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}` +
        `/values/${sheetEsc}!A:B:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      const body = { values: [[mensaje, new Date().toISOString()]] };

      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const txt = await r.text();
      if (!r.ok) return { ok: false, error: "add_failed", detail: txt.slice(0, 800) };

      return { ok: true };
    }

    return { ok: false, error: "bad_mode" };
  } catch (e) {
    return { ok: false, error: "network_error", detail: String(e?.message || e) };
  }
}

async function apiCall(mode, payload = {}, opts = {}) {
  const allowInteractive = !!opts.allowInteractive;

  let token = await ensureOAuthToken(allowInteractive, opts.interactivePrompt || "consent");

  // Guardar hintEmail SOLO si falta (evita request extra)
  const hintEmail = (loadStoredOAuthEmail() || "").trim().toLowerCase();
  if (!hintEmail) {
    try {
      const email = await fetchUserEmailFromToken(token);
      if (email) saveStoredOAuthEmail(email);
    } catch {}
  }

  const body = { mode, access_token: token, ...(payload || {}) };

  let data = await apiPost_(body);

  if (!data?.ok && (data?.error === "missing_scope" || data?.error === "auth_required")) {
    token = await ensureOAuthToken(true, "consent");
    body.access_token = token;
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
    mensajes.sort((a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp));

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

      const topRow = document.createElement("div");
      topRow.className = "msg-toprow";
      card.appendChild(topRow);

      const p = document.createElement("p");
      p.className = "msg-texto";
      p.innerText = m.mensaje || "";
      topRow.appendChild(p);

      const likeView = document.createElement("span");
      likeView.className = "like-view";
      likeView.innerText = m.liked ? "Leído" : "No leído";
      topRow.appendChild(likeView);

      const f = document.createElement("p");
      f.className = "msg-fecha";
      f.innerText = m.timestamp ? formatearFecha(m.timestamp) : "";
      card.appendChild(f);

      if (m.liked && m.liked_at) {
        const fa = document.createElement("p");
        fa.className = "msg-fecha";
        fa.innerText = "Marcado: " + formatearFecha(m.liked_at);
        card.appendChild(fa);
      }

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
