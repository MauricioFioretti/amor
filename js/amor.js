// ================== CONFIG ==================
const API_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLg5BCWRDxHj39nKbSdLQpxgXe3v1jkfpB1y2LvhfTWnz0FsLSVJSUP75vom3aE-c7DMhHF7Ej1hdynpx69lkr4cjpQVjVygUji36ofWkNhH-90QTA6CzBl5yU--gXoEZDl-NwSydMAVs_tDlMxtALrn54ATbLqmE6qZ7GkXc6lWH82BrD58L-DgFOmS3SfqgI3RPYdwbrCIm1OrizM9jWgBzhho5nwONyQOcNO8r6s0KGRKj_kFgvgyV4J_utyOfBme04Y0JwYYLMfuAPwJ8jFROzfLAA&lib=M4JruGeuSbuyEj-RXPzQaUaaZ4aZnzWxY"

// ================== HEADER ==================
const header = document.querySelector("header")

const seccionTitulo = document.createElement("section")
seccionTitulo.className = "titulo"
header.appendChild(seccionTitulo)

const bloqueTit = document.createElement("div")
seccionTitulo.appendChild(bloqueTit)

const h1 = document.createElement("h1")
h1.innerText = "Mensajitos"
bloqueTit.appendChild(h1)

const sub = document.createElement("p")
sub.className = "sub"
sub.innerText = "💗"
bloqueTit.appendChild(sub)

// ================== MAIN ==================
const main = document.querySelector("main")

// HERO (solo mensajito + fecha)
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

    mensajes.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))

    if(mensajes.length){
      heroMensaje.innerText = mensajes[0].mensaje || ""
      heroFecha.innerText = formatearFecha(mensajes[0].timestamp)
    }else{
      heroMensaje.innerText = "Todavía no hay mensajitos ✨"
      heroFecha.innerText = ""
    }

    // ✅ historial sin repetir el primero + con fecha
    timeline.innerHTML = ""
    mensajes.slice(1).forEach(m => {
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
  }catch(err){
    console.error(err)
    heroMensaje.innerText = "No pude cargar los mensajitos 😕"
    heroFecha.innerText = ""
  }
}


window.addEventListener("load", cargarMensajes)
