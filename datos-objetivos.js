/* Generado de JsQuienVieneObjetivos.html por web/construir-datos.mjs: no se toca a mano. */
/* Los seis grados que el servidor manda siempre en el panel (GRADOS_PANEL_ de Objetivos.gs). */
var GRADOS_PANEL_OBJETIVOS_ = ['1º', '2º', '3º', '4º', '1º BACH', '2º BACH'];

/* El día de hoy en el navegador (día natural, sin horas), como `aaaa-mm-dd`. */
function hoyObjetivos_() {
  var h = new Date();
  return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2);
}

/* Días de `a` a `b` (ambos `aaaa-mm-dd`); positivo si `b` es posterior. */
function diasEntreObjetivos_(a, b) {
  var pa = a.split('-'), pb = b.split('-');
  return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
}

function fechaLegibleObjetivos_(t) {
  var p = String(t || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
}

function pluralDias_(n) { return n + (n === 1 ? ' día' : ' días'); }
function faltanObjetivos_(n) { return n === 1 ? 'falta 1' : 'faltan ' + n; }
function quedanObjetivos_(n) { return n === 1 ? 'queda 1 por matricular' : 'quedan ' + n + ' por matricular'; }
function minusculaInicial_(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
function mayusculaInicial_(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

/* Las cifras vivas de una línea del panel, sacadas de la lista de esperados que hay en el navegador (así «No viene» las mueve al
   momento, sin esperar al servidor): matriculados, esperados (sin los «No viene») y matrícula provisional. */
function cifrasVivasPanel_(p, d) {
  var x = 0, y = 0, prov = 0;
  (d.esperados || []).forEach(function (e) {
    if (e.curso !== p.curso || e.noViene || e.estado === 'No viene') return;
    y++;
    if (e.estado === 'Matriculado') x++;
    if (e.estado === 'Matrícula provisional') prov++;
  });
  p.matriculados = x; p.esperados = y; p.provisionales = prov;
}

/* LA CUENTA (punto 3.3). Devuelve null si el curso no tiene objetivo; si no, {color, texto, M, P, O, fecha, fechaEsGeneral}.
   M = matriculados + «No esperados» matriculados; P = esperados que aún pueden llegar; O = objetivo; F = fecha propia o, si no, la general. */
function estadoObjetivo_(p, d, hoy) {
  if (p.objetivo === null || p.objetivo === undefined) return null;
  hoy = hoy || hoyObjetivos_();
  var M = p.matriculados + (p.noEsperadosMatriculados || 0), P = p.esperados - p.matriculados, O = p.objetivo;
  var general = (d.fechaGeneral && d.fechaGeneral.fecha) || '';
  var F = p.fechaPropia || general;
  var r = { M: M, P: P, O: O, fecha: F, fechaEsGeneral: !p.fechaPropia && !!general };
  var falta = O - M;
  var pasada = F ? diasEntreObjetivos_(F, hoy) : 0;   // días desde la fecha; > 0 = ya pasó
  if (M >= O) { r.color = 'verde'; r.texto = 'Objetivo alcanzado'; return r; }
  if (M + P < O) {
    r.color = 'rojo';
    r.texto = 'Ya no se puede llegar: ' + faltanObjetivos_(falta) + ' y ' + (P === 0 ? 'no queda nadie por matricular' : 'solo ' + quedanObjetivos_(P)) +
      (F && pasada > 0 ? ' · plazo cumplido' : '');
    return r;
  }
  if (F && pasada > 0) { r.color = 'rojo'; r.texto = 'Plazo cumplido hace ' + pluralDias_(pasada) + ': ' + faltanObjetivos_(falta); return r; }
  r.color = 'ambar';
  r.textoPartes = [mayusculaInicial_(faltanObjetivos_(falta)), quedanObjetivos_(P)];
  var dias = F ? -pasada : null;
  r.dias = dias === null ? '' : (dias === 0 ? 'termina hoy' : (dias === 1 ? 'queda 1 día' : 'quedan ' + dias + ' días'));
  r.texto = r.textoPartes.join(' · ') + (r.dias ? ' · ' + r.dias : '');
  return r;
}

/* Los cursos en rojo (con objetivo), en el orden del panel. */
function cursosEnRojoObjetivos_(d) {
  if (!d || !d.esPreparacion) return [];
  var salida = [];
  (d.panel || []).forEach(function (p) {
    cifrasVivasPanel_(p, d);
    var e = estadoObjetivo_(p, d);
    if (e && e.color === 'rojo') salida.push(p.curso);
  });
  return salida;
}

function unirCursosObjetivos_(c) {
  return c.length < 2 ? c.join('') : c.slice(0, -1).join(', ') + ' y ' + c[c.length - 1];
}

/* (Instrucción 104: la línea «Matrícula: 2º no llega al objetivo» de la portada antigua se quitó; «Hoy» ya dice qué cursos no llegan al mínimo, `atencionHoy_`.) */

/* «Cambiado por <Nombre>, hoy 10:32» (instrucción 66: las personas se nombran con el nombre de «Quién entra»). */
function tituloQuienCuando_(quien, cuando) {
  if (!quien && !cuando) return '';
  var f = (typeof cuandoCorto_ === 'function') ? cuandoCorto_(cuando) : '';
  return 'Cambiado por ' + (quien ? (typeof nombreDePersona_ === 'function' ? nombreDePersona_(quien) : quien) : '—') + (f ? ', ' + f : '');
}

/* La clave del dato, la misma que apunta el servidor (`CambiosReglas2.gs`): con ella se resalta lo que cambia otra persona. */
function datoObjetivo_(grado, campo) { return datoLimpio_('objetivo|' + CURSO_VISTO + '|' + grado + '|' + campo); }

/* Panel de avance en pantalla (punto 3.4): una línea por curso, a todo el ancho. */
function panelAvanceHtml_(d) {
  var hoy = hoyObjetivos_();
  var g = d.fechaGeneral || { fecha: '' };
  var cab = '<p class="obj-general">Fecha límite general: <span class="obj-edit' + (g.fecha ? '' : ' gris') + '" id="objGeneral" data-dato="' + datoObjetivo_('GENERAL', 'fecha') + '" title="' +
    escapaAtributo_(tituloQuienCuando_(g.quien, g.cuando)) + '" onclick="editarObjetivo_(this, \'GENERAL\', \'fecha\')">' +
    (g.fecha ? escapaHtml(fechaLegibleObjetivos_(g.fecha)) : 'Sin fecha') + '</span></p>';
  var filas = (d.panel || []).map(function (p) {
    cifrasVivasPanel_(p, d);
    var e = estadoObjetivo_(p, d, hoy);
    var curso = escapaAtributo_(p.curso);
    var celdaObjetivo, celdaEstado;
    if (!e) {
      celdaObjetivo = '<span class="obj-edit gris" data-dato="' + escapaHtml(datoObjetivo_(p.curso, 'objetivo')) + '" title="' + escapaAtributo_(tituloQuienCuando_(p.objetivoQuien, p.objetivoCuando)) +
        '" onclick="editarObjetivo_(this, \'' + curso + '\', \'objetivo\')">Sin objetivo</span>';
      celdaEstado = '';
    } else {
      var noEsp = p.noEsperadosMatriculados || 0;
      celdaObjetivo = '<span class="obj-edit" data-dato="' + escapaHtml(datoObjetivo_(p.curso, 'objetivo')) + '" title="' + escapaAtributo_(tituloQuienCuando_(p.objetivoQuien, p.objetivoCuando)) +
        '" onclick="editarObjetivo_(this, \'' + curso + '\', \'objetivo\')">' + e.M + ' de ' + e.O + '</span>' +
        (noEsp ? ' <a href="#" class="cifra-sobre" onclick="filtrarNoEsperadosPanel_(\'' + curso + '\');return false">(' + noEsp + ' no esperado' + (noEsp === 1 ? '' : 's') + ')</a>' : '');
      var texto = e.textoPartes
        ? escapaHtml(e.textoPartes[0]) + ' · <a href="#" onclick="filtrarPanelAvanceQuienViene_(\'' + curso + '\');return false">' + escapaHtml(e.textoPartes[1]) + '</a>' +
          (e.dias ? ' · ' + escapaHtml(e.dias) : '')
        : escapaHtml(e.texto);
      celdaEstado = '<span class="obj-estado ' + e.color + '" data-color="' + e.color + '">' + texto + '</span>';
    }
    var fechaP = p.fechaPropia || '';
    var fechaMostrada = fechaP || g.fecha || '';
    var celdaFecha = '<span class="obj-edit' + (fechaP ? '' : ' gris') + '" data-dato="' + escapaHtml(datoObjetivo_(p.curso, 'fecha')) + '" title="' + escapaAtributo_(fechaP ? tituloQuienCuando_(p.objetivoQuien, p.objetivoCuando) : '') +
      '" onclick="editarObjetivo_(this, \'' + curso + '\', \'fecha\')">' + (fechaMostrada ? escapaHtml(fechaLegibleObjetivos_(fechaMostrada)) : 'Sin fecha') + '</span>';
    return '<tr data-curso="' + escapaHtml(p.curso) + '"><td><a href="#" onclick="filtrarPanelAvanceQuienViene_(\'' + curso + '\');return false">' + escapaHtml(p.curso) + '</a></td>' +
      '<td>' + p.matriculados + ' matriculados de ' + p.esperados + ' esperados' + cifraProvisionalPanelHtml_(p) + cifrasSobresPanelHtml_(p, d) + '</td>' +
      '<td>' + celdaObjetivo + '</td><td>' + celdaEstado + '</td><td>' + celdaFecha + '</td></tr>';
  }).join('');
  return cab + '<table class="listado panel-objetivos"><thead><tr><th>Curso</th><th>Matrícula</th><th>Objetivo</th><th>Estado</th><th>Fecha límite</th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

/* Instrucción 103: los matriculados que no se esperaban se ven en Matrícula › Casos a mirar. */
function filtrarNoEsperadosPanel_(curso) {
  irAPaso_('matricula', 'casos');
}

/* ---------- Escribir en el sitio (punto 3.4) ---------- */

function lineaPanelObjetivos_(grado) {
  var d = QUIENVIENE_DATOS || {};
  return (d.panel || []).filter(function (p) { return p.curso === grado; })[0] || null;
}

function valorObjetivoActual_(grado, campo) {
  var d = QUIENVIENE_DATOS || {};
  if (grado === 'GENERAL') return (d.fechaGeneral && d.fechaGeneral.fecha) || '';
  var p = lineaPanelObjetivos_(grado);
  if (!p) return '';
  return campo === 'objetivo' ? (p.objetivo === null || p.objetivo === undefined ? '' : String(p.objetivo)) : (p.fechaPropia || '');
}

/* Convierte el dato en un campo ahí mismo. Intro o salir del campo guarda; Esc cancela; vacío borra. */
function editarObjetivo_(el, grado, campo) {
  if (el.querySelector('input')) return;
  var inp = document.createElement('input');
  inp.type = campo === 'fecha' ? 'date' : 'text';
  if (campo === 'objetivo') { inp.inputMode = 'numeric'; inp.maxLength = 4; inp.size = 5; }
  inp.className = 'obj-campo';
  inp.setAttribute('aria-label', campo === 'fecha' ? 'Fecha límite de ' + grado : 'Objetivo de ' + grado);
  var actual = valorObjetivoActual_(grado, campo);
  inp.value = actual;
  el.innerHTML = '';
  el.appendChild(inp);
  var fin = false;
  function terminar(guardar) {
    if (fin) return;
    fin = true;
    if (guardar && inp.value.trim() !== actual) guardarObjetivo_(grado, campo, inp.value.trim());
    else pintarPanelAvanceQuienViene_();
  }
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); terminar(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); terminar(false); }
  });
  inp.addEventListener('blur', function () { terminar(true); });
  inp.focus();
  if (inp.select) inp.select();
}

/* Guardar sin esperar, como «No viene»: cambia en pantalla al momento; si el servidor falla, se deshace y se avisa. */
function guardarObjetivo_(grado, campo, valor) {
  if (campo === 'objetivo' && valor !== '' && (!/^\d{1,4}$/.test(valor) || +valor < 1 || +valor > 999)) {
    avisar('El objetivo tiene que ser un número entero de 1 a 999.', 'error');
    pintarPanelAvanceQuienViene_();
    return;
  }
  limpiarAviso();
  var d = QUIENVIENE_DATOS;
  var destino = grado === 'GENERAL' ? (d.fechaGeneral = d.fechaGeneral || { fecha: '', quien: '', cuando: '' }) : lineaPanelObjetivos_(grado);
  if (!destino) return;
  var antes = JSON.stringify(destino);
  var ahora = new Date().toISOString();
  if (grado === 'GENERAL') { destino.fecha = valor; destino.quien = MI_CORREO; destino.cuando = ahora; }
  else if (campo === 'objetivo') { destino.objetivo = valor === '' ? null : +valor; destino.objetivoQuien = MI_CORREO; destino.objetivoCuando = ahora; }
  else { destino.fechaPropia = valor; destino.objetivoQuien = MI_CORREO; destino.objetivoCuando = ahora; }
  pintarQuienViene();
  var curso = CURSO_VISTO;
  llamar('webObjetivoGuardar', curso, grado, campo, valor).then(function (r) {
    if (!r || !r.quien) return;
    if (grado === 'GENERAL') { destino.quien = r.quien; destino.cuando = r.cuando; }
    else { destino.objetivoQuien = r.quien; destino.objetivoCuando = r.cuando; }
  }).catch(function (e) {
    var viejo = JSON.parse(antes);
    Object.keys(viejo).forEach(function (k) { destino[k] = viejo[k]; });
    if (curso === CURSO_VISTO) pintarQuienViene();
    avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error');
  });
}
