/* Las cuentas de «Hoy» de la web nueva (instrucción 138, parte 2). Son las de la portada «Hoy» de hoy (JsHoy.html, JsMenuTareas.html, JsTareasPasos.html, JsQuienVieneObjetivos.html, JsDocumentosEstado.html,
   JsDescargasTarea.html, JsMesaBajas.html, JsPorMirar.html, JsCambiosHoy.html): qué tarea toca según la fecha, el estado de cada paso, «Necesita tu atención», «Próximas fechas», «Por mirar» y «Últimos cambios», con las
   mismas cuentas. Trabaja sobre lo que deja el disparador (HoyWeb.gs): un fichero por curso con lo que lee «Hoy», ya reducido a lo que usa. No dibuja nada: el dibujo es hoy-dibujo.js. Una prueba
   (pruebas/web-nueva-hoy-pantalla.mjs) compara lo que sale con lo que enseña la portada de hoy. */
(function (raiz) {
  'use strict';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  /* Las seis tareas, en el orden del curso (TAREAS_ de JsMenuTareas.html). */
  var TAREAS = [
    { clave: 'admision', nombre: 'Admisión', frase: 'Quién ha pedido plaza en el centro y a quién se le ha concedido.' },
    { clave: 'transito', nombre: 'Tránsito', frase: 'Las fichas de los tutores de 6º de los colegios adscritos.' },
    { clave: 'matricula', nombre: 'Matrícula', frase: 'Quién se está matriculando, quién tiene un problema y quién falta. La meta es la certificación de matrícula.' },
    { clave: 'agrupamiento', nombre: 'Agrupamiento', frase: 'Repartir a los matriculados en sus unidades.' },
    { clave: 'espera', nombre: 'Lista de espera', frase: 'Los no admitidos de mayo y las admisiones extraordinarias.' },
    { clave: 'inicio', nombre: 'Inicio de curso', frase: 'Informes por unidad, materias pendientes, hojas de «enterado» y de seguimiento.' }
  ];
    var GRUPO_DE_FICHERO = { primaria: 'expedientes', secundaria: 'expedientes' };
  var CAMBIOS_HOY_MAX = 5, CAMBIOS_HOY_DIAS = 7;

  /* ---------------------------------------------------------------- fechas y palabras */
  function diasEntre(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }
  function plural(n) { return n + (n === 1 ? ' día' : ' días'); }
  function fechaCorta(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? (+p[2]) + ' de ' + MESES[+p[1] - 1] : ''; }
  function fechaCortaAbrev(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? (+p[2]) + ' ' + MESES[+p[1] - 1].slice(0, 3) : ''; }
  function mesDe(iso) { return MESES[+String(iso).split('-')[1] - 1] || ''; }
  function hoyIso(fecha) { var h = fecha || new Date(); return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2); }
  function fechaHoyLarga(fecha) { var h = fecha || new Date(); return DIAS_SEMANA[h.getDay()] + ' ' + h.getDate() + ' de ' + MESES[h.getMonth()]; }
  function nombreGrado(g) {
    g = String(g || '');
    if (g === '1º BACH') return '1º Bachillerato';
    if (g === '2º BACH') return '2º Bachillerato';
    if (/^\dº$/.test(g)) return g + ' ESO';
    return g;
  }
  function faltan(n) { return n === 1 ? 'falta 1' : 'faltan ' + n; }
  function quedan(n) { return n === 1 ? 'queda 1 por matricular' : 'quedan ' + n + ' por matricular'; }
  function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function unirCursos(c) { return c.length < 2 ? c.join('') : c.slice(0, -1).join(', ') + ' y ' + c[c.length - 1]; }
  function haceCuanto(iso, ahora) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var m = Math.max(0, Math.round((ahora - t) / 60000));
    if (m < 1) return 'hace un momento';
    if (m < 60) return 'hace ' + m + ' min';
    if (m < 60 * 24) return 'hace ' + Math.round(m / 60) + ' h';
    var d = Math.round(m / 1440);
    return d === 1 ? 'ayer' : 'hace ' + d + ' días';
  }
  /* Ordena sin mover a los iguales (el `sort` de la app de hoy es estable). */
  function ordenaEstable(lista, cmp) { return lista.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return cmp(a.x, b.x) || a.i - b.i; }).map(function (y) { return y.x; }); }

  /* ---------------------------------------------------------------- el contexto: lo que lee «Hoy» (la memoria de la portada de hoy) */
  /* `m`: { abiertos: [{curso, estado}], cursoVisto, centro: {usaExcelJefatura}, porMirar: {lista}, cambios: {recientes}, miCorreo, urlApp, datos: { curso: lecturas } }.
     `lecturas`: { calendario, qv, desc, doc, rev, mesa, tutores, seguimiento, bandeja, portada } (HoyWeb.gs). */
  function lect(m, curso) { return (m.datos && m.datos[curso]) || {}; }

  function calendarioDe(m, curso) { var c = lect(m, curso).calendario; return (c && c.filas) || []; }
  function fechaDeHito(m, clave, curso) {
    var f = calendarioDe(m, curso).filter(function (x) { return x.clave === clave; })[0];
    if (f && f.desde) return f.desde;
    if (clave === 'certificacionJulio') { var d = lect(m, curso).qv; return (d && d.fechaGeneral && d.fechaGeneral.fecha) || ''; }
    return '';
  }

  function estadoTarea(m, clave, curso, hoy) {
    var tramos = calendarioDe(m, curso).filter(function (f) { return f.clave === clave && f.desde && f.hasta; }).sort(function (a, b) { return a.n - b.n; });
    if (!tramos.length) return { estado: 'sinFecha', texto: 'Sin fechas', curso: curso };
    for (var i = 0; i < tramos.length; i++) {
      var t = tramos[i];
      if (hoy >= t.desde && hoy <= t.hasta) {
        var duracion = diasEntre(t.desde, t.hasta) + 1, dia = diasEntre(t.desde, hoy) + 1;
        return { estado: 'marcha', curso: curso, desde: t.desde, hasta: t.hasta, finDias: diasEntre(hoy, t.hasta), dia: dia, duracion: duracion, texto: duracion <= 14 ? 'Día ' + dia + ' de ' + duracion : 'En marcha' };
      }
    }
    var proximo = tramos.filter(function (t) { return t.desde > hoy; })[0];
    if (proximo) return { estado: 'antes', curso: curso, desde: proximo.desde, hasta: proximo.hasta, diasHasta: diasEntre(hoy, proximo.desde), texto: 'Empieza el ' + fechaCorta(proximo.desde) };
    var ultimo = tramos[tramos.length - 1];
    return { estado: 'cerrada', curso: curso, hasta: ultimo.hasta, texto: 'Cerrada en ' + mesDe(ultimo.hasta) };
  }

  function cursoDeTarea(m, clave, hoy) {
    var abiertos = m.abiertos || [];
    var prep = abiertos.filter(function (c) { return c.estado === 'En preparación'; });
    var marcha = abiertos.filter(function (c) { return c.estado === 'En marcha'; });
    var candidatos = clave === 'inicio' ? (marcha.length ? marcha : prep) : prep.concat(marcha);
    if (!candidatos.length) return m.cursoVisto;
    for (var i = 0; i < candidatos.length; i++) if (estadoTarea(m, clave, candidatos[i].curso, hoy).estado === 'marcha') return candidatos[i].curso;
    var antes = candidatos.filter(function (c) { return estadoTarea(m, clave, c.curso, hoy).estado === 'antes'; })[0];
    return (antes || candidatos[0]).curso;
  }

  function tareasDeHoy(m, hoy) {
    var lista = TAREAS.map(function (t, i) {
      var e = estadoTarea(m, t.clave, cursoDeTarea(m, t.clave, hoy), hoy);
      e.tarea = t; e.orden = i;
      return e;
    });
    var enMarcha = lista.filter(function (e) { return e.estado === 'marcha'; });
    enMarcha.forEach(function (e) {
      var dias = e.finDias;
      ['certificacionJulio', 'certificacionSeptiembre'].forEach(function (h) {
        if (e.tarea.clave !== 'matricula') return;
        var f = fechaDeHito(m, h, e.curso);
        if (f && f >= hoy) dias = Math.min(dias, diasEntre(hoy, f));
      });
      e.proximoDias = dias;
    });
    enMarcha = ordenaEstable(enMarcha, function (a, b) { return a.proximoDias - b.proximoDias || a.orden - b.orden; });
    var proxima = ordenaEstable(lista.filter(function (e) { return e.estado === 'antes'; }), function (a, b) { return a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : a.orden - b.orden; })[0] || null;
    return { todas: lista, enMarcha: enMarcha, toca: enMarcha[0] || null, proxima: proxima, hoy: hoy };
  }

  /* ---------------------------------------------------------------- objetivos de matrícula (JsQuienVieneObjetivos.html) */
  function cifrasVivasPanel(p, d) {
    var x = 0, y = 0, prov = 0;
    (d.esperados || []).forEach(function (e) {   // e = [curso, estado, noViene, otroCurso]
      if (e[0] !== p.curso || e[2] || e[1] === 'No viene') return;
      y++;
      if (e[1] === 'Matriculado') x++;
      if (e[1] === 'Matrícula provisional') prov++;
    });
    p.matriculados = x; p.esperados = y; p.provisionales = prov;
  }
  function estadoObjetivo(p, d, hoy) {
    if (p.objetivo === null || p.objetivo === undefined) return null;
    var M = p.matriculados + (p.noEsperadosMatriculados || 0), P = p.esperados - p.matriculados, O = p.objetivo;
    var general = (d.fechaGeneral && d.fechaGeneral.fecha) || '';
    var F = p.fechaPropia || general;
    var r = { M: M, P: P, O: O, fecha: F, fechaEsGeneral: !p.fechaPropia && !!general };
    var falta = O - M;
    var pasada = F ? diasEntre(F, hoy) : 0;
    if (M >= O) { r.color = 'verde'; r.texto = 'Objetivo alcanzado'; return r; }
    if (M + P < O) {
      r.color = 'rojo';
      r.texto = 'Ya no se puede llegar: ' + faltan(falta) + ' y ' + (P === 0 ? 'no queda nadie por matricular' : 'solo ' + quedan(P)) + (F && pasada > 0 ? ' · plazo cumplido' : '');
      return r;
    }
    if (F && pasada > 0) { r.color = 'rojo'; r.texto = 'Plazo cumplido hace ' + plural(pasada) + ': ' + faltan(falta); return r; }
    r.color = 'ambar';
    var dias = F ? -pasada : null;
    r.dias = dias === null ? '' : (dias === 0 ? 'termina hoy' : (dias === 1 ? 'queda 1 día' : 'quedan ' + dias + ' días'));
    r.texto = [mayuscula(faltan(falta)), quedan(P)].join(' · ') + (r.dias ? ' · ' + r.dias : '');
    return r;
  }
  function cursosEnRojo(d, hoy) {
    if (!d || !d.esPreparacion) return [];
    var salida = [];
    (d.panel || []).forEach(function (p) { cifrasVivasPanel(p, d); var e = estadoObjetivo(p, d, hoy); if (e && e.color === 'rojo') salida.push(p.curso); });
    return salida;
  }

  /* ---------------------------------------------------------------- documentos y mesa */
  function sumaDocumentos(filas) {
    var s = { total: 0, alDia: 0, falta: 0, cambiado: 0, fallo: 0, generando: 0, espera: 0 };
    filas.forEach(function (f) { Object.keys(s).forEach(function (k) { s[k] += (f.resumen && f.resumen[k]) || 0; }); });
    s.faltan = s.falta + s.cambiado + s.fallo;
    return s;
  }
  function estadoDocumento(c, claves) {
    if (!c.doc) return { s: 'falta', texto: 'Trayendo los documentos…' };
    var r = sumaDocumentos((c.doc.filas || []).filter(function (f) { return claves.indexOf(f.clave) !== -1; }));
    var g = c.doc.generacion || {};
    if (!r.total) return { s: 'nohace' };
    if (r.generando || r.espera) return { s: 'falta', n: r.generando + r.espera, texto: g.enCurso && g.parada ? 'Se ha parado' : 'Generando' };
    if (r.faltan) return { s: 'falta', n: r.faltan, texto: 'Faltan ' + r.faltan };
    return { s: 'hecho', texto: 'Al día' };
  }
  function mesaBajasNuevos(cursos) {
    var baj = 0, nue = 0, cam = 0, nivel = '';
    (cursos || []).forEach(function (c) { if ((c.bajas || 0) + (c.nuevos || 0) + (c.cambiosReparto || 0) && !nivel) nivel = c.curso; baj += c.bajas || 0; nue += c.nuevos || 0; cam += c.cambiosReparto || 0; });
    var partes = [];
    if (baj) partes.push(baj + (baj === 1 ? ' ha dejado de venir' : ' han dejado de venir'));
    if (nue) partes.push(nue + (nue === 1 ? ' nuevo' : ' nuevos'));
    if (cam) partes.push(cam + (cam === 1 ? ' cambio desde el reparto' : ' cambios desde el reparto'));
    return { baj: baj, nue: nue, cam: cam, nivel: nivel, texto: partes.join(' · ') };
  }

  /* ---------------------------------------------------------------- «Datos de Séneca» de cada tarea (JsDescargasTarea.html) */
  function diasDesde(iso, hoy) { return iso ? Math.max(0, diasEntre(String(iso).slice(0, 10), hoy)) : null; }
  function ficherosDeClave(d, k) {
    var fijo = (d.filas || []).filter(function (f) { return f.clave === k; })[0];
    if (fijo) return fijo.fecha ? [{ nombre: fijo.nombre, fecha: fijo.fecha }] : [];
    var tal = function (l) { return (l || []).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; }); };
    if (k === 'admision_ordinaria' || k === 'admision_extraordinaria') return tal((d.admision || []).filter(function (f) { return (f.tipo === 'ordinaria') === (k === 'admision_ordinaria'); }));
    if (k === 'resolucion_admision') return tal(d.resolucion && d.resolucion.ficheros);
    if (k === 'sobres_matricula') return tal(d.sobres);
    if (k === 'provisionales_matricula') return tal(d.provisionales);
    if (k === 'planificacion') return tal(d.planificacion);
    return [];
  }
  function nombreAmable(k, d) {
    var fijo = (d.filas || []).filter(function (f) { return f.clave === k; })[0];
    if (fijo) return fijo.nombre;
    return ({ admision_ordinaria: 'Solicitudes de admisión', admision_extraordinaria: 'Solicitudes de admisión', resolucion_admision: 'Resolución de admisión (PDF)', sobres_matricula: 'Sobres de matrícula',
      provisionales_matricula: 'Matrícula provisional de 2º de Bachillerato', planificacion: 'Planificación de matrícula', primaria: 'Expedientes de Primaria', secundaria: 'Expedientes de Secundaria' })[k] || k;
  }
  function exigenciasDeTarea(t) {
    var salida = [], solicitudes = false;
    t.claves.forEach(function (k) {
      if (k === 'admision_ordinaria' || k === 'admision_extraordinaria') { if (!solicitudes) { salida.push(['admision_ordinaria', 'admision_extraordinaria']); solicitudes = true; } return; }
      salida.push([k]);
    });
    return salida;
  }
  function estadoDatosDeTarea(tarea, c) {
    var d = c.desc;
    if (!d) return { s: 'falta', texto: 'Trayendo los ficheros…' };
    var t = d.tareas && d.tareas[tarea];
    if (!t) return { s: 'hecho' };
    var faltanF = [], antiguos = [];
    exigenciasDeTarea(t).forEach(function (grupo) {
      var existentes = [];
      grupo.forEach(function (k) { existentes = existentes.concat(ficherosDeClave(d, k)); });
      if (grupo.length === 1 && GRUPO_DE_FICHERO[grupo[0]] === 'expedientes') {
        var nec = (grupo[0] === 'primaria' ? (d.expedientes && d.expedientes.primaria) : (d.expedientes && d.expedientes.secundaria)) || 0;   // cuántos expedientes hacen falta
        if (nec) faltanF.push(nombreAmable(grupo[0], d) + ' (' + nec + ')');
        return;
      }
      if (!existentes.length) { faltanF.push(nombreAmable(grupo[0], d)); return; }
      existentes.forEach(function (f) {
        var dias = diasDesde(f.fecha, c.hoy);
        if (dias !== null && dias > t.antiguoDias) antiguos.push(f.nombre + ' (de hace ' + plural(dias) + ')');
      });
    });
    if (faltanF.length) return { s: 'falta', n: faltanF.length, texto: 'Falta: ' + faltanF.join(', ') };
    if (antiguos.length) return { s: 'falta', n: antiguos.length, texto: 'Antiguo: ' + antiguos.slice(0, 2).join(', ') + (antiguos.length > 2 ? '…' : '') };
    return { s: 'hecho', texto: 'Al día' };
  }

  /* ---------------------------------------------------------------- los pasos de cada tarea y su estado (JsTareasPasos.html) */
  function noHaceFalta(texto) { return { s: 'nohace', texto: texto }; }
  function enMemoria(x) { return x !== undefined && x !== null; }
  function pasoDatos(tarea) { return { clave: 'datos', etiqueta: 'Datos de Séneca', estado: function (c) { return estadoDatosDeTarea(tarea, c); } }; }

  function pasos(m) {
    function otrosSinRevisar(d) { return (d.esperados || []).filter(function (e) { return e[3] === 1; }).length; }
    return {
      admision: [
        pasoDatos('admision'),
        { clave: 'resolucion', etiqueta: 'Resolución de admisión', estado: function (c) {
          var d = c.qv; if (!d) return { s: 'falta', texto: 'Trayendo la admisión…' };
          if (!(d.solicitudes || []).length) return noHaceFalta('Aún no hay solicitudes');
          if (!(d.resolucion && d.resolucion.leida)) return { s: 'falta', texto: 'Falta el PDF de la resolución' };
          var av = d.resolucion.avisos || 0;
          return av ? { s: 'falta', n: av, texto: 'No cuadra con el PDF' } : { s: 'hecho', texto: 'Cuadra con el PDF' };
        } },
        { clave: 'admitidos', etiqueta: 'Admitidos y no admitidos por curso', estado: function (c) {
          var d = c.qv; if (!d) return { s: 'falta' };
          if (!(d.solicitudes || []).length) return noHaceFalta('Aún no hay solicitudes');
          var sin = (d.resolucion && d.resolucion.leida) ? (d.resolucion.sinEmparejar || 0) : 0;
          if (sin) return { s: 'falta', n: sin, texto: sin + ' sin emparejar' };
          var adm = d.solicitudes.filter(function (s) { return s[1] === 'esperado_pendiente' || s[1] === 'esperado_matriculado'; }).length;
          return { s: 'hecho', n: adm, texto: adm + ' admitidos' };
        } },
        { clave: 'esperados', etiqueta: 'A quién se espera en cada curso', estado: function (c) {
          var d = c.qv; if (!d) return { s: 'falta' };
          if (!d.esPreparacion) return noHaceFalta('El curso no está en preparación');
          return (d.esperados || []).length ? { s: 'hecho', n: d.esperados.length, texto: d.esperados.length + ' esperados' } : { s: 'falta', texto: 'Aún no hay esperados' };
        } }
      ],
      transito: [
        pasoDatos('transito'),
        { clave: 'tutores', etiqueta: 'Tutores de 6º y plazo', estado: function (c) {
          if (!enMemoria(c.tutores)) return noHaceFalta('El tránsito se sigue en el curso en preparación');
          return c.tutores ? { s: 'hecho', n: c.tutores, texto: c.tutores + ' tutores' } : { s: 'falta', texto: 'Aún no hay tutores dados de alta' };
        } },
        { clave: 'seguimiento', etiqueta: 'Seguimiento de las fichas', estado: function (c) {
          var cols = c.seguimiento && c.seguimiento.porColegio;
          if (!cols) return noHaceFalta('Sin seguimiento todavía');
          var esp = 0, env = 0; cols.forEach(function (x) { esp += x.totalEsperados; env += x.enviadas; });
          return !esp ? noHaceFalta('Aún no hay alumnado esperado') : (env >= esp ? { s: 'hecho', texto: env + ' de ' + esp + ' enviadas' } : { s: 'falta', n: esp - env, texto: env + ' de ' + esp + ' enviadas' });
        } },
        { clave: 'bandeja', etiqueta: 'Revisar y aprobar', estado: function (c) {
          if (!enMemoria(c.bandeja)) return noHaceFalta('Nada que revisar todavía');
          var n = c.bandeja || 0;
          return n ? { s: 'falta', n: n, texto: n + ' por revisar' } : { s: 'hecho', texto: 'Nada por revisar' };
        } }
      ],
      matricula: [
        pasoDatos('matricula'),
        { clave: 'cursos', etiqueta: 'Cómo va cada curso', estado: function (c) {
          var d = c.qv; if (!d) return { s: 'falta' };
          if (!d.esPreparacion) return noHaceFalta('El curso no está en preparación');
          var f = fechaDeHito(m, 'certificacionJulio', c.curso), conObjetivo = (d.panel || []).some(function (p) { return p.objetivo !== null && p.objetivo !== undefined; });
          if (!conObjetivo) return { s: 'falta', texto: 'Falta escribir el mínimo de cada curso' };
          var rojos = cursosEnRojo(d, c.hoy), faltanN = 0;
          (d.panel || []).forEach(function (p) { var e = estadoObjetivo(p, d, c.hoy); if (e && e.color !== 'verde') faltanN++; });
          var cuando = f ? ' · ' + fechaCorta(f) : ' · sin fecha';
          if (rojos.length) return { s: 'falta', n: rojos.length, texto: rojos.length + (rojos.length === 1 ? ' curso no llega' : ' cursos no llegan') };
          return faltanN ? { s: 'falta', n: faltanN, texto: faltanN + ' cursos sin mínimo' + cuando } : { s: 'hecho', texto: 'Mínimo cumplido' + cuando };
        } },
        { clave: 'llamar', etiqueta: 'A quién llamar', estado: function (c) {
          var d = c.qv; if (!d || !d.esPreparacion) return noHaceFalta('Sin matrícula en marcha');
          var n = (d.esperados || []).filter(function (e) { return !e[2] && e[1] === 'Pendiente'; }).length;
          return n ? { s: 'falta', n: n, texto: n + ' familias' } : { s: 'hecho', texto: 'Nadie por llamar' };
        } },
        { clave: 'sobres', etiqueta: 'Sobres', estado: function (c) {
          var d = c.qv; if (!d || !d.esPreparacion) return noHaceFalta('Sin matrícula en marcha');
          if (!d.sobresLeidos) return { s: 'falta', texto: 'Falta el fichero de los sobres' };
          var n = 0; (d.panel || []).forEach(function (p) { n += ((p.sobres && p.sobres.sinRevisar) || 0) + ((p.sobres && p.sobres.conProblema) || 0); });
          n += d.sobresSinEmparejar || 0;
          return n ? { s: 'falta', n: n, texto: n + ' por mirar' } : { s: 'hecho' };
        } },
        { clave: 'casos', etiqueta: 'Casos a mirar', estado: function (c) {
          var d = c.qv; if (!d || !d.esPreparacion) return noHaceFalta('Sin matrícula en marcha');
          var n = (d.noEsperados || 0) + (d.provisionalesSinEmparejar || 0) + otrosSinRevisar(d);
          return n ? { s: 'falta', n: n, texto: n + ' casos' } : { s: 'hecho', texto: 'Ninguno' };
        } }
      ],
      agrupamiento: [
        pasoDatos('agrupamiento'),
        { clave: 'oferta', etiqueta: 'Qué se ofrece y qué eligió cada familia', estado: function (c) { return (c.qv && c.qv.esPreparacion && c.qv.planificacion && !c.qv.planificacion.leida) ? { s: 'falta', texto: 'Falta lo que eligió cada familia' } : { s: 'hecho' }; } },
        { clave: 'mesa', etiqueta: 'La mesa', estado: function (c) {
          var mm = c.mesa || []; if (!mm.length) return { s: 'falta', texto: 'Aún sin modelo' };
          var bn = mesaBajasNuevos(mm);
          if (bn.baj + bn.nue + bn.cam) return { s: 'falta', n: bn.baj + bn.nue + bn.cam, texto: bn.texto };
          var def = mm.filter(function (x) { return x.estado === 'definitivo'; }).length, sin = 0; mm.forEach(function (x) { sin += x.sinColocar || 0; });
          var empezados = mm.filter(function (x) { return x.estado === 'enMarcha' || x.estado === 'definitivo'; }).length;
          if (def === mm.length) return { s: 'hecho', texto: 'Todos los cursos, definitivos' };
          return { s: 'falta', n: sin || null, texto: empezados ? sin + ' sin colocar' : 'Sin empezar' };
        } },
        { clave: 'comprobar', etiqueta: 'Comprobar con Séneca', estado: function (c) { var n = (c.contadores.matricula || 0) + (c.contadores.cuadre || 0); return n ? { s: 'falta', n: n, texto: n + ' por mirar' } : { s: 'hecho' }; } },
        { clave: 'cambios', etiqueta: 'Cambios para Séneca', estado: function (c) { var n = c.contadores.cambios || 0; return n ? { s: 'falta', n: n, texto: n + ' por pasar' } : { s: 'hecho', texto: 'Ninguno por pasar' }; } },
        { clave: 'listados', etiqueta: 'Listados por grupo', estado: function (c) { return estadoDocumento(c, ['mesa']); } },
        { clave: 'excel', etiqueta: 'Excel de Jefatura', si: function () { return !m.centro || m.centro.usaExcelJefatura !== false; }, estado: function () { return { s: 'hecho', texto: 'Mientras el centro lo use' }; } }
      ],
      espera: [
        pasoDatos('espera'),
        { clave: 'lista', etiqueta: 'La lista y las llamadas', estado: function (c) {
          var d = c.qv; if (!d) return { s: 'falta' };
          var l = d.listaEspera || []; if (!l.length) return noHaceFalta('La lista está vacía');
          var sin = l.filter(function (s) { return !(s[1] || s[3]); }).length;   // s = [grado, llamada, interesada, docRecibida]
          return sin ? { s: 'falta', n: sin, texto: sin + ' sin llamar' } : { s: 'hecho', texto: 'Todos atendidos' };
        } }
      ],
      inicio: [
        pasoDatos('inicio'),
        { clave: 'avisos', etiqueta: 'Avisos del alumnado por revisar', estado: function (c) { var n = c.contadores.avisos || 0; return n ? { s: 'falta', n: n, texto: n + ' por revisar' } : { s: 'hecho', texto: 'Ninguno por revisar' }; } },
        { clave: 'documentos', etiqueta: 'Documentos', estado: function (c) { return estadoDocumento(c, ['informesEso', 'informesBac', 'pendientes', 'pendientesBac', 'enterado', 'seguimiento']); } },
        { clave: 'enviar', etiqueta: 'Enviar a los tutores', estado: function (c) {
          if (!c.doc) return { s: 'falta' };
          var t = c.doc.tutores || []; if (!t.length) return { s: 'falta', texto: 'Faltan los tutores' };
          var sin = t.filter(function (x) { return !x[0] || x[1]; }).length;   // x = [enviado, pendienteDeReenvio]
          return sin ? { s: 'falta', n: sin, texto: sin + ' sin enviar' } : { s: 'hecho', texto: 'Enviados a todos' };
        } }
      ]
    };
  }

  function datosDeTarea(m, curso, hoy) {
    var l = lect(m, curso), vista = lect(m, m.cursoVisto);
    return { curso: curso, hoy: hoy, qv: l.qv, desc: l.desc, doc: l.doc, contadores: (l.rev && l.rev.contadores) || {}, mesa: vista.mesa || [], tutores: l.tutores, seguimiento: l.seguimiento, bandeja: l.bandeja };
  }

  /* [{ paso, i, s: 'hecho'|'toca'|'pendiente'|'nohace', n, texto }] */
  function estadoPasosDe(m, clave, curso, hoy) {
    var c = datosDeTarea(m, curso, hoy), primero = true;
    return pasos(m)[clave].filter(function (p) { return !p.si || p.si(); }).map(function (p, i) {
      var r = p.estado(c) || { s: 'falta' };
      var s = r.s === 'falta' ? (primero ? 'toca' : 'pendiente') : r.s;
      if (r.s === 'falta') primero = false;
      return { paso: p, i: i, s: s, n: r.n === undefined ? null : r.n, texto: r.texto || '' };
    });
  }

  /* «Necesita tu atención»: cada línea es un paso de una tarea en marcha con cosas por hacer. */
  function atencionHoy(m, h) {
    var items = [], conCaja = [];
    var bn = mesaBajasNuevos(lect(m, m.cursoVisto).mesa);
    if (h.toca) { conCaja.push(h.toca); var otras = h.enMarcha.filter(function (e) { return e !== h.toca; }); if (otras.length) conCaja.push(otras[0]); }
    h.enMarcha.forEach(function (e) {
      var clave = e.tarea.clave, tieneCaja = conCaja.indexOf(e) !== -1;
      estadoPasosDe(m, clave, e.curso, h.hoy).forEach(function (r) {
        if (r.s !== 'toca' && r.s !== 'pendiente') return;
        if (!r.n && !(clave === 'matricula' && r.paso.clave === 'cursos')) return;
        if (clave === 'agrupamiento' && r.paso.clave === 'mesa' && bn.texto) return;
        var d = lect(m, e.curso).qv;
        var rojos = (clave === 'matricula' && r.paso.clave === 'cursos') ? cursosEnRojo(d, h.hoy) : [];
        if (tieneCaja && !rojos.length) return;
        var texto = rojos.length ? unirCursos(rojos.map(nombreGrado)) + (rojos.length === 1 ? ' no llega' : ' no llegan') + ' al mínimo de matrícula.'
          : e.tarea.nombre + ' › ' + r.paso.etiqueta + ': ' + (r.texto || r.n) + '.';
        items.push({ g: rojos.length ? 1 : (r.paso.clave === 'datos' ? 3 : 2), texto: texto });
      });
    });
    if (bn.texto && !conCaja.some(function (e) { return e.tarea.clave === 'agrupamiento'; })) items.push({ g: 2, texto: 'La mesa: ' + bn.texto + '.' });
    var portada = lect(m, m.cursoVisto).portada;
    if (portada && portada.resumen && portada.resumen.aMedias) items.push({ g: 1, texto: 'La última actualización de datos quedó a medias.' });
    ((portada && portada.fijas) || []).filter(function (f) { return f.estado === 'no'; }).forEach(function (f) { items.push({ g: 1, texto: f.frase }); });
    var cm = cursoDeTarea(m, 'matricula', h.hoy);
    var estM = h.todas.filter(function (e) { return e.tarea.clave === 'matricula'; })[0];
    if (estM && estM.estado !== 'cerrada' && estM.estado !== 'sinFecha') {
      [['certificacionJulio', 'de julio'], ['certificacionSeptiembre', 'de septiembre']].forEach(function (x) {
        if (!fechaDeHito(m, x[0], cm)) items.push({ g: 3, texto: 'La certificación de matrícula ' + x[1] + ' no tiene fecha (sin fecha).' });
      });
    }
    return ordenaEstable(items, function (a, b) { return a.g - b.g; }).slice(0, 5);
  }

  function proximasFechasHoy(m, h) {
    var lista = [];
    var anade = function (fecha, texto) { if (fecha && fecha >= h.hoy) lista.push({ fecha: fecha, texto: texto }); };
    h.todas.forEach(function (e) {
      calendarioDe(m, e.curso).filter(function (f) { return f.clave === e.tarea.clave && f.desde && f.hasta; }).forEach(function (f) {
        anade(f.desde, 'Empieza: ' + e.tarea.nombre);
        anade(f.hasta, 'Termina: ' + e.tarea.nombre);
      });
    });
    var cm = cursoDeTarea(m, 'matricula', h.hoy);
    anade(fechaDeHito(m, 'certificacionJulio', cm), 'Certificación de matrícula de julio');
    anade(fechaDeHito(m, 'certificacionSeptiembre', cm), 'Certificación de matrícula de septiembre');
    return ordenaEstable(lista, function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; }).slice(0, 5);
  }

  /* «Por mirar»: las líneas sin contestar que tocan hoy (la tarea que toca, las demás en marcha y las de «siempre»). */
  function porMirarVisibles(m, h) {
    var lista = (m.porMirar && m.porMirar.lista) || [];
    var toca = h && h.toca ? h.toca.tarea.clave : '', enMarcha = {};
    ((h && h.enMarcha) || []).forEach(function (e) { enMarcha[e.tarea.clave] = true; });
    var grupo = function (e) { return e.cuando === toca ? 0 : (e.cuando === 'siempre' ? 2 : 1); };
    return lista.filter(function (e) { return e.cuando === 'siempre' || enMarcha[e.cuando]; }).slice().map(function (e, i) { return { e: e, i: i }; })
      .sort(function (a, b) { return grupo(a.e) - grupo(b.e) || a.i - b.i; }).map(function (x) { return x.e; });
  }

  /* «Últimos cambios»: de los demás, de los últimos siete días, lo más nuevo arriba, y los seguidos de la misma persona y el mismo tipo en una sola línea. */
  function lineasUltimosCambios(m, ahora) {
    var limite = ahora - CAMBIOS_HOY_DIAS * 86400000;
    var otros = ordenaEstable(((m.cambios && m.cambios.recientes) || []).filter(function (e) { return e.c !== m.miCorreo && Date.parse(e.h) >= limite; }), function (a, b) { return b.n - a.n; });
    var lineas = [];
    otros.forEach(function (e) {
      var ult = lineas[lineas.length - 1];
      if (ult && ult.c === e.c && ult.t === e.t) { ult.veces++; return; }
      lineas.push({ c: e.c, q: e.q, t: e.t, x: e.x, h: e.h, w: e.w, veces: 1 });
    });
    return lineas.slice(0, CAMBIOS_HOY_MAX);
  }

  var api = { TAREAS: TAREAS, lect: lect, tareasDeHoy: tareasDeHoy, estadoTarea: estadoTarea, estadoPasosDe: estadoPasosDe, estadoObjetivo: estadoObjetivo, cifrasVivasPanel: cifrasVivasPanel, cursosEnRojo: cursosEnRojo,
    mesaBajasNuevos: mesaBajasNuevos, fechaDeHito: fechaDeHito, calendarioDe: calendarioDe, cursoDeTarea: cursoDeTarea, atencionHoy: atencionHoy, proximasFechasHoy: proximasFechasHoy, porMirarVisibles: porMirarVisibles,
    lineasUltimosCambios: lineasUltimosCambios, hoyIso: hoyIso, fechaHoyLarga: fechaHoyLarga, haceCuanto: haceCuanto, diasEntre: diasEntre, plural: plural, fechaCorta: fechaCorta, fechaCortaAbrev: fechaCortaAbrev,
    nombreGrado: nombreGrado };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.HoyBase = api;
})(typeof window !== 'undefined' ? window : globalThis);
