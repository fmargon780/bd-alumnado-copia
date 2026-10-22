/* Generado de JsEstadisticasGrafico.html por web/construir-estadisticas.mjs: no se toca a mano. */
var EST_COLORES = ['#2a5d9f', '#c2571a', '#2f8455', '#8a4fa3', '#a37d00', '#5b6675'];
var EST_MAX_BARRAS = 30;

/* Una casilla «sin dato» no es un número: se pinta como 0 (y su texto dice «sin dato»). */
function estadNum(v) { return typeof v === 'number' ? v : 0; }

function estadSvgTexto(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ¿Se pueden repartir en sectores las cifras de este cálculo? Solo un número de alumnos (los de la casilla o los que cumplen una condición). */
function estadSectoresValidos(calculo) { return !!calculo && (calculo.tipo === 'alumnos' || calculo.tipo === 'distintos' || calculo.tipo === 'cumplen'); }

function estadCorta(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

/* Devuelve { svg, ancho, alto, nota, aviso, titulo }. `aviso` (y sin svg) cuando no se puede pintar y por qué, en llano. */
function estadGrafico(P, def, res, g) {
  var nc = res.calculos.length;
  var out = { svg: '', ancho: 0, alto: 0, nota: '', aviso: '', titulo: '' };
  if (!nc || res.columnaDemasiada) { out.aviso = 'No hay una tabla que pintar.'; return out; }
  var ic = g && g.calculo >= 0 && g.calculo < nc ? g.calculo : 0, tipo = g && g.tipo === 'sectores' ? 'sectores' : 'barras';
  var calculo = res.calculos[ic];
  out.titulo = calculo.etiqueta;
  var hojas = res.filas.filter(function (f) { return f.tipo === 'hoja'; });
  if (!hojas.length) hojas = [{ camino: ['Total'], celdas: res.total.celdas }];
  if (hojas.length > EST_MAX_BARRAS) { out.nota = 'Se pintan las ' + EST_MAX_BARRAS + ' primeras de ' + hojas.length + ', en el orden de la tabla.'; hojas = hojas.slice(0, EST_MAX_BARRAS); }
  var series = res.columnas.length > 1 ? res.columnas.slice(0, -1) : [null];   // sin dato en columnas, una sola serie: la cifra de la fila
  var etiqueta = function (f) { return f.camino.join(' · '); };
  var fam = 'font-family="Arial,Helvetica,sans-serif"';

  if (tipo === 'sectores') {
    if (!estadSectoresValidos(calculo)) { out.aviso = 'Los sectores reparten un número de alumnos. Elige un cálculo de número, o cambia a barras.'; return out; }
    var it = (res.columnas.length - 1) * nc + ic;   // con un dato en columnas, el «Total»
    var total = 0;
    hojas.forEach(function (f) { total += estadNum(f.celdas[it]); });
    var ang = -Math.PI / 2, trozos = '', leyenda = '', n = 0;
    hojas.forEach(function (f, i) {
      var v = estadNum(f.celdas[it]), fin = ang + (total ? v / total : 0) * 2 * Math.PI, color = EST_COLORES[i % EST_COLORES.length];
      if (v > 0 && v === total)  trozos += '<circle class="sector" cx="110" cy="110" r="104" fill="' + color + '"/>';
      else if (v > 0) trozos += '<path class="sector" d="M110 110 L' + (110 + 104 * Math.cos(ang)).toFixed(1) + ' ' + (110 + 104 * Math.sin(ang)).toFixed(1) + ' A104 104 0 ' + (fin - ang > Math.PI ? 1 : 0) + ' 1 ' + (110 + 104 * Math.cos(fin)).toFixed(1) + ' ' + (110 + 104 * Math.sin(fin)).toFixed(1) + ' Z" fill="' + color + '" stroke="#ffffff" stroke-width="1.5"/>';
       leyenda += '<rect class="ley" x="250" y="' + (10 + n * 20) + '" width="11" height="11" fill="' + color + '"/><text x="268" y="' + (20 + n * 20) + '" font-size="12" fill="#1c2430" ' + fam + '>' + estadSvgTexto(estadCorta(etiqueta(f), 44)) + ': ' + v + ' (' + estadNumeroEs(total ? v / total * 100 : 0, 1) + ' %)</text>';
      n++; ang = fin;
    });
    out.ancho = 700; out.alto = Math.max(230, 20 + n * 20);
    out.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + out.ancho + ' ' + out.alto + '" width="' + out.ancho + '" height="' + out.alto + '" role="img" aria-label="Gráfico de sectores: ' + estadSvgTexto(calculo.etiqueta) + '">' +
      '<rect width="100%" height="100%" fill="#ffffff"/>' + trozos + leyenda + '</svg>';
    return out;
  }

  /* Barras */
  var max = 0;
  hojas.forEach(function (f) { series.forEach(function (s, a) { var v = estadNum(f.celdas[(s === null ? res.columnas.length - 1 : a) * nc + ic]); if (v > max) max = v; }); });
  var anchoEt = 190, anchoMax = 560, hBarra = 14, hueco = 10, y = res.columnas.length > 1 ? 26 : 6, cuerpo = '', ley = '';
  if (res.columnas.length > 1) {
    var x = anchoEt;
    series.forEach(function (s, a) {
      ley += '<rect class="ley" x="' + x + '" y="4" width="11" height="11" fill="' + EST_COLORES[a % EST_COLORES.length] + '"/><text x="' + (x + 16) + '" y="14" font-size="12" fill="#1c2430" ' + fam + '>' + estadSvgTexto(s) + '</text>';
      x += 28 + estadSvgTexto(s).length * 6.4;
    });
  }
  hojas.forEach(function (f) {
    var alto = series.length * (hBarra + 2);
    cuerpo += '<text class="etiqueta" x="' + (anchoEt - 8) + '" y="' + (y + alto / 2 + 4) + '" font-size="12" text-anchor="end" fill="#1c2430" ' + fam + '>' + estadSvgTexto(estadCorta(etiqueta(f), 30)) + '</text>';
    series.forEach(function (s, a) {
      var v = f.celdas[(s === null ? res.columnas.length - 1 : a) * nc + ic];
      var w = max && estadNum(v) ? Math.max(1.5, estadNum(v) / max * anchoMax) : 0, yy = y + a * (hBarra + 2);
      cuerpo += '<rect class="barra" x="' + anchoEt + '" y="' + yy + '" width="' + w.toFixed(1) + '" height="' + hBarra + '" fill="' + EST_COLORES[a % EST_COLORES.length] + '"/>' +
        '<text class="valor" x="' + (anchoEt + w + 5).toFixed(1) + '" y="' + (yy + hBarra - 3) + '" font-size="11" fill="#1c2430" ' + fam + '>' + estadSvgTexto(estadFormato(v, calculo.tipo)) + '</text>';
    });
    y += alto + hueco;
  });
  out.ancho = anchoEt + anchoMax + 80; out.alto = y + 4;
  out.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + out.ancho + ' ' + out.alto + '" width="' + out.ancho + '" height="' + out.alto + '" role="img" aria-label="Gráfico de barras: ' + estadSvgTexto(calculo.etiqueta) + '">' +
    '<rect width="100%" height="100%" fill="#ffffff"/>' + ley + cuerpo + '</svg>';
  return out;
}
