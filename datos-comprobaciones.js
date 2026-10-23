/* Generado de JsComprobaciones.html por web/construir-datos.mjs: no se toca a mano. */
var COMPROBACIONES_ESTADO_ = null;

function haceTiempoComprobaciones_(iso) {
  var t = Date.parse(iso || '');
  if (!t) return '';
  var min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 2) return 'hace un momento';
  if (min < 90) return 'hace ' + min + ' minutos';
  var h = Math.round(min / 60);
  if (h < 36) return 'hace ' + h + ' horas';
  return 'hace ' + Math.round(h / 24) + ' días';
}

function cargarComprobaciones_() {
  var cont = document.getElementById('contenidoComprobaciones');
  if (!cont) return;
  if (COMPROBACIONES_ESTADO_) { pintarComprobaciones_(); return; }
  cont.innerHTML = '<p class="vacio-hoy">Mirando las comprobaciones…</p>';
  llamar('webComprobacionesEstado').then(function (r) { COMPROBACIONES_ESTADO_ = r || { hay: false }; pintarComprobaciones_(); })
    .catch(function () { cont.innerHTML = '<p class="vacio-hoy">No he podido traer las comprobaciones.</p>'; });
}

/* Instrucción 113: las dos líneas fijas de «Cómo está la app» (toma todo lo del Centro de datos · velocidad) y, solo cuando alguna dice «no», la línea roja de «Hoy». Salen del último informe de
   comprobaciones (`fijas` de webComprobacionesEstado): verde (sí), rojo (no), gris (sin datos o sin medidas). Cada una se despliega para ver el detalle. */
function pintarFijas_() {
  var cont = document.getElementById('lineasFijas');
  if (!cont) return;
  var fijas = (COMPROBACIONES_ESTADO_ && COMPROBACIONES_ESTADO_.fijas) || [];
  if (!fijas.length) { cont.innerHTML = ''; return; }
  var color = { si: '#1a7f37', no: '#b00020', sin: '#667' }, marca = { si: '✓', no: '⚠', sin: '…' };
  cont.innerHTML = fijas.map(function (f) {
    var detalle = (f.detalle || []).length ? '<ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;color:#334">' + f.detalle.map(function (t) { return '<li>' + escapaHtml(t) + '</li>'; }).join('') + '</ul>' : '';
    return '<details class="linea-fija" data-fija="' + escapaHtml(f.id) + '" data-estado="' + escapaHtml(f.estado) + '" style="margin:0 0 8px"><summary style="cursor:pointer;color:' + (color[f.estado] || '#667') + ';font-weight:' + (f.estado === 'no' ? '600' : '500') + '">' +
      '<span aria-hidden="true">' + (marca[f.estado] || '…') + '</span> ' + escapaHtml(f.frase) + '</summary>' + detalle + '</details>';
  }).join('');
}

/* Las líneas rojas de «Hoy»: una por cada línea fija que dice «no». «Ir» lleva a «Cómo está la app». */
function fijasHoyItems_() {
  var p = typeof datoHoy_ === 'function' ? datoHoy_('webPortada', CURSO_VISTO) : null;   // llegan dentro de webPortada: «Hoy» no hace ninguna llamada más
  var fijas = (p && p.fijas) || [];
  return fijas.filter(function (f) { return f.estado === 'no'; }).map(function (f) {
    return { g: 1, texto: f.frase, ir: "irAPaso_('datos','estado')" };
  });
}

/* Instrucción 119: «Buscar un código de diagnóstico», solo para quien gestiona. Escribe `A-…` y abre la ficha de ese alumno; el nombre no se muestra en ningún otro sitio. */
function pintarCajaDiagnostico_() {
  var cont = document.getElementById('cajaDiagnostico');
  if (!cont) return;
  if (!(typeof miPapel_ === 'function' && miPapel_().rol === 'admin')) { cont.innerHTML = ''; cont.classList.add('oculto'); return; }
  cont.classList.remove('oculto');
  if (cont.getAttribute('data-pintada')) return;
  cont.setAttribute('data-pintada', '1');
  cont.innerHTML = '<p style="font-size:12.5px;color:#667;margin:0 0 6px">Buscar un código de diagnóstico: cuando una sesión de Claude diga «el alumno A-3F2A9C1E sale mal», escríbelo aquí y se abre su ficha.</p>' +
    '<div class="fila-botones"><input type="text" id="cajaDiagnosticoCodigo" placeholder="A-XXXXXXXX" maxlength="12" style="max-width:160px" autocomplete="off"> ' +
    '<button type="button" id="botonDiagnosticoBuscar">Buscar</button></div><p id="cajaDiagnosticoMensaje" style="font-size:12.5px;margin:6px 0 0"></p>';
  var buscar = function () {
    var cod = String(document.getElementById('cajaDiagnosticoCodigo').value || '').trim();
    var msg = document.getElementById('cajaDiagnosticoMensaje');
    msg.textContent = 'Buscando…';
    llamar('webDiagnosticoBuscar', cod).then(function (r) {
      if (r && r.ok) {
        if (typeof ALUMNADO_POR_CLAVE !== 'undefined' && ALUMNADO_POR_CLAVE[r.clave]) { msg.textContent = ''; abrirFicha(r.clave, false); }
        else msg.textContent = 'Es un alumno del curso ' + r.curso + ': cambia a ese curso y vuelve a buscarlo.';
      } else {
        var m = { forma: 'El código tiene que ser como A-3F2A9C1E.', sinEnvio: 'Todavía no se ha enviado ningún diagnóstico.', noEsta: 'Ese código no es de ningún alumno de ahora.' };
        msg.textContent = m[r && r.motivo] || 'No lo encuentro.';
      }
    }).catch(function () { msg.textContent = 'No he podido buscarlo.'; });
  };
  document.getElementById('botonDiagnosticoBuscar').onclick = buscar;
  document.getElementById('cajaDiagnosticoCodigo').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); buscar(); } };
}

function pintarComprobaciones_() {
  var cont = document.getElementById('contenidoComprobaciones');
  var r = COMPROBACIONES_ESTADO_;
  pintarFijas_();
  pintarCajaDiagnostico_();
  if (!cont || !r) return;
  if (!r.hay) { cont.innerHTML = '<p class="vacio-hoy">Todavía no se ha hecho ninguna comprobación. Se hace sola al actualizar los datos.</p>'; return; }
  var s = r.resumen || {};
  var sinDatos = (s['sin datos'] || 0) + (s['sin tiempo'] || 0);
  var rojo = (s.mal || 0) + (s.error || 0) > 0;
  var linea = 'Comprobaciones con tus datos: ' + (s.bien || 0) + ' bien · ' + (s.mal || 0) + ' mal · ' + sinDatos + ' todavía sin datos · ' + haceTiempoComprobaciones_(r.momento);
  var html = '<p class="linea-comprobaciones' + (rojo ? ' mal' : '') + '" style="margin:0 0 6px;' + (rojo ? 'color:#b00020;font-weight:600' : '') + '">' + escapaHtml(linea) + '</p>';
  if (!r.completo) html += '<p style="font-size:12.5px;color:#667;margin:0 0 6px">Algunas se repetirán solas cuando nadie esté usando la web.</p>';
  if (r.sinEnviar) html += '<p style="font-size:12.5px;color:#667;margin:0 0 6px">' + escapaHtml(r.sinEnviar.charAt(0).toUpperCase() + r.sinEnviar.slice(1)) + '.</p>';
  html += '<details><summary style="cursor:pointer;font-size:13px;color:#334">Ver la lista entera</summary><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px">';
  (r.lineas || []).forEach(function (l) {
    var malo = l.estado === 'mal' || l.estado === 'error';
    html += '<li' + (malo ? ' style="color:#b00020"' : '') + '>' + escapaHtml(l.que) + ' <span style="color:' + (malo ? '#b00020' : '#667') + '">— ' + escapaHtml(l.texto) + '</span></li>';
  });
  html += '</ul></details>';
  cont.innerHTML = html;
}
