/* Generado de JsEstadisticasZonas.html por web/construir-estadisticas.mjs: no se toca a mano. */
function estadAbrirPop_(ancla, html) {
  var pop = document.getElementById('estPop');
  pop.innerHTML = html; pop.classList.remove('oculto');
  EST_.pop = html ? 'abierta' : ''; EST_.ancla = ancla;
  var r = ancla.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  var x = Math.min(r.left, window.innerWidth - w - 16), y = r.bottom + 4;
  if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 4);
  pop.style.left = Math.max(16, x) + 'px'; pop.style.top = y + 'px';
  var p = pop.querySelector('input[type=text],select,button.op');
  if (p) p.focus();
}

function estadCerrarPop_() {
  var pop = document.getElementById('estPop');
  if (!pop) return;
  pop.classList.add('oculto'); pop.innerHTML = ''; EST_.pop = ''; EST_.ancla = null;
}

function estadListaCampos_(titulo, accion, soloNumero) {
  var h = '<h4>' + titulo + '</h4>', ap = '';
  EST_.P.lista.forEach(function (c) {
    if (soloNumero && c.tipo !== 'numero') return;
    if (c.apartado !== ap) { ap = c.apartado; h += '<div class="est-ap">' + escapaHtml(ap) + '</div>'; }
    h += '<button class="op" data-est-' + accion + '="' + estAttr(c.clave) + '">' + escapaHtml(c.etiqueta) + '</button>';
  });
  return h;
}

/* Todos los valores que tiene un dato en el curso, en su orden natural. */
function estadValoresDe_(clave) {
  var campo = estCampo_(clave), vistos = {}, out = [];
  if (clave === 'cursoEscolar' && (EST_.def.conjunto === 'alumnado' || estadEsOtro_(EST_.def.conjunto))) return EST_.cursos.filter(function (c) { return EST_.def.conjunto === 'alumnado' || c.tipo === 'cuaderno'; }).map(function (c) { return c.curso; });   // los que se pueden traer, no solo los ya traídos
  EST_.P.alumnos.forEach(function (a) { estadEtiquetasDe(EST_.P, a, clave).forEach(function (e) { if (!vistos[e]) { vistos[e] = true; out.push(e); } }); });
  return out.sort(function (a, b) { return estadComparar(campo, a, b); });
}

function estadVentanaFiltro_(ancla, clave) {
  var campo = estCampo_(clave), act = EST_.def.filtros[clave], valores = estadValoresDe_(clave);
  var porCurso = clave === 'cursoEscolar' && (EST_.def.conjunto === 'alumnado' || estadEsOtro_(EST_.def.conjunto));
  if (porCurso && !act) act = [CURSO_VISTO];   // sin nada elegido entra solo el curso de arriba
  var h = '<h4>' + escapaHtml(campo.etiqueta) + ': a quién se incluye</h4>';
  if (valores.length > 12) h += '<div class="lin"><input type="text" id="estFiltroBuscar" placeholder="Buscar un valor" autocomplete="off"></div>';
  h += '<div class="est-valores">';
  valores.forEach(function (v) {
    var nota = porCurso ? (EST_.cursos.filter(function (c) { return c.curso === v; })[0] || {}).tipo === 'historial' ? ' <small>historial de Séneca</small>' : '' : '';
    h += '<label class="v"><input type="checkbox" value="' + estAttr(v) + '"' + (!act || act.indexOf(v) !== -1 ? ' checked' : '') + '> ' + escapaHtml(v) + nota + '</label>';
  });
  h += '</div><div class="pieb"><span><button class="peq" data-est-todos="1">Todos</button> · <button class="peq" data-est-todos="0">Ninguno</button></span><button class="destacado" data-est-aplica-filtro="' + estAttr(clave) + '">Aplicar</button></div>';
  estadAbrirPop_(ancla, h);
}

function estadVentanaCalculo_(ancla, indice) {
  var c = indice >= 0 ? EST_.def.calculos[indice] : { tipo: 'alumnos', dato: '', valor: '', etiqueta: '' };
  var materias = EST_.def.conjunto === 'materias';
  var cuenta = { solicitudes: 'Número de solicitudes', esperados: 'Número de alumnos esperados', transito: 'Número de fichas' }[EST_.def.conjunto];
  var tipos = (materias ? [['alumnos', 'Número de materias'], ['distintos', 'Número de alumnos distintos']] : [['alumnos', cuenta || 'Número de alumnos']]).concat([['cumplen', 'Número de alumnos que cumplen una condición'], ['porcentaje', 'Porcentaje que cumple una condición'], ['media', 'Media de un dato'], ['suma', 'Suma de un dato']]);
  var h = '<h4>' + (indice >= 0 ? 'Cambiar el cálculo' : 'Añadir un cálculo') + '</h4><div class="lin"><select id="estCTipo">' +
    tipos.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === c.tipo ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
    '<select id="estCCampo" class="oculto"></select><select id="estCValor" class="oculto"></select>' +
    '<input type="text" id="estCEtiqueta" placeholder="Título de la columna (si no, se pone solo)" value="' + estAttr(c.etiqueta || '') + '"></div>' +
    '<div class="pieb"><span></span><button class="destacado" data-est-guarda-calc="' + indice + '">' + (indice >= 0 ? 'Cambiar' : 'Añadir') + '</button></div>';
  estadAbrirPop_(ancla, h);
  EST_.calcEdit = c;
  estadAjustarCalculo_();
}

function estadAjustarCalculo_() {
  var t = document.getElementById('estCTipo').value, cc = document.getElementById('estCCampo'), cv = document.getElementById('estCValor');
  var numero = t === 'media' || t === 'suma', condicion = t === 'cumplen' || t === 'porcentaje';
  cc.classList.toggle('oculto', t === 'alumnos' || t === 'distintos'); cv.classList.toggle('oculto', !condicion);
  if (t === 'alumnos' || t === 'distintos') return;
  var antes = cc.value || EST_.calcEdit.dato;
  cc.innerHTML = EST_.P.lista.filter(function (f) { return numero ? f.tipo === 'numero' : true; }).map(function (f) { return '<option value="' + estAttr(f.clave) + '">' + escapaHtml(f.etiqueta) + '</option>'; }).join('');
  if (antes && cc.querySelector('option[value="' + antes.replace(/"/g, '\\"') + '"]')) cc.value = antes;
  if (condicion) {
    var previo = cv.value || EST_.calcEdit.valor;
    cv.innerHTML = estadValoresDe_(cc.value).map(function (v) { return '<option value="' + estAttr(v) + '">' + escapaHtml(v) + '</option>'; }).join('');
    if (previo && Array.prototype.some.call(cv.options, function (o) { return o.value === previo; })) cv.value = previo;
  }
}

/* ---------------------------------------------------------------- lo que se pulsa */

function estadClic_(ev) {
  var fa = ev.target.closest('[data-est-ficha]');
  if (fa) { abrirFicha(fa.getAttribute('data-est-ficha')); return; }   // la ficha de siempre, encima: esta pantalla no se toca
  var b = ev.target.closest('button');
  if (!b) return;
  var d = b.dataset, def = EST_.def;
  if (b.id === 'estGuardar') { estadVentanaGuardar_(b, ''); return; }
  if (b.id === 'estBorrar') { estadVentanaBorrar_(b); return; }
  if (b.id === 'estPdf') { estadExportar_('pdf', b); return; }
  if (b.id === 'estExcel') { estadExportar_('excel', b); return; }
  if (!EST_.P) return;
  if (d.estF !== undefined) { estadAbrirLista_(+d.estF, +d.estC); return; }
  if (d.estCierraCajon) { estadCerrarLista_(); return; }
  if (d.estCopiar) { estadCopiarLista_(); return; }
  if (d.estVista) { EST_.vista = d.estVista; estadPintarGrafico_(); return; }
  if (d.estCampo) {
    var k = d.estCampo;
    estadAbrirPop_(b, '<h4>' + escapaHtml(estCampo_(k).etiqueta) + '</h4><button class="op" data-est-a-fila="' + estAttr(k) + '">Agrupar en filas</button><button class="op" data-est-a-col="' + estAttr(k) +
      '">Cruzar en columnas</button><button class="op" data-est-a-filtro="' + estAttr(k) + '">Elegir a quién se incluye</button>');
    return;
  }
  if (d.estMas === 'fila') { estadAbrirPop_(b, estadListaCampos_('Agrupar en filas por…', 'a-fila')); return; }
  if (d.estMas === 'col') { estadAbrirPop_(b, estadListaCampos_('Cruzar en columnas con…', 'a-col')); return; }
  if (d.estMas === 'filtro') { estadAbrirPop_(b, estadListaCampos_('Elegir a quién se incluye según…', 'a-filtro')); return; }
  if (d.estMas === 'calc') { estadVentanaCalculo_(b, -1); return; }
  if (d.estEditaCalc !== undefined) { estadVentanaCalculo_(b, +d.estEditaCalc); return; }
  if (d.estAFila) { if (def.filas.indexOf(d.estAFila) === -1) def.filas.push(d.estAFila); if (def.columna === d.estAFila) def.columna = ''; estadCerrarPop_(); estadOrdenPorDefecto_(); estadCambiaDef_(); return; }
  if (d.estACol) { def.columna = d.estACol; def.filas = def.filas.filter(function (x) { return x !== d.estACol; }); estadCerrarPop_(); estadOrdenPorDefecto_(); estadCambiaDef_(); return; }
  if (d.estAFiltro) { estadVentanaFiltro_(document.querySelector('#estFiltros .est-mas') || b, d.estAFiltro); return; }
  if (d.estFiltro) { estadVentanaFiltro_(b, d.estFiltro); return; }
  if (d.estTodos) { document.querySelectorAll('#estPop .est-valores input[type=checkbox]').forEach(function (c) { if (!c.closest('label').hidden) c.checked = d.estTodos === '1'; }); return; }
  if (d.estAplicaFiltro) {
    var marcas = document.querySelectorAll('#estPop .est-valores input[type=checkbox]'), sel = [];
    marcas.forEach(function (c) { if (c.checked) sel.push(c.value); });
    if (!sel.length) { estadTostada_('Marca al menos un valor.'); return; }
    var soloArriba = d.estAplicaFiltro === 'cursoEscolar' && def.conjunto !== 'materias' && sel.length === 1 && sel[0] === CURSO_VISTO;   // equivale a no elegir ninguno
    if (soloArriba || (sel.length === marcas.length && !(d.estAplicaFiltro === 'cursoEscolar' && def.conjunto !== 'materias'))) delete def.filtros[d.estAplicaFiltro]; else def.filtros[d.estAplicaFiltro] = sel;
    estadCerrarPop_(); estadCambiaDef_(); return;
  }
  if (d.estGuardaCalc !== undefined) { estadGuardarCalculo_(+d.estGuardaCalc); return; }
  if (d.estQuitaFila !== undefined) { def.filas.splice(+d.estQuitaFila, 1); estadOrdenPorDefecto_(); estadCambiaDef_(); return; }
  if (d.estSubeFila !== undefined) { var i = +d.estSubeFila, x = def.filas[i]; def.filas[i] = def.filas[i - 1]; def.filas[i - 1] = x; estadCambiaDef_(); return; }
  if (d.estQuitaCol) { def.columna = ''; estadOrdenPorDefecto_(); estadCambiaDef_(); return; }
  if (d.estQuitaCalc !== undefined) { def.calculos.splice(+d.estQuitaCalc, 1); estadOrdenPorDefecto_(); estadCambiaDef_(); return; }
  if (d.estQuitaFiltro) { delete def.filtros[d.estQuitaFiltro]; estadCambiaDef_(); return; }
  if (d.estOrden !== undefined) {
    var ci = +d.estOrden;
    def.orden = def.orden.columna === ci ? { columna: ci, sentido: -def.orden.sentido } : { columna: ci, sentido: ci < 0 ? 1 : -1 };
    estadCerrarLista_(); EST_.res = null; estadPintarTabla_(); return;
  }
  if (d.estGuardaNombre !== undefined) { estadGuardar_(d.estGuardaNombre === 'sustituir'); return; }
  if (d.estOtroNombre) { estadVentanaGuardar_(document.getElementById('estGuardar'), document.getElementById('estNombreNuevo').value); return; }
  if (d.estBorraSi) { estadBorrar_(); return; }
  if (d.estCierra) { estadCerrarPop_(); return; }
}

function estadOrdenPorDefecto_() { EST_.def.orden = { columna: -1, sentido: 1 }; }

function estadCambio_(ev) {
  var e = ev.target;
  if (e.id === 'estConjunto') { estadCambiaConjunto_(e.value); return; }
  if (e.id === 'estGCalc') { EST_.def.grafico.calculo = +e.value; estadPintarGrafico_(); estadPintarConsultas_(); return; }
  if (e.id === 'estGTipo') { EST_.def.grafico.tipo = e.value; estadPintarGrafico_(); estadPintarConsultas_(); return; }
  if (e.id === 'estGPdf') { EST_.def.grafico.enPdf = e.checked; estadPintarConsultas_(); return; }
  if (e.id === 'estConsulta') { estadCerrarLista_(); estadAbrirConsulta_(e.value); estadAsegurarYPintar_(); return; }
  if (e.id === 'estOrdenCol') { estadCerrarLista_(); EST_.def.orden.columna = +e.value; estadPintarTabla_(); return; }
  if (e.id === 'estOrdenDir') { estadCerrarLista_(); EST_.def.orden.sentido = +e.value; estadPintarTabla_(); return; }
  if (e.id === 'estCTipo' || e.id === 'estCCampo') estadAjustarCalculo_();
}

document.addEventListener('input', function (ev) {
  if (!ev.target || ev.target.id !== 'estFiltroBuscar') return;
  var q = estSinTildes_(ev.target.value.trim());
  document.querySelectorAll('#estPop .est-valores label').forEach(function (l) { l.hidden = !!q && estSinTildes_(l.textContent).indexOf(q) === -1; });
});

function estadGuardarCalculo_(indice) {
  var t = document.getElementById('estCTipo').value, c = { tipo: t, dato: '', valor: '', etiqueta: document.getElementById('estCEtiqueta').value.trim() };
  if (t !== 'alumnos' && t !== 'distintos') c.dato = document.getElementById('estCCampo').value;
  if (t === 'cumplen' || t === 'porcentaje') c.valor = document.getElementById('estCValor').value;
  if (indice >= 0) EST_.def.calculos[indice] = c; else EST_.def.calculos.push(c);
  estadCerrarPop_(); estadCambiaDef_();
}



function estadVentanaGuardar_(ancla, nombre, mensaje, botones) {
  var h = '<h4>Guardar esta consulta</h4><div class="lin"><input type="text" id="estNombreNuevo" maxlength="80" placeholder="Nombre de la consulta" value="' + estAttr(nombre || '') + '"></div>' +
    (mensaje ? '<p class="est-msg">' + escapaHtml(mensaje) + '</p>' : '') + '<div class="pieb"><button class="peq" data-est-cierra="1">Cancelar</button>' + (botones || '<button class="destacado" data-est-guarda-nombre="nuevo">Guardar</button>') + '</div>';
  estadAbrirPop_(ancla, h);
}

function estadGuardar_(sustituir) {
  var nombre = document.getElementById('estNombreNuevo').value.replace(/\s+/g, ' ').trim();
  if (!nombre) { estadTostada_('Escribe un nombre para la consulta.'); return; }
  var ancla = document.getElementById('estGuardar');
  llamar('webEstadisticasGuardar', nombre, JSON.parse(JSON.stringify(EST_.def)), sustituir === true).then(function (r) {
    if (r && r.ok) {
      EST_.consultas = r.consultas; EST_.idConsulta = r.id;
      delete MEMORIA_[EST_MEMORIA_CONSULTAS_ + JSON.stringify([CURSO_VISTO])];
      estadCerrarPop_(); estadPintarConsultas_(); estadTostada_('Consulta guardada: «' + nombre + '».');
      return;
    }
    var motivo = r && r.motivo;
    if (motivo === 'existe-propia') estadVentanaGuardar_(ancla, nombre, 'Ya tienes una consulta con ese nombre. ¿La sustituyo por esta?', '<button class="peq" data-est-otro-nombre="1">Otro nombre</button><button class="destacado" data-est-guarda-nombre="sustituir">Sustituir</button>');
    else if (motivo === 'existe-base') estadVentanaGuardar_(ancla, nombre, 'Ese nombre es de una de las consultas que trae el programa. Elige otro.');
    else estadVentanaGuardar_(ancla, nombre, 'Ese nombre es de una consulta de otra persona. Elige otro.');
  }).catch(function (e) {
    estadVentanaGuardar_(ancla, nombre, 'No se ha guardado. ' + mensajeDeError(e));
  });
}

function estadVentanaBorrar_(ancla) {
  var c = estadConsulta_(EST_.idConsulta);
  if (!c) return;
  estadAbrirPop_(ancla, '<h4>¿Borrar la consulta «' + escapaHtml(c.nombre) + '»?</h4><p class="est-msg">La verán borrada todas las personas que entran.</p><div class="pieb"><button class="peq" data-est-cierra="1">Cancelar</button><button class="destacado" data-est-borra-si="1">Borrar</button></div>');
}

function estadBorrar_() {
  var c = estadConsulta_(EST_.idConsulta);
  if (!c) return;
  llamar('webEstadisticasBorrar', c.id).then(function (r) {
    EST_.consultas = (r && r.consultas) || EST_.consultas;
    delete MEMORIA_[EST_MEMORIA_CONSULTAS_ + JSON.stringify([CURSO_VISTO])];
    estadCerrarPop_();
    estadAbrirConsulta_(EST_.consultas[0] ? EST_.consultas[0].id : '');
    estadAsegurarYPintar_();   // instrucción 139: la consulta que se abre pasa por `estadLimpiarDefinicion` (le pone el gráfico); pintar a pelo fallaba con «Cannot read properties of undefined (reading 'calculo')» aunque se había borrado
    estadTostada_('Consulta borrada.');
  }).catch(function (e) { estadCerrarPop_(); estadTostada_('No se ha borrado. ' + mensajeDeError(e)); });
}
