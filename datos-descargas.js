/* Generado de JsDescargas.html por web/construir-datos.mjs: no se toca a mano. */
function cargarDescargas() {
  var curso = CURSO_VISTO;
  llamar('webDescargasEstado', curso).then(function (d) {
    if (curso !== CURSO_VISTO) return;
    pintarFilasDescargas(d.filas);
    pintarExpedientes(d.expedientes);
    pintarFilasAdmision(d.admision || []);
    pintarFilasSobres(d.sobres || []);
    pintarFilasProvisionales(d.provisionales || []);
    pintarFilasPlanificacion(d.planificacion || []);
    pintarFilasResolucion_(d.resolucion);
    centroDatosDespuesDePintar_(d);   // instrucción 74: la frase de arriba y, una vez por sesión, coger lo nuevo
    aplicarFiltroDescargasTarea_(d);   // instrucción 55: el paso «Datos de Séneca» de una tarea enseña solo sus ficheros
  }).catch(function (e) { avisar('No he podido cargar las descargas. ' + mensajeDeError(e), 'error'); });

  llamar('webJefaturaYaImportada').then(function (yaImportado) {
    document.getElementById('tarjetaImportarJefatura').classList.toggle('oculto', !!yaImportado);
  }).catch(function () { /* si falla, se deja como estaba */ });
}

/* Botón de un solo uso (instrucción 12, punto 4.3): trae el reparto del
   Excel de Jefatura a la mesa como modelo definitivo, y desaparece. */
function importarJefatura() {
  if (!confirm('¿Traer el reparto de Jefatura de 26-27? Se crea un modelo "Jefatura 26-27" en ' +
    'cada curso; si un curso ya tiene un modelo definitivo, no se pisa: se crea sin marcar y se avisa.')) return;
  limpiarAviso();
  llamar('webJefaturaImportarExcel').then(function (r) {
    if (!r.ok) { avisar(r.motivo, 'error'); return; }
    var c = r.resultado.creados.map(function (x) { return x.curso; });
    var yaDef = r.resultado.yaDefinitivo.map(function (x) { return x.curso; });
    var texto = 'Reparto importado.';
    if (c.length) texto += ' Definitivo en: ' + c.join(', ') + '.';
    if (yaDef.length) texto += ' Ya tenían definitivo (no se ha pisado): ' + yaDef.join(', ') + '.';
    avisar(texto);
    document.getElementById('tarjetaImportarJefatura').classList.add('oculto');
  }).catch(function (e) { avisar('No he podido importar el reparto. ' + mensajeDeError(e), 'error'); });
}

function pintarFilasDescargas(filas) {
  var cuerpo = document.getElementById('filasDescargas');
  cuerpo.innerHTML = '';
  filas.forEach(function (f) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-clave', f.clave);

    var tdNombre = document.createElement('td');
    var punto = document.createElement('span');
    punto.className = 'punto ' + f.color;
    tdNombre.appendChild(punto);
    tdNombre.appendChild(document.createTextNode(f.nombre));
    tr.appendChild(tdNombre);

    var tdUso = document.createElement('td'); tdUso.textContent = f.paraQueSirve; tr.appendChild(tdUso);

    var tdDonde = document.createElement('td');
    var input = document.createElement('input');
    input.type = 'text'; input.value = f.dondeSeDescarga || '';
    input.placeholder = 'Todavía sin escribir';
    input.onchange = function () {
      llamar('webGuardarDondeDescarga', f.clave, input.value)
        .catch(function (e) { avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error'); });
    };
    tdDonde.appendChild(input);
    tr.appendChild(tdDonde);

    var tdFecha = document.createElement('td');
    tdFecha.textContent = f.fecha ? new Date(f.fecha).toLocaleDateString('es-ES') : 'No está.';
    if (f.centroDatos) {   // instrucción 74: lo vigente vino del Centro de datos
      var gris = document.createElement('div'); gris.className = 'del-centro-datos';
      gris.textContent = 'Del Centro de datos, ' + f.centroDatos.fecha + (f.centroDatos.quien ? ' · lo subió ' + f.centroDatos.quien : '');
      tdFecha.appendChild(gris);
    }
    tr.appendChild(tdFecha);

    cuerpo.appendChild(tr);
  });
}

function pintarFilasAdmision(lista) {
  var cuerpo = document.getElementById('filasAdmision');
  cuerpo.innerHTML = lista.length ? lista.map(function (f) {
    return '<tr><td><span class="punto ' + f.color + '"></span>' + escapaHtml(f.nombre) + grisCentroDatos_(f) + '</td>' +
      '<td>' + (f.tipo === 'ordinaria' ? 'Ordinaria' : 'Extraordinaria') + '</td>' +
      '<td>' + escapaHtml(f.grado || '—') + '</td>' +
      '<td>' + new Date(f.fecha).toLocaleDateString('es-ES') + '</td></tr>';
  }).join('') : '<tr><td colspan="4">Todavía no se ha soltado ninguna.</td></tr>';
}

function pintarFilasSobres(lista) {
  var cuerpo = document.getElementById('filasSobres');
  cuerpo.innerHTML = lista.length ? lista.map(function (f) {
    return '<tr><td><span class="punto ' + f.color + '"></span>' + escapaHtml(f.nombre) + grisCentroDatos_(f) + '</td>' +
      '<td>' + new Date(f.fecha).toLocaleDateString('es-ES') + '</td></tr>';
  }).join('') : '<tr><td colspan="2">Todavía no se ha soltado ninguno.</td></tr>';
}

function pintarFilasProvisionales(lista) {
  var cuerpo = document.getElementById('filasProvisionales');
  cuerpo.innerHTML = lista.length ? lista.map(function (f) {
    return '<tr><td><span class="punto ' + f.color + '"></span>' + escapaHtml(f.nombre) + grisCentroDatos_(f) + '</td>' +
      '<td>' + new Date(f.fecha).toLocaleDateString('es-ES') + '</td></tr>';
  }).join('') : '<tr><td colspan="2">Todavía no se ha soltado ninguno.</td></tr>';
}

function pintarFilasPlanificacion(lista) {
  var cuerpo = document.getElementById('filasPlanificacion');
  cuerpo.innerHTML = lista.length ? lista.map(function (f) {
    return '<tr><td><span class="punto ' + f.color + '"></span>' + escapaHtml(f.nombre) + grisCentroDatos_(f) + '</td>' +
      '<td>' + escapaHtml(f.nivel) + '</td>' +
      '<td>' + new Date(f.fecha).toLocaleDateString('es-ES') + '</td></tr>';
  }).join('') : '<tr><td colspan="3">Todavía no se ha soltado ninguno.</td></tr>';
}

function pintarExpedientes(exp) {
  var listaPri = document.getElementById('listaExpPrimaria');
  var listaSec = document.getElementById('listaExpSecundaria');
  listaPri.innerHTML = exp.primaria.length
    ? exp.primaria.map(function (e) { return '<li>' + escapaHtml(e.alumno) + ' — <code>' + escapaHtml(e.fichero) + '</code></li>'; }).join('')
    : '<li>Nadie lo necesita ahora mismo.</li>';
  listaSec.innerHTML = exp.secundaria.length
    ? exp.secundaria.map(function (e) { return '<li>' + escapaHtml(e.alumno) + ' — <code>' + escapaHtml(e.fichero) + '</code></li>'; }).join('')
    : '<li>Nadie lo necesita ahora mismo.</li>';
}

function prepararZonaArrastre() {
  var zona = document.getElementById('zonaArrastre');
  var input = document.getElementById('inputFicheros');
  if (zona.getAttribute('data-preparada')) return;   // iniciar() puede repetirse (asistente de puesta en marcha)
  zona.setAttribute('data-preparada', '1');

  ['dragenter', 'dragover'].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('encima'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('encima'); });
  });
  zona.addEventListener('drop', function (e) {
    subirFicheros(e.dataTransfer.files);
  });
  input.addEventListener('change', function () {
    subirFicheros(input.files);
    input.value = '';
  });
}

function subirFicheros(lista) {
  var ficheros = Array.prototype.slice.call(lista);
  if (!ficheros.length) return;
  var curso = CURSO_VISTO;
  ficheros.forEach(function (f) { clasificarFichero_(f, curso); });
}

/* Instrucción 41 (docs/SOBRES-INCOMPLETOS.md, punto 3.1): los ficheros de «Planificación de matrículas» no tienen un nombre
   conocido (Francisco no les cambia el nombre): se reconocen por sus cabeceras, y la tabla de abajo pide el nivel de cada
   uno antes de guardar. Los demás CSV siguen igual. Los nombres de siempre se saltan la pregunta al servidor. */
var PLANIF_PENDIENTES_ = [];
var NOMBRES_CONOCIDOS_ = /^(RegAlum|RegAluNEE|MatOMC|RegDetExpEle|RegRelSol|RegSol|SolicitudesTelematicas|RegMatPro|Planificacion \[)/i;

function bytesABase64_(bytes) {
  var binario = '';
  var PASO = 0x8000;
  for (var i = 0; i < bytes.length; i += PASO) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + PASO));
  }
  return btoa(binario);
}

function clasificarFichero_(file, curso) {
  /* Instrucción 42: un PDF es la resolución de admisión; se lee en el navegador (JsResolucionPdf.html). */
  if (/\.pdf$/i.test(file.name)) { procesarPdfResolucion_(file, curso); return; }
  if (!/\.csv$/i.test(file.name) || NOMBRES_CONOCIDOS_.test(file.name)) { subirUnFichero(file, curso); return; }
  file.slice(0, 60000).arrayBuffer().then(function (buf) {
    return llamar('webPlanificacionDetectar', curso, file.name, bytesABase64_(new Uint8Array(buf)));
  }).then(function (r) {
    if (!r || !r.esPlanificacion) { subirUnFichero(file, curso); return; }
    PLANIF_PENDIENTES_ = PLANIF_PENDIENTES_.filter(function (p) { return p.file.name !== file.name; });
    PLANIF_PENDIENTES_.push({ file: file, curso: curso, niveles: r.niveles || [], tipo: r.tipo, solicitudes: r.solicitudes,
      elegido: r.nivelPropuesto || '' });
    pintarPlanificacionPendiente_();
  }).catch(function () { subirUnFichero(file, curso); });   // si la pregunta falla, se sube como cualquier otro (el servidor dirá si no lo conoce)
}

function pintarPlanificacionPendiente_() {
  var caja = document.getElementById('tarjetaPlanificacionPendiente');
  caja.classList.toggle('oculto', !PLANIF_PENDIENTES_.length);
  document.getElementById('filasPlanificacionPendiente').innerHTML = PLANIF_PENDIENTES_.map(function (p, i) {
    var opciones = (p.elegido ? '' : '<option value="">— elige el nivel —</option>') + p.niveles.map(function (n) {
      return '<option value="' + escapaAtributo_(n) + '"' + (n === p.elegido ? ' selected' : '') + '>' + escapaHtml(n) + '</option>';
    }).join('');
    return '<tr><td>' + escapaHtml(p.file.name) + '</td><td>' + escapaHtml(p.tipo || '') + '</td><td>' + (p.solicitudes || 0) + '</td>' +
      '<td><select onchange="elegirNivelPlanificacion_(' + i + ', this.value)">' + opciones + '</select></td></tr>';
  }).join('');
  actualizarBotonPlanificacion_();
}

function actualizarBotonPlanificacion_() {
  var todos = PLANIF_PENDIENTES_.length > 0 && PLANIF_PENDIENTES_.every(function (p) { return !!p.elegido; });
  var boton = document.getElementById('botonGuardarPlanificacion');
  boton.disabled = !todos;
  document.getElementById('avisoPlanificacionPendiente').textContent = PLANIF_PENDIENTES_.some(function (p) { return !p.niveles.length; })
    ? 'No hay niveles que ofrecer: hace falta un curso en preparación con esperados.' : '';
}

function elegirNivelPlanificacion_(i, valor) {
  if (PLANIF_PENDIENTES_[i]) PLANIF_PENDIENTES_[i].elegido = valor;
  actualizarBotonPlanificacion_();
}

/* Un solo botón para todos: sube cada fichero con el nivel elegido (el nombre propio con el nivel lo pone el servidor). */
function guardarPlanificacionPendiente_() {
  var lista = PLANIF_PENDIENTES_.slice();
  if (!lista.length || lista.some(function (p) { return !p.elegido; })) return;
  PLANIF_PENDIENTES_ = [];
  pintarPlanificacionPendiente_();
  lista.forEach(function (p) { subirUnFichero(p.file, p.curso, p.elegido); });
}

function lineaSubida(nombre) {
  var div = document.createElement('div');
  div.className = 'linea';
  div.textContent = nombre + ': subiendo…';
  document.getElementById('listaSubidas').prepend(div);
  return div;
}

/* Trocea en base64 (90.000 caracteres, el mismo margen que ya usa el resto
   del proyecto para CacheService) y sube cada trozo por su cuenta, en
   orden, con dos reintentos si alguno falla. Nunca se lee el fichero como
   texto: siempre como bytes, para no tocar la codificación cp1252 de los
   CSV de Séneca (punto 3.1). */
var TAMANO_TROZO_SUBIDA = 90000;

function subirUnFichero(file, curso, nivelIndicado, extra) {
  var linea = (extra && extra.linea) || lineaSubida(file.name);
  /* Instrucción 16, punto 3.1: si es una solicitud de admisión ordinaria sin
     grado en el nombre, se pregunta ANTES de empezar a subir nada. Instrucción 41:
     una planificación de matrícula ya trae el nivel elegido en la tabla (va en el
     mismo argumento que el grado: solo uno de los dos aplica a cada fichero). */
  (nivelIndicado ? Promise.resolve(nivelIndicado) : preguntarGradoAdmisionSiHaceFalta_(file.name, curso)).then(function (gradoIndicado) {
    return file.arrayBuffer().then(function (buf) {
      var b64 = bytesABase64_(new Uint8Array(buf));
      var total = Math.max(1, Math.ceil(b64.length / TAMANO_TROZO_SUBIDA));
      var idSubida = 'su_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      var cadena = Promise.resolve(null);
      for (var t = 0; t < total; t++) {
        (function (indice) {
          var trozo = b64.slice(indice * TAMANO_TROZO_SUBIDA, (indice + 1) * TAMANO_TROZO_SUBIDA);
          cadena = cadena.then(function () {
            linea.textContent = file.name + ': subiendo (' + (indice + 1) + '/' + total + ')…';
            return llamarConReintento('webSubirTrozo', idSubida, curso, file.name, indice, total, trozo, gradoIndicado);
          });
        })(t);
      }
      return cadena;
    });
  }).then(function (resultado) {
    if (!resultado) return;
    if (resultado.reconocido && resultado.guardado) {
      linea.className = (extra && extra.rojo) ? 'linea mal' : 'linea ok';
      linea.textContent = file.name + ': guardado.' + (extra && extra.texto ? ' ' + extra.texto : '') +
        (resultado.sobres !== undefined ? ' ' + resultado.sobres + ' sobres leídos.' : '') +
        (resultado.provisionales !== undefined ? ' ' + resultado.provisionales + ' matrículas provisionales leídas.' : '') +
        (resultado.planificacion !== undefined ? ' ' + resultado.planificacion + ' solicitudes de planificación leídas.' : '') +
        (resultado.actualizacion ? ' La actualización ha arrancado sola.' : '');
      if (resultado.actualizacion && PESTANA_ACTUAL === 'portada') cargarPortada();
    } else if (resultado.avisoCursoDistinto) {
      linea.className = 'linea mal';
      linea.textContent = file.name + ': ' + resultado.motivo;
    } else if (!resultado.reconocido) {
      linea.className = 'linea mal';
      linea.textContent = file.name + ': ' + (resultado.motivo || 'no lo reconozco.') +
        (resultado.sugerencia ? ' ¿Quizá querías decir "' + resultado.sugerencia + '"?' : '');
    } else if (resultado.motivo) {
      linea.className = 'linea mal';
      linea.textContent = file.name + ': ' + resultado.motivo;
    }
    if (PESTANA_ACTUAL === 'descargas') cargarDescargas();
    if (PESTANA_ACTUAL === 'quienviene') cargarQuienViene();
  }).catch(function (e) {
    linea.className = 'linea mal';
    linea.textContent = file.name + ': no he podido subirlo (' + mensajeDeError(e) + ').';
  });
}

/* Dos reintentos antes de rendirse: un trozo suelto que falla por un corte
   de red no debería tirar la subida entera del fichero. */
function llamarConReintento(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  var intentos = 0;
  function intentar() {
    intentos++;
    return llamar.apply(null, [fn].concat(args)).catch(function (e) {
      if (intentos >= 3) throw e;
      return new Promise(function (r) { setTimeout(r, 1000); }).then(intentar);
    });
  }
  return intentar();
}

function abrirCurso(curso) {
  if (!confirm('¿Abrir el curso ' + curso + '? Se crea su cuaderno de datos y su carpeta de Drive, vacíos.')) return;
  limpiarAviso();
  llamar('webAbrirCurso', curso).then(function () {
    return llamar('webEstado');
  }).then(function (r) {
    ESTADO = r;
    pintarSelectores();
    pintarPortada();
    avisar('Curso ' + curso + ' abierto, en preparación.');
  }).catch(function (e) { avisar('No he podido abrir el curso. ' + mensajeDeError(e), 'error'); });
}

function pasarAEnMarcha(curso) {
  if (!confirm('¿Pasar el curso ' + curso + ' a "en marcha"? No cierra ningún otro curso.')) return;
  limpiarAviso();
  llamar('webPasarAEnMarcha', curso).then(function () {
    return llamar('webEstado');
  }).then(function (r) {
    ESTADO = r;
    pintarSelectores();
    pintarPortada();
    avisar('Curso ' + curso + ' en marcha.');
  }).catch(function (e) { avisar('No he podido cambiar el curso. ' + mensajeDeError(e), 'error'); });
}

function cerrarCurso(curso, confirmarCierre) {
  limpiarAviso();
  llamar('webCerrarCurso', curso, confirmarCierre).then(function (r) {
    if (!r.ok) {
      var lista = '<ul class="pendientes">' + r.pendientes.map(function (p) { return '<li>' + escapaHtml(p) + '</li>'; }).join('') + '</ul>';
      document.getElementById('mensajes').innerHTML =
        '<div class="aviso">Antes de cerrar el curso ' + escapaHtml(curso) + ', esto queda pendiente:' + lista +
        '<button onclick="cerrarCurso(\'' + curso + '\', true)">Cerrar de todas formas</button></div>';
      return;
    }
    return llamar('webEstado').then(function (r2) {
      ESTADO = r2;
      pintarSelectores();
      pintarPortada();
      avisar('Curso ' + curso + ' cerrado.');
    });
  }).catch(function (e) { avisar('No he podido cerrar el curso. ' + mensajeDeError(e), 'error'); });
}

/* El desplegable "¿de qué curso es este listado?" (punto 3.1): antes de subir
   un fichero de admisión ordinaria cuyo nombre no dice el grado. Se pregunta
   una sola vez por fichero: la respuesta se recuerda en el cuaderno del
   curso (Admision.gs), no aquí. */
var GRADO_ADMISION_PENDIENTE_ = null;

function preguntarGradoAdmisionSiHaceFalta_(nombreFichero, curso) {
  return llamar('webAdmisionGradoNecesario', curso, nombreFichero).then(function (r) {
    if (!r.necesitaGrado) return '';
    return new Promise(function (resolve) {
      GRADO_ADMISION_PENDIENTE_ = resolve;
      document.getElementById('nombreFicheroGrado').textContent = nombreFichero;
      document.getElementById('selGradoAdmision').innerHTML = r.opciones.map(function (o) {
        return '<option value="' + escapaAtributo_(o) + '">' + escapaHtml(o) + '</option>';
      }).join('');
      document.getElementById('modalGradoAdmision').classList.remove('oculto');
    });
  });
}

function confirmarGradoAdmision_() {
  var grado = document.getElementById('selGradoAdmision').value;
  document.getElementById('modalGradoAdmision').classList.add('oculto');
  if (GRADO_ADMISION_PENDIENTE_) GRADO_ADMISION_PENDIENTE_(grado);
  GRADO_ADMISION_PENDIENTE_ = null;
}

function cerrarModalGrado_() {
  document.getElementById('modalGradoAdmision').classList.add('oculto');
  /* Cancelar sin elegir: sigue sin grado. El servidor lo rechaza con un
     aviso claro (guardarDescargaEnCurso_) en vez de guardarlo mal. */
  if (GRADO_ADMISION_PENDIENTE_) GRADO_ADMISION_PENDIENTE_('');
  GRADO_ADMISION_PENDIENTE_ = null;
}
