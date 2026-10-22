/* El buscador de la web nueva (instrucción 135). Es la misma regla que el buscador de hoy (JsCopiarNombre.html y JsBuscadorFicha.html):
   por nombre (cualquier parte, sin tildes ni mayúsculas, todas las palabras) o por número de identificación (3 cifras o más, dentro del número);
   los actuales primero y luego los antiguos que no estén ya entre los actuales (por clave o por número); con cifras, el número exacto primero; 25 como mucho. */
(function (raiz) {
  'use strict';
  var TOPE = 25;

  function normalizar(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function cifrasDe(texto) {
    var s = String(texto == null ? '' : texto).replace(/\s+/g, '');
    return /^[0-9]{3,}$/.test(s) ? s : '';
  }

  /* Las filas del fichero ([clave, nombre, curso, unidad, idEscolar]) pasan a objetos con el nombre ya normalizado. */
  function preparar(filas, antiguo) {
    return (filas || []).map(function (f) { return { clave: f[0], nombre: f[1], curso: f[2], unidad: f[3], idEscolar: String(f[4] || ''), norm: normalizar(f[1]), antiguo: !!antiguo }; });
  }

  /* Devuelve { lista, hayMas, porNumero }. */
  function buscar(texto, actuales, antiguos) {
    var c = cifrasDe(texto), palabras = normalizar(texto).split(' ').filter(Boolean);
    if (!c && normalizar(texto).replace(/ /g, '').length < 3) return { lista: [], hayMas: false, porNumero: false, corto: true };
    var coincide = c
      ? function (a) { return a.idEscolar.indexOf(c) !== -1; }
      : function (a) { return palabras.every(function (p) { return a.norm.indexOf(p) !== -1; }); };
    var exactosPrimero = function (l) { return c ? l.filter(function (a) { return a.idEscolar === c; }).concat(l.filter(function (a) { return a.idEscolar !== c; })) : l; };
    var vistos = {};
    actuales.forEach(function (a) { if (a.idEscolar) vistos['id' + a.idEscolar] = true; vistos['clave' + a.clave] = true; });
    var a1 = exactosPrimero(actuales.filter(coincide));
    var a2 = exactosPrimero(antiguos.filter(function (a) { return !vistos['clave' + a.clave] && !(a.idEscolar && vistos['id' + a.idEscolar]) && coincide(a); }));
    var todos = a1.concat(a2);
    return { lista: todos.slice(0, TOPE), hayMas: todos.length > TOPE, porNumero: !!c };
  }

  var api = { normalizar: normalizar, cifrasDe: cifrasDe, preparar: preparar, buscar: buscar, TOPE: TOPE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.BuscarWeb = api;
})(typeof window !== 'undefined' ? window : globalThis);
