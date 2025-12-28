const API_LIST = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLg5BCWRDxHj39nKbSdLQpxgXe3v1jkfpB1y2LvhfTWnz0FsLSVJSUP75vom3aE-c7DMhHF7Ej1hdynpx69lkr4cjpQVjVygUji36ofWkNhH-90QTA6CzBl5yU--gXoEZDl-NwSydMAVs_tDlMxtALrn54ATbLqmE6qZ7GkXc6lWH82BrD58L-DgFOmS3SfqgI3RPYdwbrCIm1OrizM9jWgBzhho5nwONyQOcNO8r6s0KGRKj_kFgvgyV4J_utyOfBme04Y0JwYYLMfuAPwJ8jFROzfLAA&lib=M4JruGeuSbuyEj-RXPzQaUaaZ4aZnzWxY"
const API_EXEC = "https://script.google.com/macros/s/AKfycbxR533VEsnctfiJ5qmb1H3srZX3LMRT3oWCUsLKaNP5pkXXQ-HU6ufU2AQULk5a3LQM/exec"

// ================== HELPERS ==================
function formatearFecha(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return ""
  }
}

// ================== APP ==================
function init() {
  // HEADER
  const header = document.querySelector("header")
  const seccionTitulo = document.createElement("section")
  seccionTitulo.className = "titulo"
  header.appendChild(seccionTitulo)

  const marca = document.createElement("div")
  marca.className = "marca"
  seccionTitulo.appendChild(marca)

  const bloqueTit = document.createElement("div")
  seccionTitulo.appendChild(bloqueTit)

  const h1 = document.createElement("h1")
  h1.innerText = "Admin"
  bloqueTit.appendChild(h1)

  const sub = document.createElement("p")
  sub.className = "sub"
  sub.innerText = "Escribí mensajitos y quedarán guardados para siempre 💌"
  bloqueTit.appendChild(sub)

  // MAIN
  const main = document.querySelector("main")

  // HERO
  const hero = document.createElement("section")
  hero.className = "hero"
  main.appendChild(hero)

  const heroMensaje = document.createElement("p")
  heroMensaje.className = "hero-mensaje"
  heroMensaje.innerText = "Cargando..."
  hero.appendChild(heroMensaje)

  const heroFecha = document.createElement("p")
  heroFecha.className = "hero-fecha"
  hero.appendChild(heroFecha)

  // FORM
  const seccionAgregar = document.createElement("section")
  seccionAgregar.className = "agregarMensaje"
  main.appendChild(seccionAgregar)

  const labelTexto = document.createElement("label")
  labelTexto.innerText = "Mensajito:"
  labelTexto.htmlFor = "texto-msg"
  seccionAgregar.appendChild(labelTexto)

  const textareaTexto = document.createElement("textarea")
  textareaTexto.id = "texto-msg"
  textareaTexto.rows = 3
  textareaTexto.placeholder = "Ej: Te amo"
  seccionAgregar.appendChild(textareaTexto)

  const filaBotones = document.createElement("div")
  filaBotones.className = "fila-botones"
  seccionAgregar.appendChild(filaBotones)

  const btnGuardar = document.createElement("button")
  btnGuardar.innerText = "Guardar 💌"
  filaBotones.appendChild(btnGuardar)

  const btnRecargar = document.createElement("button")
  btnRecargar.className = "secundario"
  btnRecargar.innerText = "Recargar"
  filaBotones.appendChild(btnRecargar)

  // Timeline
  const timeline = document.createElement("section")
  timeline.className = "timeline"
  main.appendChild(timeline)

  // ================== API ==================
  async function cargarMensajes() {
    try {
      const resp = await fetch(API_LIST, { cache: "no-store" })
      const mensajes = await resp.json()

      mensajes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      if (mensajes.length) {
        heroMensaje.innerText = mensajes[0].mensaje || ""
        heroFecha.innerText = formatearFecha(mensajes[0].timestamp)
      } else {
        heroMensaje.innerText = "Todavía no hay mensajitos ✨"
        heroFecha.innerText = ""
      }

      timeline.innerHTML = ""
      mensajes.forEach(m => {
        const card = document.createElement("article")
        card.className = "msg-card"

        const p = document.createElement("p")
        p.className = "msg-texto"
        p.innerText = m.mensaje || ""
        card.appendChild(p)

        const f = document.createElement("p")
        f.className = "msg-fecha"
        f.innerText = m.timestamp ? formatearFecha(m.timestamp) : ""
        card.appendChild(f)

        timeline.appendChild(card)
      })
    } catch (err) {
      console.error("Error cargarMensajes:", err)
      heroMensaje.innerText = "No pude cargar 😕 (mirá consola)"
      heroFecha.innerText = ""
    }
  }

  async function guardarMensaje(mensaje) {
    const m = (mensaje || "").trim()
    if (!m) return

    const url = API_EXEC
      + "?modo=add"
      + "&mensaje=" + encodeURIComponent(m)

    try {
      await fetch(url)
      await cargarMensajes()
    } catch (err) {
      console.error("Error guardarMensaje:", err)
    }
  }

  // ================== EVENTOS ==================
  btnGuardar.addEventListener("click", () => {
    guardarMensaje(textareaTexto.value)
    textareaTexto.value = ""
    textareaTexto.focus()
  })

  btnRecargar.addEventListener("click", cargarMensajes)

  textareaTexto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      btnGuardar.click()
    }
  })

  cargarMensajes()
}

// Si crashea algo, al menos lo vas a ver en consola.
try {
  window.addEventListener("load", init)
} catch (e) {
  console.error("Init crash:", e)
}
