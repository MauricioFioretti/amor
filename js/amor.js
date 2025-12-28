// ================== CONFIG ==================
const API_URL = "PON_AQUI_TU_URL_DEL_APPS_SCRIPT"

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
h1.innerText = "Cartitas para vos"
bloqueTit.appendChild(h1)

const sub = document.createElement("p")
sub.className = "sub"
sub.innerText = "Un pedacito de lo que siento, guardado para siempre 💗"
bloqueTit.appendChild(sub)

// ================== MAIN ==================
const main = document.querySelector("main")

// HERO
const hero = document.createElement("section")
hero.className = "hero"
main.appendChild(hero)

const heroTop = document.createElement("div")
heroTop.className = "hero-top"
hero.appendChild(heroTop)

const badge = document.createElement("span")
badge.className = "badge"
badge.innerText = "Último mensaje"
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

// Timeline
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
      heroMensaje.innerText = "Pronto vas a tener el primero ✨"
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
    heroMensaje.innerText = "Revisá que la URL del Apps Script esté bien publicada."
  }
}

window.addEventListener("load", cargarMensajes)
