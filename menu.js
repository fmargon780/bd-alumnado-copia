/* El menú de la web nueva (instrucción 138): un enlace por cada pantalla ya pasada a la web nueva. Cada fila que pasa una pantalla añade aquí su línea.
   Se pinta en el elemento `#menu` de cada página; la página actual se marca con `data-pagina="<fichero>"` en `body`. */
(function () {
  'use strict';
  var PAGINAS = [['hoy.html', 'Hoy'], ['index.html', 'Buscador'], ['listado.html', 'Listados'], ['revision.html', 'Revisión'], ['estadisticas.html', 'Estadísticas'], ['quienviene.html', 'Quién viene'], ['mesa.html', 'Mesa'], ['datos.html', 'Datos']];
  var caja = document.getElementById('menu');
  if (!caja) return;
  var actual = document.body.getAttribute('data-pagina') || '';
  PAGINAS.forEach(function (p) {
    var a = document.createElement('a');
    a.href = p[0]; a.textContent = p[1];
    if (p[0] === actual) a.className = 'actual';
    caja.appendChild(a);
  });
})();
