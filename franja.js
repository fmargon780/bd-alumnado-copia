/* La franja amarilla de la web nueva (instrucción 159, docs/WEB-NUEVA-A-TIEMPO.md). Lee `_cambio.json` de la carpeta privada (lo escribe el turno del disparador, WebTurno.gs): { cambio, hecho, datosDe }.
   Si hay un cambio sin atender (`cambio` > `hecho`) desde hace más de 5 minutos, arriba sale «Estos datos son de las HH:MM. Se están poniendo al día.»; cuando los datos llegan, la franja desaparece sola, sin recargar
   (y la página recibe el aviso `web-datos-al-dia`). Se vuelve a mirar cada 30 segundos. Sin carpeta o sin el fichero, no sale nada. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, FICHERO = '_cambio.json', LIMITE_MS = 5 * 60 * 1000, CADA_MS = 30000;
  if (!C) return;
  var franja = null, visible = false, iniciado = false;

  function hora(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
  }
  function poner(texto) {
    if (!franja) {
      franja = document.createElement('div'); franja.id = 'franjaAtraso'; franja.className = 'franja-atraso'; franja.setAttribute('role', 'status');
      var menu = document.getElementById('menu');
      if (menu && menu.parentNode) menu.parentNode.insertBefore(franja, menu.nextSibling); else document.body.insertBefore(franja, document.body.firstChild);
    }
    franja.textContent = texto; franja.hidden = false;
  }
  async function mirar() {
    var f;
    try { f = await C.leerJson(FICHERO); } catch (e) { return; }
    if (!f || typeof f.cambio !== 'number') return;
    if (f.cambio > (f.hecho || 0) && Date.now() - f.cambio > LIMITE_MS) {
      var h = hora(f.datosDe);
      poner(h ? 'Estos datos son de las ' + h + '. Se están poniendo al día.' : 'Estos datos no son los últimos. Se están poniendo al día.');
      visible = true;
    } else if (visible) {
      if (franja) franja.hidden = true;
      visible = false;
      try { document.dispatchEvent(new Event('web-datos-al-dia')); } catch (e) { /* sin aviso */ }
    }
  }
  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    mirar();
    setInterval(mirar, CADA_MS);
  }
  if (C.hayCarpeta && C.hayCarpeta()) iniciar();
  else document.addEventListener('web-carpeta-lista', iniciar);
  window.FranjaWeb = { mirar: mirar };
})();
