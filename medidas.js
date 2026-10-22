/* Cuánto tarda en abrir, en cada búsqueda y en abrir una ficha (instrucciones 135 y 136), como pagina/medidas.js del Centro de datos: solo milisegundos, nunca un nombre ni lo escrito en el buscador.
   Se guardan en la carpeta privada (`_medidas-web.json` el buscador, `_medidas-ficha.json` la ficha, cada página el suyo para no pisarse), nunca en los datos del alumnado.
   Si no hay permiso de escritura, no se guarda y no pasa nada. */
(function () {
  'use strict';
  var NOMBRE = '_medidas-web.json', NOMBRE_FICHA = '_medidas-ficha.json', NOMBRE_LISTADO = '_medidas-listado.json', NOMBRE_HOY = '_medidas-hoy.json', NOMBRE_REVISION = '_medidas-revision.json', NOMBRE_ESTADISTICAS = '_medidas-estadisticas.json', MAX = 30;
  var datos = { version: '', abrir: [], buscar: [] }, fichas = { version: '', ficha: [] }, listados = { version: '', listado: [] }, hoys = { version: '', hoy: [] }, revisiones = { version: '', revision: [] }, estadisticas = { version: '', estadisticas: [] };
  var pendiente = {};

  function entero(x) { return Math.max(0, Math.min(600000, Math.round(Number(x) || 0))); }
  function mediana(l) { var s = l.slice().sort(function (a, b) { return a - b; }); return s.length ? s[Math.floor(s.length / 2)] : 0; }
  function guardar(nombre, objeto) {
    if (!window.CarpetaWeb.hayCarpeta() || pendiente[nombre]) return;
    pendiente[nombre] = setTimeout(function () {
      pendiente[nombre] = null;
      window.CarpetaWeb.escribirJson(nombre, objeto).then(null, function () { /* sin permiso de escribir: se queda sin guardar */ });
    }, 1500);
  }
  function apuntar(lista, ms, nombre, objeto) { lista.push(entero(ms)); if (lista.length > MAX) lista.shift(); objeto.version = window.VERSION_WEB || ''; guardar(nombre, objeto); }

  window.MedidasWeb = {
    abrir: function (ms) { apuntar(datos.abrir, ms, NOMBRE, datos); },
    buscar: function (ms) { apuntar(datos.buscar, ms, NOMBRE, datos); },
    ficha: function (ms) { apuntar(fichas.ficha, ms, NOMBRE_FICHA, fichas); },
    listado: function (ms) { apuntar(listados.listado, ms, NOMBRE_LISTADO, listados); },
    hoy: function (ms) { apuntar(hoys.hoy, ms, NOMBRE_HOY, hoys); },
    revision: function (ms) { apuntar(revisiones.revision, ms, NOMBRE_REVISION, revisiones); },
    estadisticas: function (ms) { apuntar(estadisticas.estadisticas, ms, NOMBRE_ESTADISTICAS, estadisticas); },
    resumen: function () { return { abrirMs: mediana(datos.abrir), buscarMs: mediana(datos.buscar), fichaMs: mediana(fichas.ficha), listadoMs: mediana(listados.listado), hoyMs: mediana(hoys.hoy), revisionMs: mediana(revisiones.revision), estadisticasMs: mediana(estadisticas.estadisticas), abiertas: datos.abrir.length, busquedas: datos.buscar.length, fichas: fichas.ficha.length, listados: listados.listado.length, hoys: hoys.hoy.length, revisiones: revisiones.revision.length, estadisticas: estadisticas.estadisticas.length }; }
  };
})();
