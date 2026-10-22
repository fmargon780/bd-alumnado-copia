/* Cuánto tarda en abrir y en cada búsqueda (instrucción 135), como pagina/medidas.js del Centro de datos: solo milisegundos, nunca un nombre ni lo escrito en el buscador.
   Se guardan en la carpeta privada (`_medidas-web.json`), nunca en los datos del alumnado. Si no hay permiso de escritura, no se guarda y no pasa nada. */
(function () {
  'use strict';
  var NOMBRE = '_medidas-web.json', MAX = 30;
  var datos = { version: '', abrir: [], buscar: [] };
  var pendiente = null;

  function entero(x) { return Math.max(0, Math.min(600000, Math.round(Number(x) || 0))); }
  function mediana(l) { var s = l.slice().sort(function (a, b) { return a - b; }); return s.length ? s[Math.floor(s.length / 2)] : 0; }
  function guardar() {
    if (!window.CarpetaWeb.hayCarpeta() || pendiente) return;
    pendiente = setTimeout(function () {
      pendiente = null;
      window.CarpetaWeb.escribirJson(NOMBRE, datos).then(null, function () { /* sin permiso de escribir: se queda sin guardar */ });
    }, 1500);
  }
  function apuntar(lista, ms) { lista.push(entero(ms)); if (lista.length > MAX) lista.shift(); datos.version = window.VERSION_WEB || ''; guardar(); }

  window.MedidasWeb = {
    abrir: function (ms) { apuntar(datos.abrir, ms); },
    buscar: function (ms) { apuntar(datos.buscar, ms); },
    resumen: function () { return { abrirMs: mediana(datos.abrir), buscarMs: mediana(datos.buscar), abiertas: datos.abrir.length, busquedas: datos.buscar.length }; }
  };
})();
