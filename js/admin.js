const API_LIST = "Thttps://script.googleusercontent.com/macros/echo?user_content_key=AehSKLg5BCWRDxHj39nKbSdLQpxgXe3v1jkfpB1y2LvhfTWnz0FsLSVJSUP75vom3aE-c7DMhHF7Ej1hdynpx69lkr4cjpQVjVygUji36ofWkNhH-90QTA6CzBl5yU--gXoEZDl-NwSydMAVs_tDlMxtALrn54ATbLqmE6qZ7GkXc6lWH82BrD58L-DgFOmS3SfqgI3RPYdwbrCIm1OrizM9jWgBzhho5nwONyQOcNO8r6s0KGRKj_kFgvgyV4J_utyOfBme04Y0JwYYLMfuAPwJ8jFROzfLAA&lib=M4JruGeuSbuyEj-RXPzQaUaaZ4aZnzWxY"
const API_EXEC = "https://script.google.com/macros/s/AKfycbxR533VEsnctfiJ5qmb1H3srZX3LMRT3oWCUsLKaNP5pkXXQ-HU6ufU2AQULk5a3LQM/exec"

// ... (todo tu armado del DOM igual) ...

async function cargarMensajes(){
  try{
    const resp = await fetch(API_LIST)
    const mensajes = await resp.json()

    mensajes.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))

    if(mensajes.length){
      heroTitle.innerText = "Último mensajito"
      heroMensaje.innerText = mensajes[0].mensaje || ""
      heroFecha.innerText = formatearFecha(mensajes[0].timestamp)
    }else{
      heroTitle.innerText = "Todavía no hay mensajitos…"
      heroMensaje.innerText = "Escribí el primero abajo ✨"
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

      timeline.appendChild(card)
    })
  }catch(err){
    console.error(err)
  }
}

async function guardarMensaje(mensaje){
  const m = (mensaje || "").trim()
  if(!m) return

  const url = API_EXEC
    + "?modo=add"
    + "&mensaje=" + encodeURIComponent(m)

  await fetch(url)
  await cargarMensajes()
}

btnGuardar.addEventListener("click", () => {
  guardarMensaje(textareaTexto.value)
  textareaTexto.value = ""
  textareaTexto.focus()
})

btnRecargar.addEventListener("click", cargarMensajes)
window.addEventListener("load", cargarMensajes)

