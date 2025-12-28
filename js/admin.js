// ================== CONFIG ==================
const API_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgAAVjgc-YV96bTkNKfwn467PrqNb7eP6UaFJDXP_5dxVHd_5OE4rxjcuKErNQLIv9GF80ZiA8rJ_--tjBk59NKW6R_DCMDUBzvmkk-gKe8HfYGXpzGXTTkKW4A_stLt5IPPbiymM44MYoCqp3VIgc1dur9hKGQaxu31nhQC2_rTohGX7cw4_9gCIqqIB0UvPmtFIXynTPytF3XL-ui816z_B31iOu611HQ6hcGasgc4cqaloyXLNTuaRDcux-dLbfnZ9PqQDUtEbODgGr2JViO7uOiMA&lib=M4JruGeuSbuyEj-RXPzQaUaaZ4aZnzWxY"

// ================== HEADER ==================
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
sub.innerText = "Escribí mensajes y quedarán guardados para siempre 💌"
bloqueTit.appendChild(sub)

// ================== MAIN ==================
const main = document.querySelector("main")

// HERO (vista previa: último mensaje)
const hero = document.createElement("section")
hero.className = "hero"
main.appendChild(hero)

const heroTop = document.createElement("div")
heroTop.className = "hero-top"
hero.appendChild(heroTop)

const badge = document.createElement("span")
badge.className = "badge"
badge.innerText = "Último mensaje guardado"
heroTop.appendChild(badge)

const heroTitle = document.createElement("h2")
heroTitle.innerText = "Cargando..."
heroTop.appendChild(heroTitle)

const heroMensaje = document.createElement("p")
heroMensaje.className = "hero-mensaje"
heroMensaje.innerText = ""
hero.appendChild(heroMensaje)

const heroFecha = document.createElement("p")
heroFecha.className = "hero-fecha"
heroFecha.innerText = ""
hero.appendChild(heroFecha)

// FORM
const seccionAgregar = document.createElement("section")
seccionAgregar.className = "agregarMensaje"
main.appendChild(seccionAgregar)

const labelTitulo = document.createElement("label")
labelTitulo.innerText = "Título (cortito):"
labelTitulo.htmlFor = "titulo-msg"
seccionAgregar.appendChild(labelTitulo)

const inputTitulo = document.createElement("input")
inputTitulo.type = "text"
inputTitulo.id = "titulo-msg"
inputTitulo.placeholder = "Ej: Hoy pensé en vos"
seccionAgregar.appendChild(inputTitulo)

const labelTexto = document.createElement("label")
labelTexto.innerText = "Mensaje:"
labelTexto.htmlFor = "texto-msg"
seccionAgregar.appendChild(labelTexto)

const textareaTexto = document.createElement("textarea")
textareaTexto.id = "texto-msg"
textareaTexto.rows = 5
textareaTexto.placeholder = "Ej: Te amo. Gracias por existir. Me hacés bien."
seccionAgregar.appendChild(textareaTexto)

const filaBotones = document.createElement("div")
filaBotones.className = "fila-botones"
seccionAgregar.appendChild(filaBotones)

const btnGuardar = document.createElement("button")
btnGuardar.innerText = "Guardar mensaje 💌"
filaBotones.appendChild(btnGuardar)

const btnRecargar = document.createElement("button")
btnRecargar.className = "secundario"
btnRecargar.innerText = "Recargar"
filaBotones.appendChild(btnRecargar)

// Timeline (para que vos también veas historial)
const timeline = document.createElement("section")
timeline.className = "timeline"
main.appendChild(timeline)

// ================== FUNCIONES ==================
function formatearFecha(ts){
  try{
    const d = new Date(ts)
    return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
  }catch{
    return ""
  }
}

async function cargarMensajes(){
  try{
    const resp = await fetch(API_URL)
    const mensajes = await resp.json()

    mensajes.sort((a,b) => {
      const ta = new Date(a.timestamp).getTime() || 0
      const tb = new Date(b.timestamp).getTime() || 0
      return tb - ta
    })

    if(mensajes.length > 0){
      const ultimo = mensajes[0]
      heroTitle.innerText = ultimo.titulo || "Mensaje"
      heroMensaje.innerText = ultimo.mensaje || ""
      heroFecha.innerText = ultimo.timestamp ? formatearFecha(ultimo.timestamp) : ""
    }else{
      heroTitle.innerText = "Todavía no hay mensajes…"
      heroMensaje.innerText = "Escribí el primero abajo ✨"
      heroFecha.innerText = ""
    }

    timeline.innerHTML = ""
    mensajes.forEach((m) => {
      const card = document.createElement("article")
      card.className = "msg-card"

      const h3 = document.createElement("h3")
      h3.innerText = m.titulo || "Mensaje"
      card.appendChild(h3)

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

  }catch(err){
    console.error("Error al cargar mensajes:", err)
    heroTitle.innerText = "No pude cargar los mensajes 😕"
    heroMensaje.innerText = "Revisá publicación/URL del Apps Script."
  }
}

async function guardarMensaje(titulo, mensaje){
  const t = (titulo || "").trim()
  const m = (mensaje || "").trim()
  if(!t || !m) return

  const url = API_URL
    + "?modo=add"
    + "&titulo=" + encodeURIComponent(t)
    + "&mensaje=" + encodeURIComponent(m)

  try{
    await fetch(url)
    await cargarMensajes()
  }catch(err){
    console.error("Error al guardar:", err)
  }
}

// ================== EVENTOS ==================
btnGuardar.addEventListener("click", () => {
  guardarMensaje(inputTitulo.value, textareaTexto.value)
  inputTitulo.value = ""
  textareaTexto.value = ""
  inputTitulo.focus()
})

btnRecargar.addEventListener("click", cargarMensajes)

inputTitulo.addEventListener("keydown", (event) => {
  if(event.key === "Enter"){
    event.preventDefault()
    textareaTexto.focus()
  }
})

window.addEventListener("load", cargarMensajes)
