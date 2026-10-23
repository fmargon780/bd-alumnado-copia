/* La ficha del alumno de la web nueva (instrucción 136): los mismos recuadros, con los mismos datos y la misma disposición que la ficha de hoy (JsBuscadorFicha.html y sus Js*Ficha*),
   pero SOLO PARA LEER. Donde la de hoy tiene un botón que escribe (Corregir, marcas de Jefatura, añadir nota, preparar un informe) esta pone «Cambiar en la app de hoy», que abre esa ficha
   en la app de hoy en otra pestaña. Lo que viene del fichero (`registro`) es la ficha ya montada por el disparador (FichaWeb.gs). No llama a ningún sitio.
   ctx = { urlApp, clave, antiguo, estado ('En marcha' | 'Cerrado' | …), unido, nombres: { correo: nombre }, pedirSituacion(idEscolar) -> promesa, escribir }.
   Instrucción 139: si `ctx.escribir` existe (la carpeta privada tiene las subcarpetas de peticiones; ficha-escribir.js), las notas, las correcciones de Trayectoria y NEAE y las marcas de Jefatura se escriben aquí
   mismo, como en la ficha de hoy; sin él, o en un curso cerrado, queda el enlace «Cambiar en la app de hoy». */
(function (raiz) {
  'use strict';
  var B = raiz.FichaBase, H = raiz.FichaHistorico, h = B.h, p = B.p, campo = B.campo, recuadro = B.recuadro;

  function vacio(v) { return v === '' || v == null ? '?' : v; }
  function corr(a, dato) { return (a.correcciones && a.correcciones[dato]) || null; }
  function conCorreccionDeTrayectoria(a) { return !!(corr(a, 'repPrimaria') || corr(a, 'repetia') || corr(a, 'pil')); }
  function nombreDe(ctx, correo) {
    var t = String(correo || '').trim();
    if (t.indexOf('@') === -1) return t;
    var c = t.toLowerCase();
    return (ctx.nombres && ctx.nombres[c]) || c.split('@')[0];
  }
  function fraseEspera(ctx) {
    return ctx.unido ? 'Los informes ya generados se marcarán «Ha cambiado» en la próxima actualización de datos.' : 'Los avisos, el cuadre y los informes cambiarán en la próxima actualización de datos.';
  }

  function tutores(a, conTelefonos) {
    var l = (a.familia || []).map(function (t) {
      var nombre = [t.nombre, t.apellido1, t.apellido2].filter(Boolean).join(' ');
      return p(nombre + (t.telefono ? ' · ' + t.telefono : '') + (conTelefonos && t.movil && t.movil !== t.telefono ? ' / ' + t.movil : '') + (conTelefonos && t.correo ? ' · ' + t.correo : ''));
    });
    return l.length ? l : [p('Sin datos.', 'campo')];
  }
  function situacionDe(ctx, id) {
    var s = H.situacion(function () { return ctx.pedirSituacion(String(id == null ? '' : id)); });
    return s.elemento;
  }

  function trayectoria(a, ctx, cerrado) {
    var t = a.trayectoria || {};
    var pares = [['PIL', t.pil], ['Repite este curso', t.repiteActual]]
      .concat(t.noPodra !== undefined ? [['No podrá repetir este curso', t.noPodra]] : [])
      .concat(t.agotadas !== undefined ? [['Ha agotado las dos permanencias', t.agotadas]] : [])
      .concat([['Repeticiones totales', t.repeticionesTotales], ['Cursos repetidos en ESO', t.cursosRepetidosEso, t.fuenteEso], ['Cursos repetidos en Primaria', t.cursosRepetidosPrimaria, t.fuentePrimaria],
        ['Colegio de procedencia', t.colegioProcedencia], ['Centros anteriores', t.centrosAnteriores]])
      .concat(t.motivoCorreccion && !conCorreccionDeTrayectoria(a) ? [['Corrección a mano', t.motivoCorreccion]] : [])
      .map(function (par) {
        return h('span', 'traz-dato', [h('span', 'campo', par[0] + ':'), ' ' + vacio(par[1]), par[2] ? ' ' : null, par[2] ? h('span', 'fuente-dato', '(' + par[2] + ')') : null]);
      });
    var etiquetas = { repPrimaria: 'Repeticiones en Primaria', repetia: 'Repetía el año pasado', pil: 'PIL' };
    var notas = ['repPrimaria', 'repetia', 'pil'].filter(function (d) { return corr(a, d); }).map(function (d) {
      var x = corr(a, d);
      return h('div', 'corr-nota', etiquetas[d] + ': ' + (x.valor === '' || x.valor == null ? '' : x.valor) + ' · Corregido por ' + (x.quien || '?') + ' el ' + B.fecha(x.cuando) + (x.motivo ? ': ' + x.motivo : ''));
    });
    var pendiente = a.correccionesPendientes ? h('div', 'corr-nota', fraseEspera(ctx) + (corr(a, 'pil') || ctx.unido ? '' : ' El PIL se recalculará en la próxima actualización de datos.')) : null;
    var cambiar = (!cerrado && !B.esBachillerato(a)) ? (ctx.escribir ? raiz.FichaEscribir.trayectoriaCorregir(a, ctx) : B.filaCambiar(ctx)) : null;
    return recuadro('Trayectoria', [h('div', 'traz-arriba', pares)].concat(notas, [pendiente, cambiar, H.historico(a.historico, a.mh, (a.matricula || {}).materias)]), 'ficha-doble');
  }

  function neae(a, ctx, cerrado) {
    var n = a.neae || {};
    var origen = function (valor, dato) { return [valor || '—', h('span', 'campo', n.censo ? ' (censo)' : (corr(a, dato) ? ' (a mano)' : ''))]; };
    var vistas = {};
    var notas = ['neae', 'medidas'].filter(function (d) { return corr(a, d); }).map(function (d) {
      var x = corr(a, d), k = (x.quien || '?') + '|' + x.cuando;
      if (vistas[k]) return null;
      vistas[k] = true;
      return h('div', 'corr-nota', 'Corregido por ' + (x.quien || '?') + ' el ' + B.fecha(x.cuando));
    });
    return recuadro('NEAE', [p([h('span', 'campo', 'Necesidades:'), ' '].concat(origen(n.neae, 'neae'))), p([h('span', 'campo', 'Medidas y recursos:'), ' '].concat(origen(n.medidas, 'medidas')))]
      .concat(notas, [(cerrado || B.esBachillerato(a)) ? null : (ctx.escribir ? raiz.FichaEscribir.neaeCorregir(a, ctx) : B.filaCambiar(ctx))]));
  }

  function matricula(a) {
    var m = a.matricula || {}, revisada = m.detalle && m.detalle.revisado;
    var materias = (m.materias || []).map(function (x) { return h('span', 'chip', x); });
    return recuadro('Matrícula', [
      p([h('span', 'campo', 'Estado:'), ' ' + vacio(m.estado) + (revisada ? ' · revisado' : '')], revisada ? 'gris' : ''),
      (m.nAsignaturas !== undefined || m.deberiaTener !== undefined)
        ? p([h('span', 'campo', 'Nº asignaturas:'), ' ' + (m.nAsignaturas === undefined ? '?' : m.nAsignaturas) + ' ', h('span', 'campo', '· Debería tener:'), ' ' + (m.deberiaTener === undefined ? '?' : m.deberiaTener)]) : null,
      p('Materias:', 'campo')].concat(materias.length ? materias : [h('span', 'campo', '—')]));
  }

  function marcas(a, ctx, cerrado) {
    if (ctx.escribir && !cerrado) return raiz.FichaEscribir.marcas(a, ctx);
    var m = a.marcas || {}, et = { conflictivo: 'Conflictivo', bilingue: 'Pide bilingüe', exentoFrances: 'Exento de francés' };
    var cajas = ['conflictivo', 'bilingue', 'exentoFrances'].map(function (c) {
      var i = h('input'); i.type = 'checkbox'; i.checked = !!m[c]; i.disabled = true;
      return h('label', 'marca-check', [i, et[c]]);
    });
    return recuadro('Marcas de Jefatura', cajas.concat([cerrado ? null : B.filaCambiar(ctx)]));
  }

  function cuandoRevisado(rev) {
    var f = rev && rev.cuando ? new Date(rev.cuando) : null;
    return 'Revisado · ' + (rev && rev.quien ? rev.quien : '?') + (f && !isNaN(f.getTime()) ? ' · ' + f.toLocaleDateString('es-ES') : '') + (rev && rev.nota ? ' — ' + rev.nota : '');
  }
  function avisos(a, ctx, abrirSituacion) {
    var d = a.matricula && a.matricula.detalle, vivos = [], revisados = [];
    if (d) {
      var partes = [];
      if (d.faltan) partes.push('faltan en Séneca: ' + d.faltan);
      if (d.sobran) partes.push('sobran en Séneca: ' + d.sobran);
      var linea = [p('Matrícula: ' + (partes.length ? partes.join(' · ') : (a.matricula.estado || 'no cuadra'))), d.nota ? p(d.nota, 'campo') : null];
      if (d.revisado) revisados.push(h('div', 'aviso-revisado', linea.concat([p(cuandoRevisado(d.revisado), 'meta-revisado')]))); else vivos = vivos.concat(linea);
    }
    (a.avisos || []).forEach(function (av) {
      var texto = av.aviso + (av.detalle ? ' — ' + av.detalle : '') + (av.hayOtroIgual ? ' (hay otro alumno con el mismo nombre)' : '');
      if (av.revisado) revisados.push(h('div', 'aviso-revisado', [p(texto), p(cuandoRevisado(av.revisado), 'meta-revisado')])); else vivos.push(p(texto));
    });
    var custodia = null;
    if (a.avisoCustodia) {
      var enlace = h('a', '', '⚠ Comprobar a quién se comunica: ver situación familiar');
      enlace.href = '#situacionFamiliar';
      enlace.addEventListener('click', function (e) { e.preventDefault(); abrirSituacion(); });
      custodia = p([enlace], 'sit-fam-aviso');
    }
    if (!vivos.length && !revisados.length) return recuadro('Avisos', [custodia, p('Sin avisos.', 'campo')]);
    return recuadro('Avisos', [custodia].concat(vivos.length ? vivos : [p('Sin avisos pendientes.', 'campo')], revisados, [p([B.enlaceApp(ctx, 'Abrir en la app de hoy', '')], 'meta-revisado')]));
  }

  function informes(a, ctx) {
    if (ctx.estado !== 'En marcha') return null;
    var lista = a.informes || [];
    return recuadro('Informes', lista.length ? lista.map(function (i) { return h('div', 'informe-linea', [h('span', '', i.nombre), ' ', B.enlaceApp(ctx, 'Preparar en la app de hoy')]); }) : [p('No hay informes para este alumno.', 'campo')]);
  }

  function transito(t) {
    var r = t.respuestas || {};
    var NIVEL = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };
    var COMP = { sinProblemas: 'Sin problemas', algunaIncidencia: 'Alguna incidencia', conflictivo: 'Conflictivo' };
    var ASIS = { normal: 'Normal', conFaltas: 'Con faltas frecuentes' };
    var BIL = { si: 'Sí', no: 'No', sinOpinion: 'Sin opinión' };
    var medidas = [];
    if (r.medidas) { if (r.medidas.refuerzo) medidas.push('Refuerzo'); if (r.medidas.apoyo) medidas.push('Apoyo'); if (r.medidas.adaptacion) medidas.push('Adaptación curricular'); }
    return recuadro('Tránsito', [campo('Clase de 6º', t.claseDe6 || '?'),
      campo('Nivel en Lengua/Matemáticas/Inglés', [NIVEL[r.nivelLengua], NIVEL[r.nivelMates], NIVEL[r.nivelIngles]].map(function (x) { return x || '?'; }).join(' / ')),
      campo('Hábitos de trabajo', NIVEL[r.habitosTrabajo] || '?'), campo('Comportamiento', COMP[r.comportamiento] || '?'), campo('Asistencia', ASIS[r.asistencia] || '?'),
      campo('Medidas que ha tenido', medidas.join(', ') || 'Ninguna'),
      campo('Recomendación', (r.recomendacionFrances ? 'Refuerzo en lugar de francés' : 'Francés como está previsto') + ' · Bilingüe: ' + (BIL[r.bilingue] || 'Sin opinión')),
      r.observaciones ? campo('Observaciones del tutor/a', r.observaciones) : null,
      p('Escrita por ' + (t.quienEscribio || '?') + '. Aprobada por Jefatura.', 'meta-revisado')]);
  }

  function observaciones(a, ctx, cerrado) {
    if (ctx.escribir && !cerrado) return raiz.FichaEscribir.observaciones(a, ctx, cerrado);
    var lista = (a.notas || []).map(function (n) {
      var llamada = n.tipo === 'llamada';
      var texto = llamada ? 'Llamada' + (n.via ? ' · ' + n.via : '') + (n.resultado ? ' · ' + n.resultado : '') + (n.texto ? ' · ' + n.texto : '') : n.texto;
      return h('div', 'nota', [h('div', 'texto', texto), h('div', 'meta', nombreDe(ctx, n.autor) + ' · ' + B.fecha(n.fecha) + (n.corregidaFecha ? ' · corregida el ' + B.fecha(n.corregidaFecha) : ''))]);
    });
    return recuadro('Observaciones', (lista.length ? lista : [p('Sin notas todavía.', 'campo')]).concat([cerrado ? null : B.filaCambiar(ctx)]), 'ficha-ancha-total');
  }

  /* La ficha de un alumno actual (el curso en marcha o uno anterior). */
  function fichaCompleta(a, ctx) {
    var cerrado = ctx.estado === 'Cerrado', b = a.basicos || {};
    var sit = situacionDe(ctx, b.idEscolar);
    var rejilla = h('div', 'ficha-rejilla', [
      recuadro('Datos básicos', [campo('Unidad', a.unidad), campo('Edad', b.edad), campo('Fecha de nacimiento', b.fechaNacimiento), campo('Nº Id. Escolar', b.idEscolar), campo('Sexo', b.sexo)]),
      recuadro('Familia', tutores(a, true).concat([sit])),
      trayectoria(a, ctx, cerrado),
      recuadro('Notas académicas', [campo('Pendientes', (a.notasAcademicas || {}).nPendientes ? ((a.notasAcademicas.asignaturasPendientes) || a.notasAcademicas.nPendientes) : 'Ninguna'), campo('Materias no superadas', (a.notasAcademicas || {}).matNoSuperadas || '—')]),
      neae(a, ctx, cerrado), matricula(a), marcas(a, ctx, cerrado),
      avisos(a, ctx, function () { var l = sit.querySelector('.sit-fam-linea'); if (l.getAttribute('aria-expanded') !== 'true') l.click(); if (l.scrollIntoView) l.scrollIntoView({ block: 'nearest' }); }),
      informes(a, ctx), a.transito ? transito(a.transito) : null, observaciones(a, ctx, cerrado)]);
    return h('div', 'ficha', [cabecera(a.nombre, false, ctx), B.cajaCopiar(a.nombre, b.idEscolar), rejilla]);
  }

  /* La ficha corta de un antiguo alumno. */
  function fichaCorta(a, ctx) {
    var rejilla = h('div', 'ficha-rejilla', [
      recuadro('Datos básicos', [campo('Sexo', a.sexo), campo('Nº Id. Escolar', a.idEscolar)]),
      recuadro('Familia', tutores(a, false).concat([situacionDe(ctx, a.idEscolar)])),
      recuadro('Matriculado en', [(a.historico && a.historico.length) ? H.historico(a.historico, a.mh, []) : p('Sin matrículas.', 'campo')], 'ficha-doble')]);
    return h('div', 'ficha', [cabecera(a.nombre, true, ctx), B.cajaCopiar(a.nombre, a.idEscolar), rejilla]);
  }

  function cabecera(nombre, antiguo, ctx) {
    return h('div', 'ficha-cabecera', [h('h2', '', [nombre, antiguo ? h('span', 'ficha-antiguo', ' (antiguo alumno)') : null]), h('span', 'ficha-enlace', [B.enlaceApp(ctx, 'Ver en la app de hoy', '')])]);
  }

  function dibujar(registro, ctx) { return ctx.antiguo ? fichaCorta(registro, ctx) : fichaCompleta(registro, ctx); }

  raiz.FichaDibujo = { dibujar: dibujar };
})(typeof window !== 'undefined' ? window : globalThis);
