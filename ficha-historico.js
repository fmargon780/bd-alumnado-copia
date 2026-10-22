/* El histórico año a año de «Trayectoria» (con las materias de cada año al pulsar el renglón) y el apartado reservado «Situación familiar» de «Familia» (instrucción 136).
   Es lo mismo que enseña la ficha de hoy (JsFichaHistorico.html y JsFichaSituacionFamiliar.html). Las materias de cada año vienen ya dentro de la ficha (`mh`); la situación familiar
   se lee de su fichero solo al abrir el candado y no se guarda en ninguna parte: al cerrarlo (o al cerrar la página) se tira. Solo lee. */
(function (raiz) {
  'use strict';
  var B = raiz.FichaBase, h = B.h, p = B.p;
  var FUENTES = { matricula: 'Matrícula', ev: 'Notas del curso pasado', expediente: 'Expediente de Séneca' };

  function anoTexto(ano) { var n = parseInt(ano, 10); return n ? String(n).slice(-2) + '-' + String(n + 1).slice(-2) : ''; }

  function resultado(r) {
    var t = { promociona: 'Promociona', repite: 'Repite', titula: 'Titula', anulada: 'Matrícula anulada', traslado: 'Traslado', en_curso: 'En curso', otro: r.t, '?': '?' }[r.r];
    if (t === undefined) t = r.r || '?';
    var hijos = [t];
    if (r.r === 'repite') hijos.push(' ', h('span', 'chip rep', 'REP'));
    if (r.d) hijos.push(' ', Object.assign(h('span', 'gris', '(deducido)'), { title: 'Séneca no trae el resultado de este año; se deduce del curso siguiente' }));
    return h('span', 'h-res' + (r.r === 'anulada' || r.r === 'traslado' ? ' gris' : ''), hijos);
  }
  function suspensas(s) {
    if (s === '' || s === null || s === undefined) return '';
    var n = parseInt(s, 10);
    return isNaN(n) ? '' : n + (n === 1 ? ' suspensa' : ' suspensas');
  }

  function materiasAno(g, enCurso) {
    var cabecera = enCurso ? p('Curso actual, sin notas todavía.', 'campo') : null;
    if (!g || !g.m || !g.m.length) return [cabecera, p('Sin datos de ese año.', 'campo')];
    var items = g.m.map(function (par) {
      var nota = par[1] === '' || par[1] === null || par[1] === undefined ? '' : par[1];
      var susp = nota !== '' && !isNaN(Number(String(nota).replace(',', '.'))) && Number(String(nota).replace(',', '.')) < 5;
      return h('span', 'mat' + (susp ? ' susp' : ''), [h('span', 'mat-n', par[0]), nota !== '' ? h('b', '', nota) : null]);
    });
    return [cabecera, h('div', 'mat-rejilla', items), p(FUENTES[g.o] || '', 'fuente-materias')];
  }

  /* lista: renglones (del más reciente al más antiguo); mh: { '2025': { n, o, m } }; materiasActuales: las de este año (para el renglón «en curso»). */
  function historico(lista, mh, materiasActuales) {
    if (!lista || !lista.length) return p('Sin histórico todavía: se rellenará solo cuando lleguen los datos.', 'campo');
    var abierto = -1, bloques = [];
    function cerrar() {
      if (abierto < 0) return;
      var b = bloques[abierto];
      b.det.classList.add('oculto'); b.det.textContent = '';
      b.fila.setAttribute('aria-expanded', 'false'); b.fila.classList.remove('abierta');
      abierto = -1;
    }
    function desplegar(i) {
      var era = abierto, r = lista[i], b = bloques[i];
      cerrar();
      if (era === i) return;
      abierto = i;
      b.fila.setAttribute('aria-expanded', 'true'); b.fila.classList.add('abierta');
      b.det.classList.remove('oculto'); b.det.textContent = '';
      var g = r.r === 'en_curso' && materiasActuales && materiasActuales.length
        ? { o: 'matricula', m: materiasActuales.map(function (m) { return [m, '']; }) }
        : (mh || {})[String(r.a)];
      materiasAno(g, r.r === 'en_curso').forEach(function (x) { if (x) b.det.appendChild(x); });
    }
    return h('div', 'historico', lista.map(function (r, i) {
      var desplegable = r.r !== 'anulada' && r.r !== 'traslado';
      var fila = h('div', 'hist-fila' + (desplegable ? '' : ' sin-desplegar'), [
        h('span', 'h-ano', anoTexto(r.a)), h('span', 'h-niv', r.n), h('span', 'h-uni', r.u), resultado(r), h('span', 'h-cen', r.c), h('span', 'h-sus', suspensas(r.s))]);
      var det = h('div', 'hist-materias oculto');
      if (desplegable) {
        fila.setAttribute('role', 'button'); fila.tabIndex = 0; fila.setAttribute('aria-expanded', 'false');
        fila.addEventListener('click', function () { desplegar(i); });
        fila.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); desplegar(i); } });
      }
      bloques[i] = { fila: fila, det: det };
      return h('div', 'hist-bloque', [fila, det]);
    }));
  }

  /* ---- Situación familiar (reservada) ---- */
  function renglon(etiqueta, d) {
    var texto = !d || !d.trae ? 'El fichero de alumnado de Séneca no trae este dato' : (d.texto || 'No consta');
    return p([h('span', 'campo', etiqueta + ':'), ' ' + texto]);
  }
  function panelSituacion(r) {
    if (!r || !r.hayFichero) return [p('No hay fichero de alumnado de Séneca')];
    return [r.avisoCustodia ? p([h('span', '', '⚠'), ' ', h('strong', '', 'La custodia no consta como compartida.'),
        ' Comprueba a quién corresponde recibir comunicaciones y retirar documentación antes de actuar.'], 'sit-fam-aviso') : null,
      renglon('Custodia', r.custodia), renglon('Familia numerosa', r.familiaNumerosa), renglon('Domicilio', r.domicilio),
      p('Dato reservado · solo lectura · viene del fichero de alumnado de Séneca', 'sit-fam-gris sit-fam-pie')];
  }
  /* `pedir()` devuelve una promesa con { hayFichero, custodia, familiaNumerosa, domicilio, avisoCustodia }. Cada ficha empieza con el apartado cerrado. */
  function situacion(pedir) {
    var abierto = false, ficha = 0;
    var panel = h('div', 'sit-fam-panel oculto');
    var linea = h('div', 'sit-fam-linea', [h('span', '', '🔒'), ' ', h('strong', '', 'Situación familiar'), ' ', h('span', 'sit-fam-gris', 'reservado · pulsa para ver')]);
    linea.setAttribute('role', 'button'); linea.tabIndex = 0; linea.setAttribute('aria-expanded', 'false');
    function llenar(hijos) { panel.textContent = ''; hijos.forEach(function (x) { if (x) panel.appendChild(x); }); }
    function alternar() {
      if (abierto) { abierto = false; ficha++; linea.setAttribute('aria-expanded', 'false'); panel.classList.add('oculto'); panel.textContent = ''; return; }
      abierto = true; var esta = ++ficha;
      linea.setAttribute('aria-expanded', 'true'); panel.classList.remove('oculto');
      llenar([p('Cargando…', 'sit-fam-gris')]);
      pedir().then(function (r) { if (esta === ficha && abierto) llenar(panelSituacion(r)); },
        function () { if (esta === ficha && abierto) llenar([p('No se ha podido leer. Cierra y vuelve a abrir el apartado para reintentar.', 'sit-fam-gris')]); });
    }
    linea.addEventListener('click', alternar);
    linea.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); alternar(); } });
    return { elemento: h('div', 'sit-fam', [linea, panel]), alternar: alternar, abierto: function () { return abierto; } };
  }

  raiz.FichaHistorico = { historico: historico, situacion: situacion, anoTexto: anoTexto };
})(typeof window !== 'undefined' ? window : globalThis);
