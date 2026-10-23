/* Escribir en la ficha de la web nueva (instrucción 139, parte 1): las notas, las correcciones de «Trayectoria» y «NEAE» y las marcas de Jefatura, con los mismos botones, textos y comprobaciones que la ficha de hoy
   (JsFichaNotas.html, JsFichaCorregir.html, JsBuscadorFicha.html). Nada se guarda aquí: cada acción llama a `E.pedir(funcion, args)`, que deja una petición en la carpeta privada (escritura.js) para que la aplicación la
   aplique con la misma función de hoy (`webNotaAnadir`, `webNotaCorregir`, `webNotaBorrar`, `webCorreccionGuardar`, `mesaGuardarMarca`).
   La pantalla cambia al momento: `superponer` pone sobre la ficha de los ficheros lo que ya se ha pedido (lo pendiente, tal como lo pinta hoy la ficha antes de oír al servidor, y lo hecho, con lo que contestó el
   servidor). Cada efecto es idempotente: si el fichero de la ficha ya lo trae, no se duplica. Lo fallido no se pinta.
   E = { miCorreo, curso, claveNotas, ui: { corregir, editarNota, borrador }, pedir(funcion, args), redibujar() }. */
(function (raiz) {
  'use strict';
  var B = raiz.FichaBase;
  var CON_MOTIVO = ['repPrimaria', 'repetia', 'pil'];
  var MARCAS = { conflictivo: 'Conflictivo', bilingue: 'Pide bilingüe', exentoFrances: 'Exento de francés' };

  function clonar(x) { return JSON.parse(JSON.stringify(x)); }
  /* La clave de las notas y correcciones de un alumno: el Nº de Id. Escolar tal cual, o «nom:…» (claveNotasDeClaveMesa_ en JefaturaNotas.gs). */
  function claveNotasDe(clave) { return String(clave).indexOf('id:') === 0 ? String(clave).substring(3) : String(clave); }

  /* ¿Se enseña todavía esta petición? Lo fallido no; lo hecho solo si se aplicó después de la hora de los datos de la ficha. */
  function vigente(e, hora) {
    if (e.estado === 'fallida') return false;
    if (e.estado === 'hecha' && e.aplicada && hora && String(e.aplicada) <= String(hora)) return false;
    return true;
  }

  /* La ficha `base` con lo pedido por encima. info = { clave, claveNotas, miCorreo, hora }. Devuelve una copia. */
  function superponer(base, entradas, info) {
    var a = clonar(base);
    (entradas || []).slice().sort(function (x, y) { return x.id < y.id ? -1 : 1; }).forEach(function (e) {
      if (!vigente(e, info.hora)) return;
      var ar = e.args || [], r = e.resultado, hecha = e.estado === 'hecha';
      if (e.funcion === 'webNotaAnadir') {
        if (ar[0] !== info.claveNotas) return;
        a.notas = a.notas || [];
        if (hecha && r && r.id) { if (!a.notas.some(function (n) { return n.id === r.id; })) a.notas.unshift(r); }
        else if (!hecha) a.notas.unshift({ id: 'p-' + e.id, texto: String(ar[1] == null ? '' : ar[1]).trim(), autor: info.miCorreo, fecha: e.creada, pendiente: true });
      } else if (e.funcion === 'webNotaCorregir') {
        a.notas = (a.notas || []).map(function (n) {
          if (n.id !== ar[0]) return n;
          return hecha && r && r.id ? r : Object.assign({}, n, { texto: String(ar[1] == null ? '' : ar[1]).trim(), pendiente: true });
        });
      } else if (e.funcion === 'webNotaBorrar') {
        a.notas = (a.notas || []).filter(function (n) { return n.id !== ar[0]; });
      } else if (e.funcion === 'webCorreccionGuardar') {
        if (ar[1] !== info.claveNotas) return;
        var cambios = ar[4] || {}, motivo = String(ar[5] || '');
        a.trayectoria = Object.assign({}, a.trayectoria);
        if (hecha && r) {
          if (r.correcciones && Object.keys(r.correcciones).length) a.correcciones = r.correcciones; else delete a.correcciones;
          a.trayectoria.motivoCorreccion = r.motivoCorreccion || '';
        } else {
          var mapa = Object.assign({}, a.correcciones || {});
          Object.keys(cambios).forEach(function (d) {
            if (cambios[d] === '') { delete mapa[d]; return; }
            mapa[d] = { valor: d === 'repPrimaria' ? Number(cambios[d]) : cambios[d], motivo: CON_MOTIVO.indexOf(d) !== -1 ? motivo : '', quien: info.miCorreo, cuando: e.creada };
          });
          /* Un solo motivo por alumno: también para las correcciones de trayectoria que ya había y no se tocan. */
          if (motivo) CON_MOTIVO.forEach(function (d) { if (mapa[d] && !(d in cambios)) mapa[d] = Object.assign({}, mapa[d], { motivo: motivo }); });
          if (Object.keys(mapa).length) a.correcciones = mapa; else delete a.correcciones;
          a.trayectoria.motivoCorreccion = motivo || (mapa.repPrimaria || mapa.repetia || mapa.pil ? (base.trayectoria || {}).motivoCorreccion : '');
        }
        a.correccionesPendientes = true;
        if ('pil' in cambios && cambios.pil !== '') a.trayectoria.pil = cambios.pil;
        a.neae = Object.assign({}, a.neae);
        if (!a.neae.censo) {
          if ('neae' in cambios) a.neae.neae = cambios.neae;
          if ('medidas' in cambios) a.neae.medidas = cambios.medidas;
        }
      } else if (e.funcion === 'mesaGuardarMarca') {
        if (ar[0] !== info.clave) return;
        a.marcas = Object.assign({}, a.marcas);
        a.marcas[ar[1]] = !!ar[2];
      }
    });
    return a;
  }

  /* ¿Hay algo de este alumno que sigue sin guardarse? (para la línea «Guardando…») */
  function hayPendientes(entradas) { return (entradas || []).some(function (e) { return e.estado === 'pendiente'; }); }

  /* ---------- Dibujo ---------- */
  function h(etiqueta, clase, hijos) { return B.h(etiqueta, clase, hijos); }
  function boton(texto, clase, alPulsar) {
    var b = h('button', clase, texto);
    b.type = 'button';
    b.addEventListener('click', alPulsar);
    return b;
  }
  function caja(tipo, id, valor, atributos) {
    var e = document.createElement(tipo);
    e.id = id;
    if (valor != null && tipo !== 'select') e.value = valor;
    Object.keys(atributos || {}).forEach(function (k) { e.setAttribute(k, atributos[k]); });
    return e;
  }
  function fila(etiqueta, id, control, nota) {
    var l = h('label', '', etiqueta);
    l.setAttribute('for', id);
    return h('div', 'corr-fila', [l, nota ? h('span', 'campo', nota) : null, control]);
  }
  function opciones(valor) {
    var s = document.createElement('select');
    ['', 'SÍ', 'NO'].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o; op.textContent = o || '(sin corregir)';
      if (String(valor) === o) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function corr(a, dato) { return (a.correcciones && a.correcciones[dato]) || null; }
  function valorTexto(v) { return v === '' || v == null ? '' : String(v); }

  function nombreDe(ctx, correo) {
    var t = String(correo || '').trim();
    if (t.indexOf('@') === -1) return t;
    var c = t.toLowerCase();
    return (ctx.nombres && ctx.nombres[c]) || c.split('@')[0];
  }

  /* Observaciones: las notas de siempre, con «Corregir» y «Borrar» en las que escribió quien mira, y el cuadro para añadir otra. */
  function observaciones(a, ctx, cerrado) {
    var E = ctx.escribir;
    var lista = (a.notas || []).map(function (n) {
      var llamada = n.tipo === 'llamada', excel = n.tipo === 'excel';
      var texto = llamada ? 'Llamada' + (n.via ? ' · ' + n.via : '') + (n.resultado ? ' · ' + n.resultado : '') + (n.texto ? ' · ' + n.texto : '') : n.texto;
      var meta = nombreDe(ctx, n.autor) + ' · ' + B.fecha(n.fecha) + (n.corregidaFecha ? ' · corregida el ' + B.fecha(n.corregidaFecha) : '') + (n.pendiente ? ' · guardando…' : '');
      var mia = !cerrado && !n.pendiente && n.autor === E.miCorreo && !excel;
      var editando = mia && !llamada && E.ui.editarNota === n.id;
      if (editando) {
        var area = caja('textarea', 'edit_' + n.id, texto, { rows: '2' });
        return h('div', 'nota', [area, h('div', 'fila-botones', [
          boton('Guardar', 'principal pequeno', function () {
            var t = area.value.trim();
            if (!t) return;
            E.ui.editarNota = '';
            E.pedir('webNotaCorregir', [n.id, t]);
          }),
          boton('Cancelar', 'pequeno', function () { E.ui.editarNota = ''; E.redibujar(); })])]);
      }
      var acciones = mia ? h('div', 'nota-acciones fila-botones', [
        llamada ? null : boton('Corregir', 'pequeno', function () { E.ui.editarNota = n.id; E.redibujar(); }),
        boton('Borrar', 'pequeno peligro', function () {
          if (!window.confirm('¿Borrar esta nota?')) return;
          E.pedir('webNotaBorrar', [n.id]);
        })]) : null;
      return h('div', 'nota' + (n.pendiente ? ' nota-pendiente' : ''), [h('div', 'texto', texto), h('div', 'meta', meta), acciones]);
    });
    var nueva = null;
    if (!cerrado) {
      var area2 = caja('textarea', 'textoNuevaNota', E.ui.borrador || '', { rows: '2', placeholder: 'Añadir una nota…' });
      area2.addEventListener('input', function () { E.ui.borrador = area2.value; });
      nueva = h('div', 'nota-nueva', [area2, h('div', 'fila-botones', [boton('Añadir nota', 'principal pequeno', function () {
        var t = area2.value.trim();
        if (!t) return;
        E.ui.borrador = '';
        E.pedir('webNotaAnadir', [E.claveNotas, t]);
      })])]);
    }
    return B.recuadro('Observaciones', (lista.length ? lista : [B.p('Sin notas todavía.', 'campo')]).concat([nueva]), 'ficha-ancha-total');
  }

  /* Trayectoria: el botón «Corregir» o el formulario. */
  function trayectoriaCorregir(a, ctx) {
    var E = ctx.escribir, t = a.trayectoria || {};
    if (E.ui.corregir !== 'trayectoria') return h('div', 'fila-botones', [boton('Corregir', 'pequeno', function () { E.ui.corregir = 'trayectoria'; E.redibujar(); })]);
    var x = corr(a, 'repPrimaria'), y = corr(a, 'repetia'), z = corr(a, 'pil');
    var rep = caja('input', 'corrRepPrimaria', x ? valorTexto(x.valor) : '', { type: 'number', min: '0', max: '9', step: '1', placeholder: 'sin corregir' });
    var repetia = opciones(y ? y.valor : ''); repetia.id = 'corrRepetia';
    var pil = opciones(z ? z.valor : ''); pil.id = 'corrPil';
    var motivo = caja('input', 'corrMotivo', (x && x.motivo) || (y && y.motivo) || (z && z.motivo) || '', { type: 'text', maxlength: '300', placeholder: 'Por qué se corrige' });
    var vacio = function (v) { return v === '' || v == null ? '?' : v; };
    var botones = [
      boton('Guardar', 'principal pequeno', function () {
        var m = motivo.value.trim(), cambios = { repPrimaria: rep.value.trim(), repetia: repetia.value, pil: pil.value };
        if ((cambios.repPrimaria !== '' || cambios.repetia !== '' || cambios.pil !== '') && !m) {
          E.aviso('Escribe el motivo de la corrección.', true);
          motivo.focus();
          return;
        }
        E.ui.corregir = '';
        E.pedirCorreccion(a, cambios, m);
      }),
      boton('Cancelar', 'pequeno', function () { E.ui.corregir = ''; E.redibujar(); })];
    if (x || y || z) botones.push(boton('Quitar la corrección', 'pequeno peligro', function () {
      if (!window.confirm('¿Quitar la corrección? El dato volverá a ser el que dice Séneca.')) return;
      E.ui.corregir = '';
      E.pedirCorreccion(a, { repPrimaria: '', repetia: '', pil: '' }, '');
    }));
    return h('div', 'corr-form', [
      fila('Repeticiones en Primaria', 'corrRepPrimaria', rep, 'Séneca: ' + vacio(t.senecaRepPrimaria)),
      fila('Repetía el año pasado', 'corrRepetia', repetia, 'Séneca: ' + vacio(t.senecaRepetia)),
      fila('PIL', 'corrPil', pil, 'Calculado: ' + (t.pilCalculado === '' || t.pilCalculado == null ? '—' : t.pilCalculado)),
      fila('Motivo (obligatorio)', 'corrMotivo', motivo),
      h('div', 'fila-botones', botones)]);
  }

  /* NEAE: el botón «Corregir» o el formulario (con el censo de Séneca manda el censo). */
  function neaeCorregir(a, ctx) {
    var E = ctx.escribir, n = a.neae || {};
    if (E.ui.corregir !== 'neae') return h('div', 'fila-botones', [boton('Corregir', 'pequeno', function () { E.ui.corregir = 'neae'; E.redibujar(); })]);
    var x = corr(a, 'neae'), y = corr(a, 'medidas'), bloqueado = !!n.censo;
    var campoN = caja('input', 'corrNeae', bloqueado ? n.neae : (x ? valorTexto(x.valor) : ''), { type: 'text', maxlength: '300' });
    var campoM = caja('input', 'corrMedidas', bloqueado ? n.medidas : (y ? valorTexto(y.valor) : ''), { type: 'text', maxlength: '300' });
    if (bloqueado) { campoN.disabled = true; campoM.disabled = true; }
    var guardar = boton('Guardar', 'principal pequeno', function () {
      E.ui.corregir = '';
      E.pedirCorreccion(a, { neae: campoN.value.trim(), medidas: campoM.value.trim() }, '');
    });
    if (bloqueado) guardar.disabled = true;
    var botones = [guardar, boton('Cancelar', 'pequeno', function () { E.ui.corregir = ''; E.redibujar(); })];
    if ((x || y) && !bloqueado) botones.push(boton('Quitar la corrección', 'pequeno peligro', function () {
      if (!window.confirm('¿Quitar la corrección? El dato volverá a ser el que dice Séneca.')) return;
      E.ui.corregir = '';
      E.pedirCorreccion(a, { neae: '', medidas: '' }, '');
    }));
    return h('div', 'corr-form', [
      bloqueado ? h('div', 'corr-nota', 'El censo de Séneca trae el dato de este alumno: manda el censo y no se puede escribir.') : null,
      fila('NEAE', 'corrNeae', campoN), fila('Medidas y recursos', 'corrMedidas', campoM), h('div', 'fila-botones', botones)]);
  }

  /* Marcas de Jefatura: las tres casillas, que ahora se pueden cambiar. */
  function marcas(a, ctx) {
    var E = ctx.escribir, m = a.marcas || {};
    return B.recuadro('Marcas de Jefatura', ['conflictivo', 'bilingue', 'exentoFrances'].map(function (c) {
      var i = h('input'); i.type = 'checkbox'; i.checked = !!m[c];
      i.addEventListener('change', function () { E.pedir('mesaGuardarMarca', [ctx.clave, c, i.checked]); });
      return h('label', 'marca-check', [i, MARCAS[c]]);
    }));
  }

  /* Informes (instrucción 140): la hoja de «enterado» y la de seguimiento de ESTE alumno. «Preparar» deja una petición a la aplicación (`webInformeAlumnoPdf`: el PDF viene en la respuesta, no se guarda en ninguna parte
     de Drive más de una hora) y, en cuanto está hecho, se descarga; si el navegador lo impide, queda el enlace «Abrir la hoja». El estado se recuerda aunque la ficha se redibuje. */
  var INFORME = { ocupado: '', texto: '', error: false, url: '', nombre: '' };
  function bytesDe(base64) {
    var bin = atob(base64), bytes = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return bytes;
  }
  function prepararInforme(a, E, informe) {
    INFORME = { ocupado: informe.clave, texto: '', error: false, url: '', nombre: '' };
    E.redibujar();
    E.pedir('webInformeAlumnoPdf', [informe.clave, E.curso, a.nombre, a.unidad]).then(function (e) {
      var r = e.resultado;
      if (e.estado !== 'hecha') INFORME = { ocupado: '', texto: 'No se ha podido preparar la hoja. ' + (e.error || ''), error: true, url: '', nombre: '' };
      else if (!r || !r.ok) INFORME = { ocupado: '', texto: (r && r.motivo) || 'No se ha podido preparar la hoja.', error: true, url: '', nombre: '' };
      else {
        var url = URL.createObjectURL(new Blob([bytesDe(r.base64)], { type: 'application/pdf' }));
        INFORME = { ocupado: '', texto: 'Hoja preparada: ' + r.nombre, error: false, url: url, nombre: r.nombre };
        var enlace = document.createElement('a');
        enlace.href = url; enlace.download = r.nombre;
        document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
      }
      E.redibujar();
    });
  }
  function informes(a, ctx) {
    var E = ctx.escribir, lista = a.informes || [];
    var filas = lista.map(function (i) {
      var b = boton(INFORME.ocupado === i.clave ? 'Preparando…' : 'Preparar', 'informe-boton', function () { prepararInforme(a, E, i); });
      b.disabled = !!INFORME.ocupado;
      return h('div', 'informe-linea', [h('span', '', i.nombre), ' ', b]);
    });
    var enlace = null;
    if (INFORME.url) { enlace = h('a', '', 'Abrir la hoja'); enlace.href = INFORME.url; enlace.download = INFORME.nombre; enlace.target = '_blank'; enlace.rel = 'noopener'; }
    var estado = h('div', 'informe-estado', [
      INFORME.ocupado ? B.p('Preparando la hoja… la aplicación la hace en cuanto puede (suele tardar menos de dos minutos).', 'campo') : null,
      !INFORME.ocupado && INFORME.texto ? B.p(INFORME.texto, INFORME.error ? 'informe-error' : 'campo') : null,
      enlace ? B.p([enlace]) : null]);
    return B.recuadro('Informes', (filas.length ? filas : [B.p('No hay informes para este alumno.', 'campo')]).concat([estado]));
  }

  raiz.FichaEscribir = { superponer: superponer, hayPendientes: hayPendientes, claveNotasDe: claveNotasDe, observaciones: observaciones, trayectoriaCorregir: trayectoriaCorregir, neaeCorregir: neaeCorregir, marcas: marcas, informes: informes };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.FichaEscribir;
})(typeof window !== 'undefined' ? window : globalThis);
