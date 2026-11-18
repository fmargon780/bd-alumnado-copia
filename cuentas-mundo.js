/* El «Apps Script» de mentira del navegador (instrucción 171, tramo 2): cuadernos, carpetas de Drive, propiedades y caché en memoria, para que el programa de las cuentas (cuentas-programa.js, salido de los .gs) corra en la página
   sin cambiar ninguna regla. Nada de lo que hay aquí sale de la página ni se guarda en el ordenador: vive mientras la página está abierta. Los ficheros de Séneca los pone quien llama (la carpeta CENTRO DE DATOS, centro-datos-web.js).
   Ficheros: { nombre, bytes (Uint8Array), fecha (ms) }; carpetas: { 'Nombre de la carpeta': [ficheros] }. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;

  /* Una orden que no hace nada y deja seguir encadenando (setFontWeight, setBackground…). */
  function nada() { var n = new Proxy(function () {}, { get: function (t, p) { return typeof p === 'symbol' ? undefined : n; }, apply: function () { return n; } }); return n; }

  function Hoja(nombre, libro) { this.nombre = nombre; this.libro = libro; this.filas = []; this.columnas = 26; }
  Hoja.prototype.getName = function () { return this.nombre; };
  Hoja.prototype.getParent = function () { return this.libro; };
  Hoja.prototype.getLastRow = function () {
    for (var i = this.filas.length - 1; i >= 0; i--) if ((this.filas[i] || []).some(function (v) { return v !== '' && v !== undefined; })) return i + 1;
    return 0;
  };
  Hoja.prototype.getLastColumn = function () { var m = 0; this.filas.forEach(function (f) { if (f && f.length > m) m = f.length; }); return m; };
  Hoja.prototype.getMaxColumns = function () { return this.columnas; };
  Hoja.prototype.getMaxRows = function () { return Math.max(1000, this.filas.length); };
  Hoja.prototype.insertColumnsAfter = function (_, n) { this.columnas += n; };
  Hoja.prototype.insertRowsAfter = function () {};
  Hoja.prototype.getRange = function (f, c, nf, nc) {
    var h = this; nf = nf === undefined ? 1 : nf; nc = nc === undefined ? 1 : nc;
    var r = {
      getValues: function () { var s = []; for (var i = 0; i < nf; i++) { var fila = h.filas[f - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) o.push(fila[c - 1 + j] === undefined ? '' : fila[c - 1 + j]); s.push(o); } return s; },
      getValue: function () { var v = h.filas[f - 1] && h.filas[f - 1][c - 1]; return v === undefined ? '' : v; },
      setValues: function (v) { for (var i = 0; i < v.length; i++) { var fi = f - 1 + i; h.filas[fi] = h.filas[fi] || []; for (var j = 0; j < v[i].length; j++) h.filas[fi][c - 1 + j] = v[i][j]; } return p; },
      setValue: function (v) { h.filas[f - 1] = h.filas[f - 1] || []; h.filas[f - 1][c - 1] = v; return p; },
      clearContent: function () { for (var i = 0; i < nf; i++) if (h.filas[f - 1 + i]) for (var j = 0; j < nc; j++) h.filas[f - 1 + i][c - 1 + j] = ''; return p; },
      setNumberFormat: function () { return p; }, setNote: function () { return p; }
    };
    var p = new Proxy(r, { get: function (t, k) { return k in t ? t[k] : function () { return p; }; } });
    return p;
  };
  Hoja.prototype.getDataRange = function () { var h = this; return { getValues: function () { return h.filas.map(function (f) { var o = []; for (var i = 0; i < h.getLastColumn(); i++) o.push(f && f[i] !== undefined ? f[i] : ''); return o; }); } }; };
  Hoja.prototype.appendRow = function (f) { this.filas.push(f.slice()); };
  Hoja.prototype.deleteRows = function (f, n) { this.filas.splice(f - 1, n); };
  Hoja.prototype.clear = function () { this.filas = []; return this; };
  Hoja.prototype.hideSheet = function () {};
  Hoja.prototype.getSheetId = function () { return 1; };
  /* Lo demás (colores, bordes, filtros, protecciones…) no hace nada. */
  ['setFrozenRows', 'setFrozenColumns', 'setColumnWidth', 'setTabColor', 'getFilter', 'getBandings', 'getProtections', 'setConditionalFormatRules', 'autoResizeColumns', 'setRowHeight'].forEach(function (m) { Hoja.prototype[m] = function () { return m === 'getBandings' || m === 'getProtections' ? [] : nada(); }; });

  function Libro(id) { this.id = id; this.hojas = {}; }
  Libro.prototype.getId = function () { return this.id; };
  Libro.prototype.getName = function () { return 'Cuaderno ' + this.id; };
  Libro.prototype.getSheetByName = function (n) { return this.hojas[n] || null; };
  Libro.prototype.insertSheet = function (n) { return (this.hojas[n] = new Hoja(n, this)); };
  Libro.prototype.getSheets = function () { var s = this; return Object.keys(s.hojas).map(function (k) { return s.hojas[k]; }); };
  Libro.prototype.setActiveSheet = function () {}; Libro.prototype.toast = function () {};

  /* Los bytes de Apps Script van con signo. */
  function conSigno(u8) { var o = new Array(u8.length); for (var i = 0; i < u8.length; i++) o[i] = u8[i] > 127 ? u8[i] - 256 : u8[i]; return o; }
  function sinSigno(arr) { var u = new Uint8Array(arr.length); for (var i = 0; i < arr.length; i++) u[i] = arr[i] < 0 ? arr[i] + 256 : arr[i]; return u; }
  function Blob(bytes, nombre) { this.bytes = bytes; this.nombre = nombre || ''; }
  Blob.prototype.getBytes = function () { return conSigno(this.bytes); };
  Blob.prototype.getDataAsString = function (cod) { return new TextDecoder(cod === 'ISO-8859-1' ? 'iso-8859-1' : 'utf-8').decode(this.bytes); };
  Blob.prototype.getName = function () { return this.nombre; };

  function Archivo(f) { this.f = f; }
  Archivo.prototype.getName = function () { return this.f.nombre; };
  Archivo.prototype.getId = function () { return 'f:' + this.f.nombre; };
  Archivo.prototype.getLastUpdated = function () { return new Date(this.f.fecha || 0); };
  Archivo.prototype.getMimeType = function () { return /\.csv$/i.test(this.f.nombre) ? 'text/csv' : 'application/octet-stream'; };
  Archivo.prototype.getUrl = function () { return ''; };
  Archivo.prototype.getBlob = function () { return new Blob(this.f.bytes, this.f.nombre); };
  Archivo.prototype.isTrashed = function () { return false; };
  Archivo.prototype.getSize = function () { return this.f.bytes.length; };
  function lista(arr) { var i = 0; return { hasNext: function () { return i < arr.length; }, next: function () { return arr[i++]; } }; }
  function Carpeta(nombre, mundo) { this.nombre = nombre; this.mundo = mundo; }
  Carpeta.prototype.getId = function () { return 'carpeta:' + this.nombre; };
  Carpeta.prototype.getName = function () { return this.nombre; };
  Carpeta.prototype.getUrl = function () { return ''; };
  Carpeta.prototype.isTrashed = function () { return false; };
  Carpeta.prototype.getFiles = function () { return lista((this.mundo.carpetas[this.nombre] || []).map(function (f) { return new Archivo(f); })); };
  Carpeta.prototype.getFilesByName = function (n) { return lista((this.mundo.carpetas[this.nombre] || []).filter(function (f) { return f.nombre === n; }).map(function (f) { return new Archivo(f); })); };
  Carpeta.prototype.getFolders = function () { return lista([]); };
  Carpeta.prototype.getParents = function () { return lista([]); };
  Carpeta.prototype.getFoldersByName = function (n) { var m = this.mundo; return lista(n !== this.nombre && m.carpetas[n] ? [new Carpeta(n, m)] : []); };

  /* El mundo. `opciones`: { carpetas, curso (por omisión '26-27'), centro: { nombre, codigo } }. */
  function crear(opciones) {
    opciones = opciones || {};
    var curso = opciones.curso || '26-27';
    var CARPETA_DATOS = 'Datos de matrícula';
    var m = { carpetas: Object.assign({}, opciones.carpetas || {}) };
    if (!m.carpetas[CARPETA_DATOS]) m.carpetas[CARPETA_DATOS] = [];
    var libro = new Libro('L1');
    var props = {}, propsDoc = {}, cache = {};
    function guardian(mapa) {
      return { getProperty: function (k) { return Object.prototype.hasOwnProperty.call(mapa, k) ? mapa[k] : null; }, setProperty: function (k, v) { mapa[k] = String(v); }, deleteProperty: function (k) { delete mapa[k]; },
        setProperties: function (o) { Object.keys(o).forEach(function (k) { mapa[k] = String(o[k]); }); }, getKeys: function () { return Object.keys(mapa); }, getProperties: function () { return Object.assign({}, mapa); } };
    }
    var hoja = function (n, filas) { var h = libro.insertSheet(n); h.filas = filas; return h; };
    hoja('_cursos', [['Curso', 'Estado', 'IdLibroDatos', 'IdCarpetaDrive', 'FechaApertura', 'FechaCierre'], [curso, 'En marcha', 'L1', 'carpeta:' + CARPETA_DATOS, '', '']]);
    hoja('_centro', [['Clave', 'Valor', 'Quien', 'Cuando'], ['nombre', (opciones.centro && opciones.centro.nombre) || '', '', ''], ['codigo', (opciones.centro && opciones.centro.codigo) || '', '', '']]);
    var A = {
      SpreadsheetApp: { getActiveSpreadsheet: function () { return libro; }, openById: function () { return libro; }, ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }, BorderStyle: { SOLID: 'SOLID' } },
      DriveApp: { getFolderById: function (id) { var n = String(id).replace(/^carpeta:/, ''); return new Carpeta(m.carpetas[n] ? n : CARPETA_DATOS, m); },
        getFoldersByName: function (n) { return lista(m.carpetas[n] ? [new Carpeta(n, m)] : []); }, getFileById: function (id) { throw new Error('No hay fichero ' + id); } },
      PropertiesService: { getScriptProperties: function () { return guardian(props); }, getDocumentProperties: function () { return guardian(propsDoc); }, getUserProperties: function () { return guardian({}); } },
      CacheService: { getScriptCache: function () { return { put: function (k, v) { cache[k] = v; }, putAll: function (o) { Object.assign(cache, o); }, get: function (k) { return k in cache ? cache[k] : null; },
        getAll: function (ks) { var o = {}; ks.forEach(function (k) { if (k in cache) o[k] = cache[k]; }); return o; }, remove: function (k) { delete cache[k]; }, removeAll: function (ks) { ks.forEach(function (k) { delete cache[k]; }); } }; } },
      LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {}, tryLock: function () { return true; } }; } },
      Utilities: { newBlob: function (bytes, tipo, nombre) { return new Blob(sinSigno(bytes), nombre); }, base64Decode: function (t) { var b = atob(String(t)), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return conSigno(u); },
        formatDate: function (d) { return new Date(d).toISOString(); }, getUuid: function () { return 'uuid-' + Math.random().toString(36).slice(2); }, sleep: function () {}, DigestAlgorithm: { SHA_256: 'sha256' } },
      Session: { getActiveUser: function () { return { getEmail: function () { return ''; } }; }, getScriptTimeZone: function () { return 'Europe/Madrid'; } },
      MimeType: { PLAIN_TEXT: 'text/plain', GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet' }, ScriptApp: { getProjectTriggers: function () { return []; }, getScriptId: function () { return 'navegador'; } },
      UrlFetchApp: { fetch: function () { throw new Error('Sin red en las cuentas del navegador.'); } }, HtmlService: {}, Logger: { log: function () {} }
    };
    return { A: A, libro: libro, carpetas: m.carpetas, CARPETA_DATOS: CARPETA_DATOS, props: props, propsDoc: propsDoc };
  }

  G.CuentasMundo = { crear: crear, Hoja: Hoja, Libro: Libro, conSigno: conSigno };
})();
