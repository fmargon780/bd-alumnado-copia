/* La carpeta privada «BD ALUMNADO - WEB NUEVA (privada)» de Drive, elegida en el navegador (instrucción 135). Aquí solo se leen los ficheros del buscador; lo único que se escribe son las medidas de tiempo (medidas.js).
   La carpeta elegida se recuerda en el navegador (IndexedDB); si algo de eso falla, se pide cada vez. */
(function () {
  'use strict';
  var INDICE = '_buscador-indice.json';
  var RAIZ = null;

  function bd() {
    return new Promise(function (ok, mal) {
      var q = indexedDB.open('bd-web-pagina', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('carpeta'); };
      q.onsuccess = function () { ok(q.result); };
      q.onerror = function () { mal(q.error); };
    });
  }
  function guardada(valor) {
    return bd().then(function (db) {
      return new Promise(function (ok, mal) {
        var t = db.transaction('carpeta', valor ? 'readwrite' : 'readonly'), s = t.objectStore('carpeta');
        var q = valor ? s.put(valor, 'raiz') : s.get('raiz');
        q.onsuccess = function () { ok(q.result); };
        q.onerror = function () { mal(q.error); };
      });
    });
  }

  /* ¿Es la carpeta buena? Tiene el índice del buscador. */
  async function abrir(handle) {
    try { await handle.getFileHandle(INDICE); } catch (e) { return false; }
    RAIZ = handle;
    return true;
  }
  async function leerJson(nombre) {
    var f = await (await RAIZ.getFileHandle(nombre)).getFile();
    return JSON.parse(new TextDecoder('utf-8').decode(await f.arrayBuffer()));
  }
  async function escribirJson(nombre, objeto) {
    var w = await (await RAIZ.getFileHandle(nombre, { create: true })).createWritable();
    await w.write(new Blob([JSON.stringify(objeto)]));
    await w.close();
  }

  window.CarpetaWeb = { INDICE: INDICE, abrir: abrir, leerJson: leerJson, escribirJson: escribirJson, guardada: guardada, hayCarpeta: function () { return !!RAIZ; } };
})();
