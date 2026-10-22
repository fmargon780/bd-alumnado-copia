/* Generado de JsEstadisticasLista.html por web/construir-estadisticas.mjs: no se toca a mano. */
function estadAbrirLista_(k, ci) {
  if (!EST_.res) return;
  var c = estadAlumnosDeCelda(EST_.P, EST_.def, EST_.res, k, ci);
  var gente = c.ids.map(function (i, j) { return { a: EST_.P.alumnos[i], v: c.valores ? c.valores[j] : null, m: [] }; });
  if (EST_.P.conjunto === 'materias') {   // «Materias de cada alumno»: cada alumno una vez, con sus materias al lado
    var por = {}, uno = [], im = EST_.P.cat.materia.i;
    gente.forEach(function (x) { var q = por[x.a.k]; if (!q) { q = por[x.a.k] = { a: x.a, v: null, m: [] }; uno.push(q); } q.m.push(String(x.a.v[im]) + (x.v !== null && x.v !== '' ? ' ' + x.v : '')); });
    gente = uno;
  }
  gente.sort(function (x, y) { return x.a.n.localeCompare(y.a.n, 'es'); });
  EST_.lista = { gente: gente, titulo: estadTituloCelda(EST_.P, EST_.def, c) };
  var h = '<header><h4>' + (gente.length ? gente.length + (gente.length === 1 ? ' alumno' : ' alumnos') : 'Ningún alumno') + '<small>' + escapaHtml(EST_.lista.titulo) + '</small></h4><button data-est-cierra-cajon="1">Cerrar</button></header>';
  if (gente.length) h += '<div class="est-cajon-acc"><button data-est-copiar="1">Copiar la lista</button><span id="estCopiado"></span></div>';
  h += '<ol>';
  gente.forEach(function (x) {
    h += '<li>' + escapaHtml(x.a.n) + ' <span>' + escapaHtml(x.a.u) + (x.v !== null ? ' · ' + escapaHtml(x.v === '' ? 'sin dato' : x.v) : '') + (x.m.length ? ' · ' + escapaHtml(x.m.join(', ')) : '') + '</span>' +
      (typeof ALUMNADO_POR_CLAVE !== 'undefined' && ALUMNADO_POR_CLAVE[x.a.k] ? '<a data-est-ficha="' + estAttr(x.a.k) + '" tabindex="0" role="button">Abrir ficha</a>' : '') + '</li>';
  });
  var cajon = document.getElementById('estCajon');
  cajon.innerHTML = h + '</ol>';
  cajon.classList.remove('oculto');
  document.getElementById('estPantalla').classList.add('con-lista');   // la lista ocupa su sitio al lado de la tabla: las cifras siguen a la vista
}

function estadCerrarLista_() {
  var cajon = document.getElementById('estCajon');
  if (cajon) { cajon.classList.add('oculto'); cajon.innerHTML = ''; document.getElementById('estPantalla').classList.remove('con-lista'); }
  EST_.lista = null;
}

/* El texto de «Copiar la lista»: nombre y unidad, un alumno por línea. */
function estadTextoLista_() {
  return EST_.lista.gente.map(function (x) { return x.a.n + ' (' + x.a.u + ')'; }).join('\n');
}

function estadCopiarLista_() {
  var texto = estadTextoLista_(), aviso = document.getElementById('estCopiado');
  var dicho = function (t) { if (aviso) aviso.textContent = t; };
  var alternativa = function () {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var bien = document.execCommand('copy');
      ta.remove();
      dicho(bien ? 'Copiada' : 'Este navegador no deja copiar: selecciona la lista y copia con Ctrl+C.');
    } catch (e) { dicho('Este navegador no deja copiar: selecciona la lista y copia con Ctrl+C.'); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { dicho('Copiada'); }, alternativa);
  else alternativa();
}
