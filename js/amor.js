// ================== CONFIG (DIRECT GOOGLE SHEETS API) ==================
// ✅ Directo a Google Sheets API (como tu página de comidas) => más rápido
const SPREADSHEET_ID = "1fWVZRExk6cnMK3fLHnM3S1pLc0TWk0pJ2dkUFoO0ZcU";
const SHEET_NAME = "Sheet1"; // pestaña/hoja

// ================== CONFIG OAUTH (GIS) ==================
const OAUTH_CLIENT_ID = "914190895179-uo7rd9mevu7hn0cdlkmqdppk4cqqn05a.apps.googleusercontent.com";

const OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly"
].join(" ");

// LocalStorage OAuth
const LS_OAUTH = "amor_oauth_token_v1";        // {access_token, expires_at}
const LS_OAUTH_EMAIL = "amor_oauth_email_v1";  // email para hint

// ================== HEADER ==================
const header = document.querySelector("header");

const seccionTitulo = document.createElement("section");
seccionTitulo.className = "titulo";
header.appendChild(seccionTitulo);

const bloqueTit = document.createElement("div");
seccionTitulo.appendChild(bloqueTit);

const h1 = document.createElement("h1");
h1.innerText = "Mensajitos";
bloqueTit.appendChild(h1);

const sub = document.createElement("p");
sub.className = "sub";
sub.innerText = "💗";
bloqueTit.appendChild(sub);

// ================== MAIN ==================
const main = document.querySelector("main");

// HERO (solo mensajito + fecha)
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

// Timeline
const timeline = document.createElement("section");
timeline.className = "timeline";
main.appendChild(timeline);

// ================== ACTIONS (BOTONES) ==================
const acciones = document.createElement("div");
acciones.className = "acciones";
hero.appendChild(acciones);

const btnLogin = document.createElement("button");
btnLogin.type = "button";
btnLogin.innerText = "Iniciar sesión";
acciones.appendChild(btnLogin);

const btnRecargar = document.createElement("button");
btnRecargar.type = "button";
btnRecargar.className = "secundario";
btnRecargar.innerText = "Recargar";
acciones.appendChild(btnRecargar);

// DEBUG: botón para expirar token a propósito (REMOVIDO de la UI)
// Si querés probar expiración, usá en consola: forceExpireToken();

// Ocultos por defecto: se muestran si hace falta login o si querés recargar manualmente
btnLogin.style.display = "none";
btnRecargar.style.display = "none";

// ================== HELPERS ==================
function formatearFecha(ts) {
  // Soporta:
  // - ISO: "2026-02-01T12:34:56.000Z"
  // - Fecha local: "31/01/2026 10:30" o "31-01-2026 10:30"
  // - Serial de Sheets (número): 45567.5 (días desde 1899-12-30)
  try {
    if (ts === null || ts === undefined) return "";
    const raw = (typeof ts === "string") ? ts.trim() : ts;

    // 1) Si viene como número (serial Sheets) o string numérico
    const n = (typeof raw === "number") ? raw : (typeof raw === "string" && raw !== "" ? Number(raw) : NaN);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      // Google Sheets serial date: days since 1899-12-30
      const ms = Math.round((n - 25569) * 86400 * 1000); // 25569 = días entre 1899-12-30 y 1970-01-01
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
      }
    }

    // 2) Intento parse directo (ISO suele funcionar)
    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) {
      return d1.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
    }

    // 3) Parse dd/mm/yyyy (o dd-mm-yyyy) con hora opcional
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

    // Si ya viene como número (serial Sheets) o string numérico
    const raw = (typeof ts === "string") ? ts.trim() : ts;
    const n = (typeof raw === "number") ? raw : (typeof raw === "string" && raw !== "" ? Number(raw) : NaN);

    if (!Number.isNaN(n) && Number.isFinite(n)) {
      // Google Sheets serial date: days since 1899-12-30
      return Math.round((n - 25569) * 86400 * 1000);
    }

    // ISO u otros formatos que JS entienda
    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) return d1.getTime();

    // dd/mm/yyyy (o dd-mm-yyyy) con hora opcional
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
  // Expira en memoria
  oauthAccessToken = "";
  oauthExpiresAt = 0;

  // Expira en storage
  clearStoredOAuth();

  // (opcional) también podés limpiar el hint si querés testear “sin ayuda”:
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

// prompt: "" (silent), "consent", "select_account"
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

// allowInteractive=false => NO popup
async function ensureOAuthToken(allowInteractive = false, interactivePrompt = "consent") {
  // 1) token en memoria
  if (isTokenValid()) return oauthAccessToken;

  // 2) token guardado válido
  const stored = loadStoredOAuth();
  if (stored?.access_token && stored?.expires_at && Date.now() < (stored.expires_at - 10_000)) {
    oauthAccessToken = stored.access_token;
    oauthExpiresAt = Number(stored.expires_at);
    return oauthAccessToken;
  }

  const hintEmail = (loadStoredOAuthEmail() || "").trim().toLowerCase();

  // 3) Silent real (prompt:"") — intentar SIEMPRE, aunque no haya hint
  try {
    await requestAccessToken({ prompt: "", hint: hintEmail || undefined });
    if (isTokenValid()) return oauthAccessToken;
  } catch (e) {
    // si no se pudo y NO permitimos interactivo => avisar que hace falta click/login
    if (!allowInteractive) throw new Error("TOKEN_NEEDS_INTERACTIVE");
  }

  // 4) Interactivo (con click del usuario)
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
  // payload esperado: { mode, access_token, mensaje? }
  const mode = (payload?.mode || "").toString().toLowerCase();
  const token = (payload?.access_token || "").toString();
  if (!token) return { ok: false, error: "auth_required" };

  const sheetEsc = encodeURIComponent(SHEET_NAME);

  try {
    // ---------- GET (leer mensajes) ----------
    // Lee A (mensaje) y B (timestamp) desde A2:B
    if (mode === "get") {
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}` +
        `/values/${sheetEsc}!A2:B?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      const txt = await r.text();
      if (!r.ok) return { ok: false, error: "get_failed", detail: txt.slice(0, 800) };

      const json = JSON.parse(txt);
      const values = Array.isArray(json?.values) ? json.values : [];

      // Convertimos a tu formato actual {mensaje, timestamp}
      const mensajes = values
        .filter(row => (row?.[0] || "").toString().trim() !== "")
        .map(row => ({
          mensaje: (row?.[0] || "").toString(),
          timestamp: (row?.[1] ?? "")
        }));

      return { ok: true, mensajes };
    }

    // ---------- ADD (agregar mensaje) ----------
    if (mode === "add") {
      const mensaje = (payload?.mensaje || "").toString().trim();
      if (!mensaje) return { ok: false, error: "invalid_data" };

      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}` +
        `/values/${sheetEsc}!A:B:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      const body = {
        values: [[mensaje, new Date().toISOString()]]
      };

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

  // asegurar token
  let token = await ensureOAuthToken(allowInteractive, opts.interactivePrompt || "consent");

  // IMPORTANTE: NO llamamos userinfo acá (es un request extra y enlentece)
  // Si querés guardar hintEmail, lo hacemos SOLO si todavía no existe:
  const hintEmail = (loadStoredOAuthEmail() || "").trim().toLowerCase();
  if (!hintEmail) {
    try {
      const email = await fetchUserEmailFromToken(token);
      if (email) saveStoredOAuthEmail(email);
    } catch {}
  }

  const body = { mode, access_token: token, ...(payload || {}) };

  let data = await apiPost_(body);

  // retry interactivo si auth/scope falló
  if (!data?.ok && (data?.error === "missing_scope" || data?.error === "auth_required")) {
    token = await ensureOAuthToken(true, "consent");
    body.access_token = token;
    data = await apiPost_(body);
  }

  return data || { ok: false, error: "empty_response" };
}

// ================== APP ==================
async function cargarMensajes({ allowInteractive } = { allowInteractive: false }) {
  try {
    const resp = await apiCall("get", {}, { allowInteractive });

    if (!resp?.ok) throw new Error(resp?.error || "get_failed");

    const mensajes = Array.isArray(resp?.mensajes) ? resp.mensajes : [];

    mensajes.sort((a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp));

    if (mensajes.length) {
      heroMensaje.innerText = mensajes[0].mensaje || "";
      heroFecha.innerText = formatearFecha(mensajes[0].timestamp);
    } else {
      heroMensaje.innerText = "Todavía no hay mensajitos ✨";
      heroFecha.innerText = "";
    }

    // si cargó OK, ocultar botón login (ya no hace falta)
    btnLogin.style.display = "none";
    btnRecargar.style.display = "inline-block";

    timeline.innerHTML = "";
    mensajes.slice(1).forEach(m => {
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
  } catch (err) {
    console.error(err);

    const msg = String(err?.message || err || "");
    if (msg === "TOKEN_NEEDS_INTERACTIVE") {
      heroMensaje.innerText = "Necesitás iniciar sesión para ver los mensajitos 💗";
      heroFecha.innerText = "";

      // mostrar botones
      btnLogin.style.display = "inline-block";
      btnRecargar.style.display = "inline-block";
      return;
    }

    heroMensaje.innerText = "No pude cargar los mensajitos 😕";
    heroFecha.innerText = "";

    // ✅ si hubo cualquier problema, dejá SIEMPRE una forma de reconectar
    btnLogin.style.display = "inline-block";
    btnRecargar.style.display = "inline-block";
  }
}

// auto-refresh token (evita popups)
setInterval(async () => {
  try {
    if (document.visibilityState !== "visible") return;
    if (!oauthAccessToken) return;
    if (Date.now() < (oauthExpiresAt - 120_000)) return; // falta >2 min? no hagas nada
    await ensureOAuthToken(false);
  } catch {}
}, 20_000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  cargarMensajes({ allowInteractive: false });
});

// ================== INIT ==================
window.addEventListener("load", async () => {
  try {
    initOAuth();

    const stored = loadStoredOAuth();
    if (stored?.access_token && Date.now() < (stored.expires_at - 10_000)) {
      oauthAccessToken = stored.access_token;
      oauthExpiresAt = stored.expires_at;
    }
  } catch {}

  // intento silencioso primero
  await cargarMensajes({ allowInteractive: false });

  // BOTONES
  btnLogin.addEventListener("click", () => {
    // IMPORTANTE: abrir popup DIRECTO dentro del click (evita bloqueos en Safari/iOS)
    try {
      const hintEmail = (loadStoredOAuthEmail() || "").trim().toLowerCase();

      requestAccessToken({
        prompt: "select_account",
        hint: hintEmail || undefined
      })
        .then(async () => {
          // Ya guardó token en oauthAccessToken/oauthExpiresAt por requestAccessToken()
          // Intentamos cargar (sin forzar popup de nuevo)
          await cargarMensajes({ allowInteractive: false });
        })
        .catch((e) => {
          console.warn("Login cancelado o falló:", e);
          // Dejá los botones visibles para reintentar
          btnLogin.style.display = "inline-block";
          btnRecargar.style.display = "inline-block";
        });
    } catch (e) {
      console.warn("No se pudo iniciar login:", e);
      btnLogin.style.display = "inline-block";
      btnRecargar.style.display = "inline-block";
    }
  });

  btnRecargar.addEventListener("click", async () => {
    // 1) primero intento rápido sin popup
    await cargarMensajes({ allowInteractive: false });

    // 2) si sigue pidiendo login, el usuario usa "Iniciar sesión"
    // (No forzamos popup acá para no molestar)
  });

  // Click en el hero también sirve, pero ahora hay botones visibles
  hero.addEventListener("click", async () => {
    if (isTokenValid()) return;
    await cargarMensajes({ allowInteractive: true });
  }, { once: false });
});

