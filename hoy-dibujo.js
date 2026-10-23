/* El dibujo de «Hoy» de la web nueva (instrucción 138, parte 2): las mismas cajas, tablas, pasos y palabras que la portada «Hoy» de hoy (JsHoy.html), a partir de las cuentas de hoy-base.js. Devuelve un árbol de nodos
   sencillos { t: etiqueta, a: atributos, c: hijos } (los textos son textos, nunca HTML): hoy.js los convierte en elementos de la página con `createElement` y `textContent`. */
(function (raiz) {
  'use strict';
  var B = (typeof require === 'function' && typeof module !== 'undefined') ? require('./hoy-base.js') : raiz.HoyBase;
  var ESTADOS_PASO = { hecho: ['✓', 'Hecho'], toca: ['▶', 'Toca ahora'], pendiente: ['○', 'Pendiente'], nohace: ['—', 'No hace falta'] };
  var POR_MIRAR_MAX = 4;

  function h(t, a, c) {
    var hijos = [];
    (function juntar(l) { (Array.isArray(l) ? l : [l]).forEach(function (x) { if (Array.isArray(x)) juntar(x); else if (x !== null && x !== undefined && x !== false) hijos.push(typeof x === 'object' ? x : String(x)); }); })(c === undefined || c === null ? [] : c);
    return { t: t, a: a || {}, c: hijos };
  }

  function chipEstado(color, texto) {
    return h('span', { class: 'est ' + color }, [h('i', { 'aria-hidden': 'true' }, color === 'v' ? '✓' : (color === 'r' ? '⚠' : '…')), ' ' + texto]);
  }
  function tablaHoy(cabecera, filas, total) {
    if (!filas.length) return null;
    return h('table', { class: 'tabla-hoy' }, [
      h('thead', {}, h('tr', {}, cabecera.map(function (c) { return h('th', {}, c); }))),
      h('tbody', {}, filas.map(function (f) { return h('tr', {}, f.map(function (c) { return h('td', {}, c); })); })
        .concat(total ? [h('tr', { class: 'total' }, total.map(function (c) { return h('td', {}, c); }))] : []))
    ]);
  }
  function avisoVacio(texto) { return h('p', { class: 'vacio-hoy' }, texto); }

  function tablas(m, hoy) {
    var lect = B.lect, g = B.nombreGrado;
    function matricula(curso) {
      var d = lect(m, curso).qv;
      if (!d) return avisoVacio('Trayendo las cifras de la matrícula del curso ' + curso + '…');
      if (!d.esPreparacion) return avisoVacio('El curso ' + curso + ' no está en preparación: no hay matrícula en marcha.');
      var panel = (d.panel || []).filter(function (p) { B.cifrasVivasPanel(p, d); return p.esperados || p.matriculados || p.objetivo !== null; });
      if (!panel.length) return avisoVacio('Aún no hay esperados en este curso. Suelta los ficheros de Séneca en «Datos y configuración».');
      var conObjetivo = panel.some(function (p) { return p.objetivo !== null && p.objetivo !== undefined; });
      var T = { esp: 0, mat: 0, falta: 0, prob: 0 };
      var filas = panel.map(function (p) {
        var prob = (p.sobres && p.sobres.conProblema) || 0, falta = Math.max(0, p.esperados - p.matriculados - prob);
        T.esp += p.esperados; T.mat += p.matriculados; T.falta += falta; T.prob += prob;
        var e = B.estadoObjetivo(p, d, hoy);
        var fila = [g(p.curso), p.esperados, p.matriculados, falta, prob];
        if (conObjetivo) { fila.push(e ? e.O : '—'); fila.push(e ? chipEstado(e.color === 'verde' ? 'v' : (e.color === 'rojo' ? 'r' : 'a'), e.texto) : ''); }
        return fila;
      });
      var total = ['Todo el centro', T.esp, T.mat, T.falta, T.prob].concat(conObjetivo ? ['', ''] : []);
      return tablaHoy(['Curso', 'Esperados', 'Matriculados', 'Faltan', 'Con problema'].concat(conObjetivo ? ['Mínimo', 'Cómo va'] : []), filas, total);
    }
    function admision(curso) {
      var d = lect(m, curso).qv;
      if (!d) return avisoVacio('Trayendo las solicitudes del curso ' + curso + '…');
      var porGrado = {};
      (d.solicitudes || []).forEach(function (s) {   // s = [curso, clasificación]
        var r = porGrado[s[0] || ''] = porGrado[s[0] || ''] || { sol: 0, adm: 0, esp: 0 };
        r.sol++;
        if (s[1] === 'esperado_pendiente' || s[1] === 'esperado_matriculado') r.adm++;
        else if (s[1] === 'lista_espera') r.esp++;
      });
      var grados = Object.keys(porGrado).sort();
      if (!grados.length) return avisoVacio('Aún no hay solicitudes de admisión. Suelta los ficheros de Séneca en «Datos y configuración».');
      var leida = !!(d.resolucion && d.resolucion.leida), cuadra = leida && !(d.resolucion.avisos || 0);
      return [tablaHoy(['Curso', 'Solicitudes', 'Admitidos', 'No admitidos'], grados.map(function (k) { var r = porGrado[k]; return [g(k), r.sol, r.adm, r.esp]; }), null),
        h('p', { class: 'nota-hoy' }, leida ? chipEstado(cuadra ? 'v' : 'r', cuadra ? 'La resolución cuadra con el PDF' : 'La resolución no cuadra con el PDF') : chipEstado('a', 'Falta el PDF de la resolución'))];
    }
    function transito(curso) {
      var s = lect(m, curso).seguimiento;
      if (s === undefined) return avisoVacio('El tránsito se sigue en el curso en preparación.');
      var cols = (s && s.porColegio) || [];
      if (!cols.length) return avisoVacio('Aún no hay alumnado esperado de colegios adscritos.');
      var T = { esp: 0, env: 0 };
      var filas = cols.map(function (c) {
        T.esp += c.totalEsperados; T.env += c.enviadas;
        var sin = c.sinMarcar || 0, todas = sin === 0 && c.enviadas >= c.totalEsperados;
        return [c.colegioNombre || c.colegioCodigo, c.totalEsperados, c.enviadas, sin, chipEstado(todas ? 'v' : 'a', todas ? 'Todas enviadas' : 'Faltan fichas')];
      });
      return tablaHoy(['Colegio', 'Esperados', 'Fichas enviadas', 'Sin marcar', 'Cómo va'], filas, ['Todos los colegios', T.esp, T.env, '', '']);
    }
    function agrupamiento(curso) {
      var mm = lect(m, m.cursoVisto).mesa, d = lect(m, curso).qv;
      if (!mm) return avisoVacio('Trayendo el estado de la mesa…');
      var conPanel = !!(d && d.esPreparacion), matriculados = {};
      if (conPanel) (d.panel || []).forEach(function (p) { B.cifrasVivasPanel(p, d); matriculados[p.curso] = p.matriculados; });
      var filas = mm.filter(function (r) { return r.estado !== 'sinModelo' || matriculados[r.curso]; }).map(function (r) {
        var color = r.estado === 'definitivo' ? 'v' : (r.estado === 'enMarcha' ? (r.sinColocar ? 'a' : 'v') : 'r');
        var texto = r.estado === 'definitivo' ? 'Modelo definitivo' : (r.estado === 'enMarcha' ? (r.sinColocar ? 'A medias' : 'Repartido') : 'Sin empezar');
        var fila = [g(r.curso)];
        if (conPanel) fila.push(matriculados[r.curso] === undefined ? '' : matriculados[r.curso]);
        fila.push(r.grupos || '—', r.sinColocar || 0, chipEstado(color, texto));
        return fila;
      });
      if (!filas.length) return avisoVacio('Aún no hay ningún modelo de reparto. Abre la mesa para empezar.');
      return tablaHoy(['Curso'].concat(conPanel ? ['Matriculados'] : []).concat(['Grupos', 'Sin colocar', 'Cómo va']), filas, null);
    }
    function espera(curso) {
      var d = lect(m, curso).qv;
      if (!d) return avisoVacio('Trayendo la lista de espera del curso ' + curso + '…');
      var por = {};
      (d.listaEspera || []).forEach(function (s) {   // s = [grado, llamada, interesada, docRecibida]
        var r = por[s[0]] = por[s[0]] || { n: 0, llamados: 0, interesados: 0, doc: 0 };
        r.n++;
        if (s[1]) r.llamados++;
        if (s[2]) r.interesados++;
        if (s[3]) r.doc++;
      });
      var grados = Object.keys(por).sort();
      if (!grados.length) return avisoVacio('La lista de espera está vacía. Llega con la resolución de mayo («Datos y configuración»).');
      return tablaHoy(['Curso', 'En lista', 'Llamados', 'Interesados', 'Documentación recibida'], grados.map(function (k) { var r = por[k]; return [g(k), r.n, r.llamados, r.interesados, r.doc]; }), null);
    }
    function inicio(curso) {
      var l = lect(m, curso), d = l.doc;
      if (!d) return avisoVacio('Trayendo el estado de los documentos…');
      var gen = d.generacion || {};
      var filas = (d.filas || []).filter(function (f) { return f.resumen.total; }).map(function (f) {
        var r = f.resumen, faltan = r.falta + r.cambiado + r.fallo;
        var chip = (r.generando || r.espera) ? (gen.enCurso && gen.parada ? chipEstado('r', 'Se ha parado') : chipEstado('a', 'Generando'))
          : (faltan ? chipEstado(r.fallo ? 'r' : 'a', 'Faltan ' + faltan) : chipEstado('v', 'Al día'));
        return [f.nombre, chip];
      });
      var tutores = d.tutores || [], enviados = tutores.filter(function (t) { return t[0]; }).length;
      if (tutores.length) filas.push(['Enviados a los tutores', chipEstado(enviados === tutores.length ? 'v' : 'a', enviados + ' de ' + tutores.length)]);
      var avisos = l.rev && l.rev.contadores ? l.rev.contadores.avisos : null;
      if (avisos !== null && avisos !== undefined) filas.push(['Avisos por revisar', chipEstado(avisos ? 'a' : 'v', avisos ? String(avisos) : 'Ninguno')]);
      return tablaHoy(['Qué', 'Cómo va'], filas, null);
    }
    return { matricula: matricula, admision: admision, transito: transito, agrupamiento: agrupamiento, espera: espera, inicio: inicio };
  }

  /* Donde la app de hoy tiene un botón que lleva a una pantalla, aquí hay un enlace a la app de hoy (las pantallas aún no pasadas siguen allí). */
  function enlace(clase, titulo, hijos, m) {
    var a = { class: clase, href: m.urlApp || '#', target: '_blank', rel: 'noopener' };
    if (titulo) a.title = titulo;
    return h('a', a, hijos);
  }

  function chipPaso(s) { var e = ESTADOS_PASO[s]; return h('span', { class: 'estado-paso e-' + s }, [h('i', { 'aria-hidden': 'true' }, e[0]), ' ' + e[1]]); }

  function pasosHoy(m, t, curso, hoy, extra) {
    return h('div', { class: 'pasos-hoy' }, B.estadoPasosDe(m, t.clave, curso, hoy).map(function (r) {
      return enlace('paso' + (r.s === 'toca' ? ' fuerte' : '') + ' e-' + r.s, r.texto,
        [h('small', {}, 'Paso ' + (r.i + 1)), h('b', {}, r.paso.etiqueta + (r.n ? ' · ' + r.n : '')), h('em', {}, chipPaso(r.s))], m);
    }).concat(extra || []));
  }

  function certificacionPaso(m, e, hoy) {
    if (e.tarea.clave !== 'matricula') return null;
    var f = B.fechaDeHito(m, 'certificacionJulio', e.curso);
    var dato = function (texto) { return h('div', { class: 'paso paso-info' }, [h('small', {}, 'Meta'), h('b', {}, 'Certificación de matrícula'), h('em', {}, texto)]); };
    if (!f) return dato('Sin fecha');
    var dias = B.diasEntre(hoy, f);
    return dato(B.fechaCorta(f) + (dias >= 0 ? ' · ' + (dias === 0 ? 'hoy' : 'faltan ' + B.plural(dias)) : ' · ya pasó'));
  }

  function plazoTexto(e) { return e.estado === 'marcha' ? 'Del ' + B.fechaCorta(e.desde) + ' al ' + B.fechaCorta(e.hasta) : e.texto; }

  function cajaHoy(m, e, etiqueta, grande, hoy) {
    var t = e.tarea, T = tablas(m, hoy);
    var cursoNota = (m.abiertos && m.abiertos.length > 1) ? ' · curso ' + e.curso : '';
    var titulo = t.nombre + (e.estado === 'marcha' && e.duracion <= 14 ? ' · día ' + e.dia + ' de ' + e.duracion : '');
    return [h('div', { class: 'etq' }, etiqueta), h('h2', {}, titulo), h('div', { class: 'sub' }, plazoTexto(e) + cursoNota + '. ' + t.frase),
      T[t.clave] ? T[t.clave](e.curso) : null, pasosHoy(m, t, e.curso, hoy, grande ? certificacionPaso(m, e, hoy) : null)];
  }

  function lineaTarea(m, e) { return enlace('linea-tarea', '', [h('b', {}, e.tarea.nombre), ' ', h('span', {}, e.texto)], m); }

  /* Todo «Hoy» ya dibujado: { toca, tambien: {oculto, nodos}, atencion: {oculto, nodos}, fechas, porMirar: {oculto, n, nodos}, cambios: {oculto, nodos}, pie, hoy } (cada `nodos` es una lista de nodos). */
  function pintar(m, opciones) {
    opciones = opciones || {};
    var hoy = opciones.hoy || B.hoyIso(), ahora = opciones.ahora || Date.now();
    var hh = B.tareasDeHoy(m, hoy), s = {};
    if (hh.toca) {
      s.toca = cajaHoy(m, hh.toca, 'Hoy toca', true, hoy);
      var otras = hh.enMarcha.filter(function (e) { return e !== hh.toca; });
      s.tambien = { oculto: false, nodos: otras.length ? [cajaHoy(m, otras[0], 'También en marcha', false, hoy), otras.slice(1).map(function (e) { return lineaTarea(m, e); })]
        : [h('div', { class: 'etq' }, 'También en marcha'), h('p', { class: 'vacio-hoy' }, 'Ninguna otra tarea está en marcha hoy.')] };
    } else {
      var prox = hh.proxima ? 'La próxima: ' + hh.proxima.tarea.nombre + ', el ' + B.fechaCorta(hh.proxima.desde) + ' (' + (hh.proxima.diasHasta === 1 ? 'mañana' : 'dentro de ' + B.plural(hh.proxima.diasHasta)) + ').' : 'No hay más fechas escritas: se escriben en «Datos y configuración».';
      s.toca = [h('div', { class: 'etq' }, 'Hoy'), h('h2', {}, 'Hoy no hay ninguna tarea con fecha'), h('div', { class: 'sub' }, prox),
        hh.proxima ? h('div', { class: 'pasos-hoy' }, enlace('paso fuerte', '', [h('small', {}, 'Siguiente'), h('b', {}, hh.proxima.tarea.nombre)], m)) : null];
      s.tambien = { oculto: true, nodos: [] };
    }
    var items = B.atencionHoy(m, hh);
    s.atencion = { oculto: !items.length, nodos: items.length ? [h('div', { class: 'etq rojo' }, 'Necesita tu atención')].concat(items.map(function (i) {
      return enlace('ojo' + (i.g > 1 ? ' am' : ''), '', [h('i', { 'aria-hidden': 'true' }, i.g > 1 ? '…' : '⚠'), ' ' + i.texto], m);
    })) : [] };
    var fechas = B.proximasFechasHoy(m, hh);
    s.fechas = [h('div', { class: 'etq gris' }, 'Próximas fechas'), fechas.length ? h('ul', { class: 'lista-hoy' }, fechas.map(function (f) {
      var d = B.diasEntre(hoy, f.fecha);
      return h('li', {}, [f.texto, h('span', {}, B.fechaCortaAbrev(f.fecha) + (d === 0 ? ' · hoy' : ' · ' + B.plural(d)))]);
    })) : h('p', { class: 'vacio-hoy' }, 'No hay fechas escritas. Se escriben en «Datos y configuración» › «Fechas del curso».')];
    var pm = B.porMirarVisibles(m, hh);
    s.porMirar = { oculto: !pm.length, n: pm.length, nodos: pm.length ? [h('div', { class: 'etq gris' }, 'Por mirar (' + pm.length + ')'), pm.slice(0, POR_MIRAR_MAX).map(function (e) {
      return h('div', { class: 'linea-por-mirar' }, [h('div', { class: 'frase' }, e.texto), h('div', { class: 'botones-por-mirar' }, [enlace('pequeno', '', 'Ir', m)].concat(m.escribe
        ? [h('button', { class: 'pequeno', type: 'button', 'data-por-mirar': e.id, 'data-respuesta': 'bien' }, 'Está bien'), enlace('pequeno', 'Avisar de lo que no está bien se hace con el botón de Soporte de la app de hoy', 'No está bien (en la app de hoy)', m)]
        : [enlace('pequeno', '', 'Contestar en la app de hoy', m)]))]);
    }), pm.length > POR_MIRAR_MAX ? h('p', { class: 'suave' }, 'Hay ' + (pm.length - POR_MIRAR_MAX) + ' más en la app de hoy.') : null] : [] };
    var cl = B.lineasUltimosCambios(m, ahora);
    s.cambios = { oculto: !cl.length, nodos: cl.length ? [h('div', { class: 'etq gris' }, 'Últimos cambios'), cl.map(function (l) {
      return h('div', { class: 'linea-cambio-hoy', title: l.x }, [h('b', {}, l.q), ' · ' + l.x + (l.veces > 1 ? ' (' + l.veces + ' veces)' : '') + ' · ', h('span', {}, B.haceCuanto(l.h, ahora))]);
    }), enlace('ver-todos-cambios', '', 'Ver todos', m)] : [] };
    s.pie = 'Las fechas las escribe Jefatura una vez al año.';
    s.hoy = hh;
    return s;
  }

  var api = { pintar: pintar, h: h };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.HoyDibujo = api;
})(typeof window !== 'undefined' ? window : globalThis);
