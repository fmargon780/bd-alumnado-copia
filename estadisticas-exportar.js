/* Generado de JsEstadisticasExportar.html por web/construir-estadisticas.mjs: no se toca a mano. */
var EST_LIBS_ = {
  pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'],
  excel: ['https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js']
};
var EST_LIB_PROMESAS_ = {};
var EST_PDF_ = { margen: 12, fuenteMax: 12, fuenteBase: 9, fuenteMin: 6.5 };

function estadCargarScript_(url) {
  if (EST_LIB_PROMESAS_[url]) return EST_LIB_PROMESAS_[url];
  EST_LIB_PROMESAS_[url] = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = url; s.async = true;
    s.onload = function () { resolve(); };
    s.onerror = function () { delete EST_LIB_PROMESAS_[url]; s.remove(); reject(new Error('no ha cargado ' + url)); };
    document.head.appendChild(s);
  });
  return EST_LIB_PROMESAS_[url];
}

/* En orden: el plugin de tablas necesita ya la biblioteca del PDF. */
function estadCargarLibs_(tipo) {
  return EST_LIBS_[tipo].reduce(function (p, url) { return p.then(function () { return estadCargarScript_(url); }); }, Promise.resolve());
}

function estadFechaHora_() {
  var p = {};
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
  return { fecha: p.year + '-' + p.month + '-' + p.day, texto: p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute };
}

function estadNombreFichero_(extension) {
  var nombre = estadTituloConsulta_() === 'Estadística sin guardar' ? 'sin guardar' : estadTituloConsulta_();
  nombre = nombre.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);
  return 'Estadística - ' + nombre + ' - ' + EST_.curso + ' - ' + estadFechaHora_().fecha + '.' + extension;
}

function estadDescargar_(blob, nombre) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

function estadCabecera_() {
  var cursos = EST_.def.conjunto !== 'materias' ? estadCursosNecesarios_() : [EST_.curso];   // los cursos que entran
  return { centro: (ESTADO && ESTADO.centro && ESTADO.centro.nombre) || '', titulo: estadTituloConsulta_(), curso: cursos.join(', '), cuando: estadFechaHora_().texto,
    incluye: estadTextoFiltros(EST_.P, EST_.def) };
}

/* ---------------------------------------------------------------- el botón */

function estadExportar_(tipo, boton, forzar) {
  var res = EST_.res;
  if (!EST_.P || !res) return;
  if (res.columnaDemasiada || !res.calculos.length) { estadTostada_('Primero tiene que haber una tabla que descargar.'); return; }
  boton = boton || document.getElementById(tipo === 'pdf' ? 'estPdf' : 'estExcel');
  var texto = boton.textContent;
  boton.disabled = true; boton.textContent = 'Preparando…';
  var avisos = document.getElementById('estAvisos');
  avisos.innerHTML = '';
  estadCargarLibs_(tipo).then(function () {
    return tipo === 'pdf' ? estadHacerPdf_(forzar) : estadHacerExcel_();
  }).then(function (r) {
    if (r && r.aviso) {
      avisos.innerHTML = '<div class="aviso">La tabla es muy ancha para una hoja: saldría con la letra muy pequeña. <a class="enlace-cabecera" id="estPdfIgual">Descargar igualmente</a> · <a class="enlace-cabecera" id="estPdfNo">Cancelar</a></div>';
      document.getElementById('estPdfIgual').onclick = function () { estadExportar_('pdf', null, true); };
      document.getElementById('estPdfNo').onclick = function () { avisos.innerHTML = ''; };
    }
  }).catch(function (e) {
    var cargaFallida = /^no ha cargado/.test(mensajeDeError(e)) || (tipo === 'pdf' && !(window.jspdf && window.jspdf.jsPDF)) || (tipo === 'excel' && !window.ExcelJS);
    avisos.innerHTML = '<div class="error">' + (cargaFallida ? 'No he podido preparar el ' + (tipo === 'pdf' ? 'PDF' : 'Excel') + ': no llega la biblioteca que lo hace. Mira la conexión. ' : 'No he podido preparar el fichero. ' + escapaHtml(mensajeDeError(e)) + ' ') +
      '<a class="enlace-cabecera" id="estReintenta">Reintentar</a></div>';
    document.getElementById('estReintenta').onclick = function () { estadExportar_(tipo, null, forzar); };
  }).then(function () { boton.disabled = false; boton.textContent = texto; });
}

/* ---------------------------------------------------------------- el PDF */

/* Instrucción 80 (docs/PDF-ESTADISTICAS-CENTRADO.md): la tabla centrada y con el ancho justo de cada columna, la cabecera en uno o dos renglones, las líneas de arriba
   centradas y la letra hasta 12 mientras quepa en vertical sin costar una hoja más. */

/* Ancho de cada columna con una letra dada: lo mayor entre su contenido y su cabecera (en un renglón, o en dos con el corte que deja más estrecho el renglón más largo).
   Devuelve también el texto de cada cabecera ya cortado (con «\n»), para que nunca salga en tres renglones. */
function estadAnchos_(doc, m, fuente, dos) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fuente);
  var pad = fuente / 6, extra = 2 * pad + 1, titulos = [];
  var anchos = m.titulos.map(function (t, j) {
    var cont = 0, texto = String(t || '');
    m.cuerpo.forEach(function (f) {
      var celda = j < m.nf ? ((f.tipo === 'hoja' || f.desde === j) && (f.tipo === 'hoja' || m.nf - f.desde === 1) ? f.etiquetas[j] : '') : f.valores[j - m.nf].texto;
      cont = Math.max(cont, doc.getTextWidth(String(celda || '')));
    });
    var entera = doc.getTextWidth(texto), palabras = texto.split(/\s+/).filter(Boolean), cab = entera, corte = texto;
    if (dos && entera > cont && palabras.length > 1) {
      for (var k = 1; k < palabras.length; k++) {
        var s1 = palabras.slice(0, k).join(' '), s2 = palabras.slice(k).join(' '), w = Math.max(doc.getTextWidth(s1), doc.getTextWidth(s2));
        if (w < cab) { cab = w; corte = s1 + '\n' + s2; }
      }
    }
    titulos.push(corte);
    return Math.max(cont, cab) + extra;
  });
  /* El rótulo de un grupo de columnas va en un renglón: si es más ancho que sus columnas, lo que falta se reparte a partes iguales. */
  var c0 = m.nf;
  (m.grupos || []).forEach(function (g) {
    var falta = doc.getTextWidth(g.texto) + extra, suma = 0, i;
    for (i = c0; i < c0 + g.span; i++) suma += anchos[i];
    if (falta > suma) for (i = c0; i < c0 + g.span; i++) anchos[i] += (falta - suma) / g.span;
    c0 += g.span;
  });
  return { anchos: anchos, titulos: titulos, total: anchos.reduce(function (s, x) { return s + x; }, 0), pad: pad };
}

/* El plan del PDF, sin dibujar nada que se descargue: letra, hoja, anchos y renglones de las cabeceras.
   1) vertical, letra de 12 a 9,5, sin costar una hoja más que con letra 9; 2) letra de 9 a 6,5, vertical y si no apaisado; 3) si nada cabe, apaisado, 6,5, en dos renglones. */
function estadPlanPdf_(JsPdf, m, cab, graf) {
  var util = { portrait: 210 - 2 * EST_PDF_.margen, landscape: 297 - 2 * EST_PDF_.margen }, medida = new JsPdf({ unit: 'mm', format: 'a4' });
  function intento(f, orient, dos) {
    var a = estadAnchos_(medida, m, f, dos);
    return { fuente: f, orient: orient, dos: dos, anchos: a.anchos, titulos: a.titulos, total: a.total, pad: a.pad, cabe: a.total <= util[orient] };
  }
  function paginas(plan) {
    var d = new JsPdf({ orientation: plan.orient, unit: 'mm', format: 'a4' });
    estadDibujar_(d, m, cab, plan, graf, null);
    return d.getNumberOfPages();
  }
  function probar(f, orientes) {
    for (var i = 0; i < orientes.length; i++) for (var k = 0; k < 2; k++) { var p = intento(f, orientes[i], k === 1); if (p.cabe) return p; }
    return null;
  }
  var ref = probar(EST_PDF_.fuenteBase, ['portrait', 'landscape']);
  if (ref) {
    ref.paginas = paginas(ref);
    if (ref.orient === 'portrait') {
      for (var f = EST_PDF_.fuenteMax; f > EST_PDF_.fuenteBase; f -= 0.5) {
        var v = probar(f, ['portrait']);
        if (v) { v.paginas = paginas(v); if (v.paginas <= ref.paginas) return v; }
      }
    }
    return ref;
  }
  for (var g = EST_PDF_.fuenteBase - 0.5; g >= EST_PDF_.fuenteMin; g -= 0.5) {
    var w = probar(g, ['portrait', 'landscape']);
    if (w) { w.paginas = paginas(w); return w; }
  }
  var ultimo = intento(EST_PDF_.fuenteMin, 'landscape', true);
  ultimo.paginas = paginas(ultimo);
  return ultimo;
}

/* Dibuja todo menos los números de página. Con `img` null no pone el dibujo (sirve para contar hojas). */
function estadDibujar_(doc, m, cab, plan, graf, img) {
  var margen = EST_PDF_.margen, ancho = doc.internal.pageSize.getWidth(), alto = doc.internal.pageSize.getHeight(), cx = ancho / 2, y = margen, f = plan.fuente;
  function lineas(texto, tam, negrita) {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(tam);
    var paso = tam * 0.3528 * 1.2;
    doc.splitTextToSize(texto, ancho - 2 * margen).forEach(function (l) { y += paso; doc.text(l, cx, y, { align: 'center' }); });
    y += 1.5;
  }
  lineas(cab.centro, Math.max(13, f + 3), true);
  lineas(cab.titulo, Math.max(11, f + 1), true);
  lineas((cab.curso.indexOf(',') === -1 ? 'Curso escolar ' : 'Cursos escolares ') + cab.curso + ' · ' + cab.cuando, Math.max(9, f - 2), false);
  lineas('Se incluye: ' + cab.incluye, Math.max(9, f - 2), false);
  y += 1;

  var head = [];
  if (m.grupos) {
    var r1 = [{ content: '', colSpan: m.nf }];
    m.grupos.forEach(function (g) { r1.push({ content: g.texto, colSpan: g.span, styles: { halign: 'center' } }); });
    head.push(r1);
  }
  head.push(plan.titulos.map(function (t, j) { return { content: t, styles: { halign: j < m.nf ? 'left' : 'right' } }; }));
  var body = m.cuerpo.map(function (fi) {
    var fila = [], i;
    if (fi.tipo === 'hoja') fi.etiquetas.forEach(function (e) { fila.push({ content: e }); });
    else {
      for (i = 0; i < fi.desde; i++) fila.push({ content: '' });
      fila.push({ content: fi.etiquetas[fi.desde], colSpan: m.nf - fi.desde });
    }
    fi.valores.forEach(function (v) { fila.push({ content: v.texto, styles: { halign: 'right' } }); });
    if (fi.tipo !== 'hoja') fila.forEach(function (c) { c.styles = Object.assign({ fontStyle: 'bold', fillColor: fi.tipo === 'total' ? [222, 228, 238] : [240, 243, 248] }, c.styles || {}); });
    return fila;
  });
  var columnas = {};
  plan.anchos.forEach(function (w, j) { columnas[j] = { cellWidth: w }; });
  var lado = Math.max(plan.cabe ? (ancho - plan.total) / 2 : 0, plan.cabe ? 0 : margen);
  doc.autoTable({
    head: head, body: body, startY: y, theme: 'grid', showHead: 'everyPage', tableWidth: plan.total,
    margin: { left: lado, right: lado, top: margen, bottom: margen + 4 },
    styles: { font: 'helvetica', fontSize: f, cellPadding: plan.pad, lineColor: [200, 206, 214], lineWidth: 0.1, textColor: 30, overflow: 'visible' },
    headStyles: { fillColor: [230, 236, 244], textColor: 30, fontStyle: 'bold' }, columnStyles: columnas
  });
  if (graf) {
    /* El mismo dibujo que en pantalla, debajo de la tabla, centrado; si no cabe, en la página siguiente, entero. */
    var util = ancho - 2 * margen, w = util, h = w * graf.alto / graf.ancho, tope = alto - 2 * margen - 12;
    if (h > tope) { h = tope; w = h * graf.ancho / graf.alto; }
    var y0 = doc.lastAutoTable.finalY + 8;
    if (y0 + h + 6 > alto - margen - 6) { doc.addPage(); y0 = margen + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Gráfico: ' + graf.titulo + (graf.nota ? ' (' + graf.nota + ')' : ''), cx, y0, { align: 'center' });
    if (img) doc.addImage(img, 'PNG', (ancho - w) / 2, y0 + 3, w, h);
  }
}

function estadHacerPdf_(forzar) {
  var m = estadMatriz(EST_.P, EST_.def, EST_.res), cab = estadCabecera_(), JsPdf = window.jspdf.jsPDF;
  var g = EST_.def.grafico, graf = g && g.enPdf ? estadGrafico(EST_.P, EST_.def, EST_.res, g) : null;
  if (graf && !graf.svg) graf = null;
  var plan = estadPlanPdf_(JsPdf, m, cab, graf);
  if (!plan.cabe && !forzar) return { aviso: true };
  var imagen = graf ? estadSvgAImagen_(graf) : Promise.resolve(null);
  return imagen.then(function (img) {
    var doc = new JsPdf({ orientation: plan.orient, unit: 'mm', format: 'a4' }), ancho = doc.internal.pageSize.getWidth(), alto = doc.internal.pageSize.getHeight();
    estadDibujar_(doc, m, cab, plan, graf, img);
    var paginas = doc.getNumberOfPages();
    for (var p = 1; p <= paginas; p++) {
      doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text('Página ' + p + ' de ' + paginas, ancho - EST_PDF_.margen, alto - 6, { align: 'right' });
    }
    estadDescargar_(doc.output('blob'), estadNombreFichero_('pdf'));
    return { ok: true };
  });
}

/* El SVG del gráfico como imagen PNG con fondo blanco (el PDF lleva imágenes, no dibujos). */
function estadSvgAImagen_(graf) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(new Blob([graf.svg], { type: 'image/svg+xml;charset=utf-8' })), im = new Image();
    im.onload = function () {
      var escala = 2, c = document.createElement('canvas');
      c.width = graf.ancho * escala; c.height = graf.alto * escala;
      var cx = c.getContext('2d');
      cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('no he podido dibujar el gráfico')); };
    im.src = url;
  });
}

/* ---------------------------------------------------------------- el Excel */

function estadHacerExcel_() {
  var P = EST_.P, def = EST_.def, res = EST_.res, m = estadMatriz(P, def, res), cab = estadCabecera_(), ExcelJS = window.ExcelJS;
  var wb = new ExcelJS.Workbook();
  var ws = wb.addWorksheet('Estadística');
  var negrita = { bold: true };
  ws.addRow([cab.centro]).font = { bold: true, size: 14 };
  ws.addRow([cab.titulo]).font = { bold: true, size: 12 };
  ws.addRow([(cab.curso.indexOf(',') === -1 ? 'Curso escolar: ' : 'Cursos escolares: ') + cab.curso]);
  ws.addRow(['Fecha: ' + cab.cuando]);
  ws.addRow(['Se incluye: ' + cab.incluye]);
  ws.addRow([]);
  var relleno = function (fila, color) { fila.eachCell({ includeEmpty: true }, function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; }); };
  if (m.grupos) {
    var g = ws.addRow([].concat(Array(m.nf).fill('')));
    var col = m.nf + 1;
    m.grupos.forEach(function (x) {
      g.getCell(col).value = x.texto; g.getCell(col).alignment = { horizontal: 'center' };
      if (x.span > 1) ws.mergeCells(g.number, col, g.number, col + x.span - 1);
      col += x.span;
    });
    g.font = negrita; relleno(g, 'FFE6ECF4');
  }
  var t = ws.addRow(m.titulos);
  t.font = negrita; relleno(t, 'FFE6ECF4');
  t.eachCell(function (c, n) { c.alignment = { horizontal: n <= m.nf ? 'left' : 'right', wrapText: true }; });
  m.cuerpo.forEach(function (f) {
    var fila = ws.addRow(f.etiquetas.concat(f.valores.map(function (v) {
      if (v.v === null || v.v === undefined) return '–';
      if (typeof v.v !== 'number') return v.v;   // «sin dato»
      return v.tipo === 'porcentaje' ? v.v / 100 : v.v;
    })));
    f.valores.forEach(function (v, k) {
      var c = fila.getCell(m.nf + 1 + k);
      c.alignment = { horizontal: 'right' };
      if (typeof v.v !== 'number') return;
      c.numFmt = v.tipo === 'porcentaje' ? '0.0%' : (v.tipo === 'media' ? '0.00' : (Math.round(v.v) === v.v ? '0' : '0.00'));
    });
    if (f.tipo !== 'hoja') { fila.font = negrita; relleno(fila, f.tipo === 'total' ? 'FFDEE4EE' : 'FFF0F3F8'); }
  });
  for (var j = 1; j <= m.titulos.length; j++) ws.getColumn(j).width = j <= m.nf ? 30 : 18;

  var wa = wb.addWorksheet({ solicitudes: 'Solicitudes', esperados: 'Esperados', transito: 'Fichas' }[def.conjunto] || 'Alumnado');
  var aviso = wa.addRow(['Esta hoja lleva nombres de alumnos. No la reenvíes fuera del equipo directivo.']);
  aviso.font = { bold: true, color: { argb: 'FFB3261E' } };
  var usados = estadClavesUsadas(P, def).filter(function (k) { return k !== 'unidad' && k !== 'cursoEscolar'; });   // la unidad y el curso escolar ya tienen su columna
  var cabeza = wa.addRow(['Alumno/a', 'Unidad', 'Curso escolar'].concat(usados.map(function (k) { return P.cat[k].c.etiqueta; })));
  cabeza.font = negrita; relleno(cabeza, 'FFE6ECF4');
  var filas = res.ids.map(function (i) { return P.alumnos[i]; }).sort(function (a, b) {
    var ca = estadClaveUnidad(a.u), cb = estadClaveUnidad(b.u);
    return (ca[0] - cb[0]) || String(ca[1]).localeCompare(String(cb[1]), 'es', { numeric: true }) || a.n.localeCompare(b.n, 'es');
  });
  filas.forEach(function (a) {
    wa.addRow([a.n, a.u, a.c === undefined ? EST_.curso : a.c].concat(usados.map(function (k) {
      var v = a.v[P.cat[k].i];
      if (Array.isArray(v)) return v.join(', ');
      return v === null || v === undefined ? '' : v;
    })));
  });
  wa.views = [{ state: 'frozen', ySplit: 2 }];
  wa.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2 + Math.max(filas.length, 1), column: 3 + usados.length } };
  wa.getColumn(1).width = 34; wa.getColumn(2).width = 14; wa.getColumn(3).width = 14;
  for (var q = 0; q < usados.length; q++) wa.getColumn(4 + q).width = 22;

  return wb.xlsx.writeBuffer().then(function (buf) {
    estadDescargar_(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), estadNombreFichero_('xlsx'));
    return { ok: true };
  });
}
