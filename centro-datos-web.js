/* La carpeta «CENTRO DE DATOS» vista desde el navegador (instrucción 171, tramo 1): se elige una vez, se recuerda (IndexedDB, solo la carpeta: ningún dato de alumnos), se lee su `indice.json` y
   se dan los ficheros de Séneca tal cual los guarda el Centro de datos, por su `ruta` (o, si no la trae, por su nombre en la raíz). Solo lee: aquí nunca se escribe nada.
   La hora de los datos («Datos de las HH:MM») es el `subido` más reciente de los ficheros de Séneca del índice. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var INDICE = 'indice.json';
  var CLAVE_GUARDADA = 'centro-datos';
  var RAIZ = null;

  function bd() {
    return new Promise(function (ok, mal) {
      var q = indexedDB.open('bd-web-pagina', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('carpeta'); };
      q.onsuccess = function () { ok(q.result); };
      q.onerror = function () { mal(q.error); };
    });
  }
  /* La carpeta recordada (sin argumento) o guardar una (con argumento). Va con otra clave que la de la carpeta privada de la web. */
  function guardada(valor) {
    return bd().then(function (db) {
      return new Promise(function (ok, mal) {
        var t = db.transaction('carpeta', valor ? 'readwrite' : 'readonly'), s = t.objectStore('carpeta');
        var q = valor ? s.put(valor, CLAVE_GUARDADA) : s.get(CLAVE_GUARDADA);
        q.onsuccess = function () { ok(q.result); };
        q.onerror = function () { mal(q.error); };
      });
    });
  }

  function decodificar(buffer) {
    var texto = new TextDecoder('utf-8').decode(buffer);
    return texto.indexOf('�') === -1 ? texto : new TextDecoder('iso-8859-1').decode(buffer);
  }
  async function bytesDe(dir, nombre) {
    return (await (await dir.getFileHandle(nombre)).getFile()).arrayBuffer();
  }

  /* ¿Es la carpeta buena? Tiene un `indice.json` con `contrato`. Si lo es, queda como la carpeta de trabajo. */
  async function abrir(handle) {
    try {
      var ind = JSON.parse(decodificar(await bytesDe(handle, INDICE)));
      if (!ind || typeof ind !== 'object' || ind.contrato === undefined || ind.contrato === null) return false;
    } catch (e) { return false; }
    RAIZ = handle;
    return true;
  }
  async function leerIndice() {
    if (!RAIZ) throw new Error('Falta elegir la carpeta CENTRO DE DATOS.');
    return JSON.parse(decodificar(await bytesDe(RAIZ, INDICE)));
  }

  /* Las entradas del índice que son un fichero de Séneca para esta web: los listados (no los de «por alumno», que se piden uno a uno) con fichero. */
  function ficherosDeSeneca(indice) {
    return ((indice && indice.listados) || []).filter(function (e) { return e && e.fichero && !e.porAlumno; });
  }
  /* Un `subido` es una fecha ISO (o milisegundos). Devuelve milisegundos, o 0 si no se entiende. */
  function ms(v) {
    if (typeof v === 'number') return v;
    var t = Date.parse(String(v || ''));
    return isNaN(t) ? 0 : t;
  }
  /* El `subido` más reciente de los ficheros de Séneca del índice, como ISO; '' si no hay ninguno. Con `entradas` (las que usa la cuenta) mira solo esas. */
  function horaDeLosDatos(indice, entradas) {
    var lista = entradas || ficherosDeSeneca(indice), mejor = 0;
    for (var i = 0; i < lista.length; i++) { var t = ms(lista[i].subido); if (t > mejor) mejor = t; }
    return mejor ? new Date(mejor).toISOString() : '';
  }
  /* La entrada de una clave y variante (`matricula`, `26-27/eso1`); sin variante, la primera de esa clave. */
  function entrada(indice, clave, variante) {
    var l = ficherosDeSeneca(indice).filter(function (e) { return String(e.clave || '') === clave && (variante === undefined || String(e.variante || '') === variante); });
    return l[0] || null;
  }

  /* La carpeta que contiene el fichero de una entrada y su nombre: por `ruta` (carpetas separadas por «/»), o en la raíz por `fichero`. */
  async function localizar(e) {
    var ruta = String(e.ruta || '').split('/').filter(function (x) { return x; });
    if (!ruta.length) ruta = [String(e.fichero)];
    var dir = RAIZ;
    for (var i = 0; i < ruta.length - 1; i++) dir = await dir.getDirectoryHandle(ruta[i]);
    return { dir: dir, nombre: ruta[ruta.length - 1] };
  }
  async function leerBytes(e) {
    if (!RAIZ) throw new Error('Falta elegir la carpeta CENTRO DE DATOS.');
    var l = await localizar(e);
    return bytesDe(l.dir, l.nombre);
  }
  async function leerTexto(e) { return decodificar(await leerBytes(e)); }

  /* Hasta cuándo manda lo que hay: `ocupado` (el Centro de datos está recolocando ficheros) o un contrato más nuevo que el que esta web entiende. */
  var CONTRATO_MAXIMO = 2;
  function estado(indice) {
    if (!indice) return { ok: false, motivo: 'No he podido leer el índice del Centro de datos.' };
    if (Number(indice.contrato) > CONTRATO_MAXIMO) return { ok: false, motivo: 'El Centro de datos es más nuevo que esta web.' };
    if (indice.ocupado === true) return { ok: false, motivo: 'El Centro de datos está recolocando sus ficheros.' };
    return { ok: true, motivo: '' };
  }

  G.CentroDatosWeb = { INDICE: INDICE, CONTRATO_MAXIMO: CONTRATO_MAXIMO, guardada: guardada, abrir: abrir, leerIndice: leerIndice, ficherosDeSeneca: ficherosDeSeneca, horaDeLosDatos: horaDeLosDatos,
    entrada: entrada, leerBytes: leerBytes, leerTexto: leerTexto, estado: estado, hayCarpeta: function () { return !!RAIZ; }, decodificar: decodificar };
})();
