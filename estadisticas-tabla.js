/* Generado de JsEstadisticasTabla.html por web/construir-estadisticas.mjs: no se toca a mano. */
function estadFlecha_(def, ci) {
  var o = def.orden || { columna: -1, sentido: 1 };
  return o.columna === ci ? (o.sentido > 0 ? ' ▲' : ' ▼') : '';
}

function estadTablaHtml(P, def, res) {
  var m = estadMatriz(P, def, res), nf = m.nf, nc = m.nc, i, j;
  var h = '<table class="est-tabla"><thead>';
  if (m.grupos) {
    h += '<tr><th class="fila" colspan="' + nf + '"></th>';
    m.grupos.forEach(function (g) { h += '<th class="grupo" colspan="' + g.span + '">' + escapaHtml(g.texto) + '</th>'; });
    h += '</tr>';
  }
  h += '<tr>';
  m.titulosFila.forEach(function (t) { h += '<th class="fila"><button data-est-orden="-1">' + escapaHtml(t || 'Orden') + estadFlecha_(def, -1) + '</button></th>'; });
  var ncol = res.columnas.length;
  for (i = 0; i < ncol; i++) for (j = 0; j < nc; j++) {
    var ci = i * nc + j;
    h += '<th' + (m.grupos && j === 0 ? ' class="sep"' : '') + '><button data-est-orden="' + ci + '">' + escapaHtml(res.calculos[j].etiqueta) + estadFlecha_(def, ci) + '</button></th>';
  }
  h += '</tr></thead><tbody>';
  m.cuerpo.forEach(function (f, ri) {
    var clase = f.tipo === 'sub' ? ' class="sub"' : (f.tipo === 'total' ? ' class="tot"' : '');
    h += '<tr' + clase + '>';
    if (f.tipo === 'hoja') f.etiquetas.forEach(function (e) { h += '<td class="fila">' + escapaHtml(e) + '</td>'; });
    else {
      for (i = 0; i < f.desde; i++) h += '<td class="fila"></td>';
      h += '<td class="fila" colspan="' + (nf - f.desde) + '">' + escapaHtml(f.etiquetas[f.desde]) + '</td>';
    }
    /* Instrucción 70: toda cifra se puede pulsar y abre la lista de esos alumnos (JsEstadisticasLista.html). */
    f.valores.forEach(function (v, k) { h += '<td' + (m.grupos && k % nc === 0 ? ' class="sep"' : '') + '><button class="num" data-est-f="' + ri + '" data-est-c="' + k + '">' + escapaHtml(v.texto) + '</button></td>'; });
    h += '</tr>';
  });
  return h + '</tbody></table>';
}
