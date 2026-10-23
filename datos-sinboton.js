/* Generado de JsSinBoton.html por web/construir-datos.mjs: no se toca a mano. */
var PANTALLA_ = { hay: false, nueva: false, latidoCaido: false, web: '', subirAqui: { admision: true, planificacion: true } };
var FALTA_FICHERO_ = false;

function pantallaNueva_() { return !!PANTALLA_.nueva; }

/* Lo que sale en lugar de «Pulsa "Actualizar los datos"» cuando las pantallas son las nuevas. `minuscula`: va después de dos puntos. */
function fraseDatos_(vieja, minuscula) {
  if (!pantallaNueva_()) return vieja;
  var t = FALTA_FICHERO_ ? 'Falta un fichero: míralo en «Datos de Séneca».' : 'Se rellenará solo cuando lleguen los datos.';
  return minuscula ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

function mostrarOculto_(id, ver) { var el = document.getElementById(id); if (el) el.classList.toggle('oculto', !ver); }

/* Se llama con lo que traen `webPortada` y `webDescargasEstado` (puede venir vacío). Pone o quita cada pieza. */
function aplicarPantalla_(p) {
  if (p) {
    PANTALLA_.hay = !!p.hay; PANTALLA_.nueva = !!p.nueva; PANTALLA_.latidoCaido = !!p.latidoCaido;
    if (p.web !== undefined) PANTALLA_.web = p.web || '';
    if (p.subirAqui) PANTALLA_.subirAqui = p.subirAqui;
  }
  var nueva = pantallaNueva_(), gestiona = typeof esQuienGestiona_ === 'function' ? esQuienGestiona_() : true;
  mostrarOculto_('botonActualizar', !nueva);
  mostrarOculto_('enlaceRehacer', !nueva);
  var zona = document.querySelector('#tab-descargas [data-grupo="zona"]');
  if (zona) zona.classList.toggle('oculto', nueva);
  mostrarOculto_('rehacerFicheros', nueva && gestiona && !DESCARGAS_TAREA_);
  mostrarOculto_('subirAquiAdmision', nueva && gestiona && !!PANTALLA_.subirAqui.admision);
  mostrarOculto_('subirAquiPlanificacion', nueva && gestiona && !!PANTALLA_.subirAqui.planificacion);
  mostrarOculto_('leerPdfResolucion', nueva && gestiona);
  mostrarOculto_('notaExpedientesCD', nueva);
  if (typeof pintarLineaDatos_ === 'function') pintarLineaDatos_();
  if (typeof pintarCabeceraTarea_ === 'function' && typeof PESTANA_ACTUAL !== 'undefined' && PESTANA_ACTUAL !== 'hoy') pintarCabeceraTarea_(PESTANA_ACTUAL);   // el botón principal del paso cambia de texto
}

function abrirCentroDatos_() { if (PANTALLA_.web) window.open(PANTALLA_.web, '_blank', 'noopener'); }

/* «Subir aquí»: el selector de ficheros y el camino de siempre (clasificarFichero_, JsDescargas.html), con su pregunta de curso. */
function subirAquiElegir_(tipo) {
  var input = document.createElement('input');
  input.type = 'file'; input.multiple = true; input.accept = '.csv';
  input.onchange = function () { Array.prototype.forEach.call(input.files, function (f) { clasificarFichero_(f, CURSO_VISTO); }); };
  input.click();
}

/* «Leer el PDF de la resolución»: se elige el PDF, lo lee el navegador como hoy y, al guardarlo con su nombre propio, el servidor deja una copia en el Centro de datos. */
function leerPdfResolucion_() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.pdf,application/pdf';
  input.onchange = function () { if (input.files[0]) procesarPdfResolucion_(input.files[0], CURSO_VISTO); };
  input.click();
}

/* «Rehacer todo desde cero» (solo quien gestiona; el servidor lo rechaza a los demás): olvida lo leído, las huellas y las marcas, y pone la marca «hay algo nuevo» para que se rehaga ya. */
function rehacerTodoNuevo_() {
  if (!confirm('¿Rehacer todo desde cero? Olvida lo que la app tenía guardado de la última vez y vuelve a leer y escribir todo: tarda más que una actualización normal.')) return;
  limpiarAviso();
  llamar('webRehacerTodo').then(function (r) {
    if (r && r.ok === false) { avisar(r.motivo || 'No he podido rehacerlo ahora.', 'error'); return; }
    avisar('Hecho. En unos minutos la app lo rehace sola.', 'aviso aviso-verde');
  }).catch(function (e) { avisar('No he podido pedirlo. ' + mensajeDeError(e), 'error'); });
}
