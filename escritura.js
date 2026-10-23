/* Escribir desde la web nueva (instrucción 139, docs/WEB-NUEVA-4-ESCRIBIR.md): la página no puede llamar a nadie (`connect-src 'none'`), así que lo que se escribe se deja como una PETICIÓN, un fichero nuevo en la
   subcarpeta `peticiones` de la carpeta privada (`_peticion-<id>.json` = { formato, id, funcion, args, creada }). El disparador de la aplicación (EscrituraWeb.gs) la aplica con la misma función de hoy y deja
   `respuestas/_respuesta-<id>.json` (estado 'hecha' o 'fallida', con el resultado o el error). Esta pieza deja la petición, comprueba que quedó bien escrita (y repite si no), espera la respuesta y, al abrir una
   página, lista lo escrito hace poco para que la pantalla lo recuerde hasta que la aplicación rehaga sus ficheros. Las subcarpetas las crea la aplicación, nunca esta página (para no duplicarlas): si no están,
   `preparar()` dice que no y la página sigue como solo lectura, con los enlaces «Cambiar en la app de hoy». Nada de lo escrito se guarda en el navegador. */
(function (raiz) {
  'use strict';
  var FORMATO = 1, PREF_PET = '_peticion-', PREF_RES = '_respuesta-';

  /* Un número que ordena por la hora en que se pulsó: AAAAMMDDHHMMSSmmm-xxxxxx (el servidor lo comprueba con /^[0-9a-z-]{8,64}$/). */
  function idNuevo(ahora) {
    var t = new Date(ahora == null ? Date.now() : ahora).toISOString().replace(/[-:T.Z]/g, '').slice(0, 17), r = '';
    while (r.length < 6) r += Math.floor(Math.random() * 36).toString(36);
    return t + '-' + r;
  }
  /* El comienzo de un número que corresponde a una hora (para quedarse solo con lo escrito desde entonces). */
  function prefijoDe(iso, margenMs) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - (margenMs || 0)).toISOString().replace(/[-:T.Z]/g, '').slice(0, 17);
  }

  function crear(C, ajustes) {
    ajustes = ajustes || {};
    var CADA_MS = ajustes.cadaMs || 3000, LENTO_MS = ajustes.lentoMs || 120000, REPETIR = ajustes.repetir || 3;
    var PET = null, RES = null;

    async function preparar() {
      PET = await C.subcarpeta('peticiones');
      RES = await C.subcarpeta('respuestas');
      return !!(PET && RES);
    }

    /* El documento de una petición nueva (todavía no escrito): así la pantalla ya conoce su número y puede cambiar al momento. */
    function nueva(funcion, args) { return { formato: FORMATO, id: idNuevo(), funcion: funcion, args: args, creada: new Date().toISOString() }; }

    /* Deja la petición y comprueba que quedó escrita tal cual; hasta REPETIR intentos. Devuelve el documento o lanza el error. */
    async function dejar(doc) {
      var nombre = PREF_PET + doc.id + '.json', texto = JSON.stringify(doc), ultimo = null;
      for (var i = 0; i < REPETIR; i++) {
        try {
          await C.escribirJsonEn(PET, nombre, doc);
          var vuelta;
          try { vuelta = await C.leerJsonEn(PET, nombre); } catch (e) { vuelta = null; }
          /* Si ya no está (la aplicación fue más rápida que la comprobación) y su respuesta existe, quedó bien. */
          if (vuelta === null) { var r = await leerRespuesta(doc.id); if (r) return doc; continue; }
          if (JSON.stringify(vuelta) === texto) return doc;
        } catch (e) { ultimo = e; }
      }
      throw new Error('No he podido dejar la petición en la carpeta' + (ultimo && ultimo.message ? ' (' + ultimo.message + ')' : '') + '.');
    }

    async function leerRespuesta(id) {
      try { return await C.leerJsonEn(RES, PREF_RES + id + '.json'); } catch (e) { return null; }
    }

    /* Espera la respuesta definitiva. `alLento` se llama una vez si tarda más de LENTO_MS. Devuelve la respuesta. */
    function esperar(id, alLento) {
      return new Promise(function (listo) {
        var t0 = Date.now(), avisado = false;
        function vuelta() {
          leerRespuesta(id).then(function (r) {
            if (r && r.estado && r.estado !== 'aplicando') { listo(r); return; }
            if (!avisado && Date.now() - t0 > LENTO_MS) { avisado = true; if (alLento) alLento(); }
            setTimeout(vuelta, CADA_MS);
          });
        }
        vuelta();
      });
    }

    /* Lo escrito desde `desdeIso` (menos un margen de relojes): peticiones sin respuesta ('pendiente') y respuestas ('hecha', 'fallida'). Ordenado por número. */
    async function recientes(desdeIso, margenMs) {
      var corte = desdeIso ? prefijoDe(desdeIso, margenMs == null ? 2 * 3600000 : margenMs) : '';
      var porId = {};
      var listaPet = [], listaRes = [];
      try { listaPet = await C.nombresEn(PET); } catch (e) { listaPet = []; }
      try { listaRes = await C.nombresEn(RES); } catch (e) { listaRes = []; }
      function idDe(n, pref) { return n.indexOf(pref) === 0 && /\.json$/.test(n) ? n.slice(pref.length, -5) : ''; }
      var leer = [];
      listaPet.forEach(function (n) {
        var id = idDe(n, PREF_PET);
        if (id && id >= corte) leer.push(C.leerJsonEn(PET, n).then(function (d) { if (d && d.id) porId[d.id] = { id: d.id, funcion: d.funcion, args: d.args, creada: d.creada, estado: 'pendiente', resultado: null, aplicada: '', error: '' }; }, function () { /* a medias: la próxima vez */ }));
      });
      listaRes.forEach(function (n) {
        var id = idDe(n, PREF_RES);
        if (id && id >= corte) leer.push(C.leerJsonEn(RES, n).then(function (d) {
          if (!d || !d.id) return;
          var estado = d.estado === 'hecha' ? 'hecha' : (d.estado === 'fallida' ? 'fallida' : 'pendiente');
          porId[d.id] = { id: d.id, funcion: d.funcion, args: d.args, creada: d.creada, estado: estado, resultado: d.resultado == null ? null : d.resultado, aplicada: d.aplicada || '', error: d.error || '' };
        }, function () { /* a medias: la próxima vez */ }));
      });
      await Promise.all(leer);
      return Object.keys(porId).sort().map(function (k) { return porId[k]; });
    }

    /* El control de una página: lleva la lista de lo pedido (`entradas`), lo pone al momento (alCambiar), dice cómo va (alEstado(texto, esError)) y mide desde que se pulsa hasta «Guardado» (alMedir(ms)).
       cargar(desdeIso) recoge lo escrito desde la hora de los datos de la página y sigue esperando lo que aún no se ha aplicado. */
    function controlador(op) {
      var entradas = [], ultimo = '', ultimoError = false;
      function estado() {
        if (entradas.some(function (e) { return e.estado === 'pendiente'; })) { op.alEstado(entradas.some(function (e) { return e.estado === 'pendiente' && e.lenta; }) ? 'Sigue pendiente: la aplicación lo guardará en cuanto pueda (suele tardar menos de dos minutos).' : 'Guardando…', false); return; }
        op.alEstado(ultimo, ultimoError);
      }
      function acabar(e, r, t0) {
        e.estado = r.estado === 'hecha' ? 'hecha' : 'fallida';
        e.resultado = r.resultado == null ? null : r.resultado; e.aplicada = r.aplicada || ''; e.error = r.error || ''; e.lenta = false;
        if (e.estado === 'hecha') { ultimo = 'Guardado'; ultimoError = false; if (t0 != null && op.alMedir) op.alMedir(performance.now() - t0); }
        else { ultimo = 'No se ha podido guardar: ' + (e.error || 'error desconocido') + ' Lo que enseñaba la pantalla vuelve a como estaba.'; ultimoError = true; }
        estado(); op.alCambiar();
      }
      function seguir(e, t0) {
        return esperar(e.id, function () { e.lenta = true; estado(); }).then(function (r) { acabar(e, r, t0); });
      }
      async function pedir(funcion, args) {
        var t0 = performance.now(), doc = nueva(funcion, args);
        var e = { id: doc.id, funcion: funcion, args: args, creada: doc.creada, estado: 'pendiente', resultado: null, aplicada: '', error: '', lenta: false };
        entradas.push(e);
        estado(); op.alCambiar();
        try { await dejar(doc); } catch (err) { acabar(e, { estado: 'fallida', error: (err && err.message) || 'No se pudo escribir.' }, null); return e; }
        await seguir(e, t0);
        return e;
      }
      async function cargar(desdeIso) {
        var vistas = await recientes(desdeIso);
        var propias = entradas.slice();
        entradas = vistas.filter(function (v) { return !propias.some(function (p) { return p.id === v.id; }); }).concat(propias);
        entradas.forEach(function (e) { if (e.estado === 'pendiente' && !e.siguiendo) { e.siguiendo = true; seguir(e, null); } });
        estado(); op.alCambiar();
      }
      return { entradas: function () { return entradas; }, pedir: pedir, cargar: cargar };
    }

    return { preparar: preparar, nueva: nueva, dejar: dejar, esperar: esperar, recientes: recientes, controlador: controlador };
  }

  var api = { crear: crear, idNuevo: idNuevo, prefijoDe: prefijoDe, FORMATO: FORMATO };
  if (typeof window !== 'undefined' && window.CarpetaWeb) {
    var vivo = crear(window.CarpetaWeb);
    Object.keys(vivo).forEach(function (k) { api[k] = vivo[k]; });
  }
  raiz.EscrituraWeb = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
