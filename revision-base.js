/* La regla de «Revisión» de la web nueva (instrucción 138, parte 3). Es la de la «Revisión» de hoy (JsRevision.html), solo para leer: las listas de avisos, matrícula, cuadre y cambios para Séneca con sus filtros (curso, unidad, tipo de aviso,
   «ver también los revisados»), el orden por columna, los contadores de lo pendiente y los textos de cada línea. Trabaja sobre la lectura `webRevision` tal como la guarda RevisionWeb.gs. Sin pantalla: se prueba en Node. */
(function (raiz) {
  'use strict';
  /* Las pestañas de la pantalla de hoy (VISTAS_REVISION): la del cuadre vive dentro de «Matrícula», plegada debajo, y la de la oferta es una tabla aparte. */
  var VISTAS = [
    { clave: 'avisos', etiqueta: 'Avisos', accion: 'Revisado, no es error' },
    { clave: 'matricula', etiqueta: 'Matrícula', accion: 'Revisado, no es error' },
    { clave: 'cambios', etiqueta: 'Cambios para Séneca', accion: 'Hecho' },
    { clave: 'oferta', etiqueta: 'Oferta de materias', pantalla: true }
  ];
  var ACCION_CUADRE = 'Revisado, no es error';

  function normalizar(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  /* Lo pendiente de cada lista (lo no revisado): lo que cuenta la cabecera. */
  function contadores(rev) {
    var c = {};
    ['avisos', 'matricula', 'cuadre', 'cambios'].forEach(function (k) { c[k] = ((rev && rev[k]) || []).filter(function (f) { return !f.revisado; }).length; });
    return c;
  }

  /* Los cursos, unidades y tipos de aviso que hay en una lista, ordenados con `sort()` como hoy. */
  function opciones(rev, vista) {
    var cursos = [], unidades = [], tipos = [];
    ((rev && rev[vista]) || []).forEach(function (f) {
      if (f.curso && cursos.indexOf(f.curso) === -1) cursos.push(f.curso);
      if (f.unidad && unidades.indexOf(f.unidad) === -1) unidades.push(f.unidad);
      if (vista === 'avisos' && f.subtipo && tipos.indexOf(f.subtipo) === -1) tipos.push(f.subtipo);
    });
    return { cursos: cursos.sort(), unidades: unidades.sort(), tipos: tipos.sort() };
  }

  /* Las filas de una vista con los filtros puestos y en su orden. `filtros`: { curso, unidad, tipo, verRevisados }. `orden`: { campo, asc }. El filtro «tipo de aviso» solo vale para los avisos. El orden es estable. */
  function filas(rev, vista, filtros, orden) {
    var f = filtros || {}, o = orden || { campo: 'curso', asc: true };
    var lista = ((rev && rev[vista]) || []).filter(function (x) {
      if (f.curso && x.curso !== f.curso) return false;
      if (f.unidad && x.unidad !== f.unidad) return false;
      if (vista === 'avisos' && f.tipo && x.subtipo !== f.tipo) return false;
      if (!f.verRevisados && x.revisado) return false;
      return true;
    });
    return lista.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) {
      var va = String(a.x[o.campo] || ''), vb = String(b.x[o.campo] || '');
      var c = va < vb ? -1 : (va > vb ? 1 : 0);
      return (o.asc ? c : -c) || a.i - b.i;
    }).map(function (y) { return y.x; });
  }

  function lineas(n) { return n + ' línea' + (n === 1 ? '' : 's') + '.'; }
  /* La frase de encima de la lista: la nota de «Cambios para Séneca» (solo en el curso que viene) y cuántas líneas hay. */
  function resumen(rev, vista, n) { return (vista === 'cambios' && rev && rev.cambiosNota ? rev.cambiosNota + ' ' : '') + lineas(n); }

  /* «Cuadre de totales · N no cuadran» o «todo cuadra». */
  function resumenCuadre(rev) {
    var n = (contadores(rev).cuadre) || 0;
    return 'Cuadre de totales · ' + (n ? n + ' no cuadran' : 'todo cuadra');
  }
  /* El cuadre se abre solo si hay algo que no cuadra, salvo que la persona haya tocado el desplegable. */
  function cuadreAbierto(rev, tocado) { return tocado === null || tocado === undefined ? contadores(rev).cuadre > 0 : !!tocado; }

  /* El estado de una de las tres tablas del cuadre enteras: lo que sale al lado de su título. */
  function estadoTablaCuadre(t) {
    if (!t.existe) return 'sin datos todavía';
    return t.noCuadran ? '⚠ ' + t.noCuadran + ' fila' + (t.noCuadran === 1 ? '' : 's') + ' no cuadran' : 'cuadra';
  }

  /* Quién marcó una línea como revisada: su nombre si se sabe, o lo anterior a la @ del correo; lo que no es un correo, tal cual. */
  function nombreDePersona(correo, nombres) {
    var t = String(correo || '').trim();
    if (t.indexOf('@') === -1) return t;
    var c = t.toLowerCase();
    return (nombres && nombres[c]) || c.split('@')[0];
  }
  function fechaCorta(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES'); }
  /* «Marta, 14/10/2026 — nota», como la pantalla de hoy. */
  function textoRevisado(r, nombres) { return nombreDePersona(r.quien, nombres) + ', ' + fechaCorta(r.cuando) + (r.nota ? ' — ' + r.nota : ''); }

  /* Un nombre a su clave de alumno (para que pulsar el nombre abra su ficha): se arma una vez por curso con las filas del buscador [clave, nombre, curso, unidad, id]. Solo por nombre, como en la app de hoy. */
  function indicePorNombre(filasBuscador) {
    var ix = {};
    (filasBuscador || []).forEach(function (f) { ix[normalizar(f[1])] = { clave: f[0], unidad: f[3] || '' }; });
    return ix;
  }

  /* Una fila de la oferta de materias (solo lectura), filtrada por curso como hoy. */
  function filasOferta(oferta, curso) {
    return ((oferta && oferta.filas) || []).filter(function (f) { return !curso || f[0] === curso; });
  }
  function tituloOferta(t) { return String(t).replace('Columna en ALUMNADO', 'Columna en la ficha del alumno'); }

  /* Instrucción 139: la lectura `rev` con lo ya pedido por encima («Revisado, no es error», «Hecho», «Deshacer»), para que la pantalla cambie al momento y se acuerde de lo escrito hasta que la aplicación rehaga sus ficheros.
     `entradas`: lo de escritura.js ({ funcion, args, estado, resultado, aplicada, creada }); `info`: { curso, miCorreo, hora }. Lo fallido no cuenta; lo hecho cuenta solo si se aplicó después de la hora de los datos. Devuelve `rev`
     tal cual si no hay nada que poner. Solo copia las filas que cambian. */
  function superponer(rev, entradas, info) {
    var cambios = {}, hay = false;
    (entradas || []).slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (e) {
      if (e.estado === 'fallida') return;
      if (e.estado === 'hecha' && e.aplicada && info.hora && String(e.aplicada) <= String(info.hora)) return;
      var ar = e.args || [];
      if (ar[0] !== info.curso) return;
      if (e.funcion === 'webRevisionMarcar') { cambios[ar[1] + '|' + ar[2]] = e.estado === 'hecha' && e.resultado ? e.resultado : { quien: info.miCorreo, cuando: e.creada, nota: String(ar[3] || '') }; hay = true; }
      else if (e.funcion === 'webRevisionDeshacer') { cambios[ar[1] + '|' + ar[2]] = null; hay = true; }
    });
    if (!hay || !rev) return rev;
    var salida = Object.assign({}, rev);
    ['avisos', 'matricula', 'cuadre', 'cambios'].forEach(function (k) {
      if (!rev[k]) return;
      salida[k] = rev[k].map(function (f) {
        var c = (f.tipo || k) + '|' + f.clave;
        if (!(c in cambios)) return f;
        var g = Object.assign({}, f);
        if (cambios[c]) g.revisado = cambios[c]; else delete g.revisado;
        return g;
      });
    });
    return salida;
  }

  raiz.RevisionBase = { superponer: superponer, VISTAS: VISTAS, ACCION_CUADRE: ACCION_CUADRE, normalizar: normalizar, contadores: contadores, opciones: opciones, filas: filas, resumen: resumen, resumenCuadre: resumenCuadre, cuadreAbierto: cuadreAbierto,
    estadoTablaCuadre: estadoTablaCuadre, nombreDePersona: nombreDePersona, fechaCorta: fechaCorta, textoRevisado: textoRevisado, indicePorNombre: indicePorNombre, filasOferta: filasOferta, tituloOferta: tituloOferta };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.RevisionBase;
})(typeof window !== 'undefined' ? window : globalThis);
