/* Generado de JsPortadaResumen.html por web/construir-datos.mjs: no se toca a mano. */
/* Instrucción 91: una línea encima del renglón «Última actualización» cuando la tabla se ha montado con los ficheros porque la ficha del Centro de datos no sirve. Vacía = oculta. */
function pintarAvisoFicha_(texto) {
  var el = document.getElementById('avisoFichaPortada');
  if (!el) return;
  el.textContent = texto || '';
  el.classList.toggle('oculto', !texto);
}

function pintarResumenActualizacion_(r) {
  var el = document.getElementById('resumenUltAct');
  if (!el) return;
  if (!r) { el.classList.add('oculto'); el.removeAttribute('open'); return; }
  el.classList.remove('oculto');
  var cuando = r.cuando ? new Date(r.cuando).toLocaleString('es-ES') : '';
  var resumen = r.aMedias
    ? '⚠ Última actualización: ' + cuando + ' · quedó a medias' + (r.faltan && r.faltan.length ? ': falta ' + r.faltan.join(' · ') : '')
    : 'Última actualización: ' + cuando + ' · terminó entera';
  document.getElementById('resumenUltActTitulo').textContent = resumen;
  el.classList.toggle('a-medias', !!r.aMedias);
  var hecho = (r.hecho || []).map(function (l) { return '<li>' + escapaHtml(l) + '</li>'; }).join('') || '<li>—</li>';
  var cuadrar = (r.porCuadrar || []).map(function (f) { return '<tr><td>' + escapaHtml(f[0]) + '</td><td class="num-ra">' + escapaHtml(f[1]) + '</td></tr>'; }).join('');
  var fases = ((r.tiempos && r.tiempos.fases) || []).map(function (f) { return '<tr><td>' + escapaHtml(f.nombre) + '</td><td class="num-ra">' + f.segundos + ' s</td></tr>'; }).join('');
  document.getElementById('resumenUltActCuerpo').innerHTML =
    '<h3>Lo que ha hecho esta vez</h3><ul>' + hecho + '</ul>' +
    (cuadrar ? '<h3>Qué queda por cuadrar</h3><table class="ra-tabla">' + cuadrar + '</table>' : '') +
    '<h3>Cuánto tardó cada fase</h3><table class="ra-tabla">' + fases +
    '<tr class="ra-total"><td>total</td><td class="num-ra">' + ((r.tiempos && r.tiempos.totalSegundos) || 0) + ' s</td></tr></table>';
  /* A medias: sale abierto. Entera: plegado (se respeta lo que el usuario haya abierto o cerrado). */
  if (r.aMedias) el.setAttribute('open', ''); else if (el.dataset.visto !== r.cuando) el.removeAttribute('open');
  el.dataset.visto = r.cuando;
}
