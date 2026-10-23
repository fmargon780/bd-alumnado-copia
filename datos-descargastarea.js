/* Generado de JsDescargasTarea.html por web/construir-datos.mjs: no se toca a mano. */
var DESCARGAS_TAREA_ = '';

/* Qué tarjeta de Descargas lleva cada fichero de grupo (los de la lista fija van por su fila). */
var GRUPO_DE_FICHERO_ = {
  admision_ordinaria: 'admision', admision_extraordinaria: 'admision', resolucion_admision: 'resolucion', sobres_matricula: 'sobres',
  provisionales_matricula: 'provisionales', planificacion: 'planificacion', primaria: 'expedientes', secundaria: 'expedientes'
};

function diasDesde_(iso, hoy) { return iso ? Math.max(0, diasEntreObjetivos_(String(iso).slice(0, 10), hoy)) : null; }

/* Los ficheros que existen de una clave: [{ nombre, fecha }]. Los expedientes no tienen fecha: dicen quién los necesita. */
function ficherosDeClave_(d, k) {
  var fijo = (d.filas || []).filter(function (f) { return f.clave === k; })[0];
  if (fijo) return fijo.fecha ? [{ nombre: fijo.nombre, fecha: fijo.fecha }] : [];
  if (k === 'admision_ordinaria' || k === 'admision_extraordinaria') {
    return (d.admision || []).filter(function (f) { return (f.tipo === 'ordinaria') === (k === 'admision_ordinaria'); }).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; });
  }
  if (k === 'resolucion_admision') return ((d.resolucion && d.resolucion.ficheros) || []).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; });
  if (k === 'sobres_matricula') return (d.sobres || []).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; });
  if (k === 'provisionales_matricula') return (d.provisionales || []).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; });
  if (k === 'planificacion') return (d.planificacion || []).map(function (f) { return { nombre: f.nombre, fecha: f.fecha }; });
  return [];
}

function nombreAmable_(k, d) {
  var fijo = (d.filas || []).filter(function (f) { return f.clave === k; })[0];
  if (fijo) return fijo.nombre;
  return ({ admision_ordinaria: 'Solicitudes de admisión', admision_extraordinaria: 'Solicitudes de admisión', resolucion_admision: 'Resolución de admisión (PDF)', sobres_matricula: 'Sobres de matrícula',
    provisionales_matricula: 'Matrícula provisional de 2º de Bachillerato', planificacion: 'Planificación de matrícula', primaria: 'Expedientes de Primaria', secundaria: 'Expedientes de Secundaria' })[k] || k;
}

/* La tabla del servidor, con las dos solicitudes de admisión contadas como una sola exigencia (basta con una de las dos). */
function exigenciasDeTarea_(t) {
  var salida = [], solicitudes = false;
  t.claves.forEach(function (k) {
    if (k === 'admision_ordinaria' || k === 'admision_extraordinaria') { if (!solicitudes) { salida.push(['admision_ordinaria', 'admision_extraordinaria']); solicitudes = true; } return; }
    salida.push([k]);
  });
  return salida;
}

function estadoDatosDeTarea_(tarea, c) {
  var d = c.desc;
  if (!d) return { s: 'falta', texto: 'Trayendo los ficheros…' };
  var t = d.tareas && d.tareas[tarea];
  if (!t) return { s: 'hecho' };
  var faltan = [], antiguos = [];
  exigenciasDeTarea_(t).forEach(function (grupo) {
    var existentes = [];
    grupo.forEach(function (k) { existentes = existentes.concat(ficherosDeClave_(d, k)); });
    var esExpediente = grupo.length === 1 && GRUPO_DE_FICHERO_[grupo[0]] === 'expedientes';
    if (esExpediente) {
      var nec = (grupo[0] === 'primaria' ? (d.expedientes && d.expedientes.primaria) : (d.expedientes && d.expedientes.secundaria)) || [];
      if (nec.length) faltan.push(nombreAmable_(grupo[0], d) + ' (' + nec.length + ')');
      return;
    }
    if (!existentes.length) { faltan.push(nombreAmable_(grupo[0], d)); return; }
    existentes.forEach(function (f) {
      var dias = diasDesde_(f.fecha, c.hoy);
      if (dias !== null && dias > t.antiguoDias) antiguos.push(f.nombre + ' (de hace ' + pluralDias_(dias) + ')');
    });
  });
  if (faltan.length) return { s: 'falta', n: faltan.length, texto: 'Falta: ' + faltan.join(', ') };
  if (antiguos.length) return { s: 'falta', n: antiguos.length, texto: 'Antiguo: ' + antiguos.slice(0, 2).join(', ') + (antiguos.length > 2 ? '…' : '') };
  return { s: 'hecho', texto: 'Al día' };
}

/* Deja a la vista solo lo de la tarea (o todo, si no hay tarea). Se llama al pintar Descargas. */
function aplicarFiltroDescargasTarea_(d) {
  var tareas = d && d.tareas;
  var t = (DESCARGAS_TAREA_ && tareas) ? tareas[DESCARGAS_TAREA_] : null;
  var claves = t ? t.claves : null;
  var grupos = {};
  if (claves) claves.forEach(function (k) { grupos[GRUPO_DE_FICHERO_[k] || 'fija'] = true; });
  document.querySelectorAll('#tab-descargas [data-grupo]').forEach(function (tarjeta) {
    var g = tarjeta.getAttribute('data-grupo');
    tarjeta.classList.toggle('oculto-tarea', !!claves && g !== 'zona' && !grupos[g]);
  });
  document.querySelectorAll('#filasDescargas tr[data-clave]').forEach(function (tr) {
    tr.classList.toggle('oculto-tarea', !!claves && claves.indexOf(tr.getAttribute('data-clave')) === -1);
  });
  var aviso = document.getElementById('descargasDeTarea');
  if (aviso) aviso.classList.toggle('oculto', !claves);
}

/* El avance de «Actualizar los datos» junto al botón principal del paso (se llama desde pintarActualizacion). */
function avanceActualizacionTarea_(a, esEnMarcha) {
  var el = document.getElementById('avancePasoTarea');
  if (!el) return;
  el.textContent = (esEnMarcha && a && a.enCurso) ? 'Actualizando' + (a.fase ? ' (' + a.fase + ')' : '') + '…' : '';
}
