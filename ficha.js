/* Arranque de la ficha de la web nueva (instrucción 136): lee de la carpeta privada solo el fichero que lleva a ese alumno (un trozo de su unidad, o del reparto de antiguos),
   lo dibuja con ficha-dibujo.js y mide cuánto tarda. Lee y, si la carpeta tiene las subcarpetas de peticiones (instrucción 139, ficha-escribir.js y escritura.js), también escribe notas, correcciones y marcas. Dirección: ficha.html?clave=…&curso=<curso escolar>&unidad=… (actuales) o ficha.html?clave=…&antiguo=1. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, B = window.FichaBase, D = window.FichaDibujo, X = window.EscrituraWeb, F = window.FichaEscribir;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var Q = new URLSearchParams(location.search);
  var CLAVE = Q.get('clave') || '', CURSO = Q.get('curso') || '', UNIDAD = Q.get('unidad') || '', ANTIGUO = Q.get('antiguo') === '1';
  var INDICE_FICHA = '_ficha-indice.json';

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  function noEsta(texto, urlApp) {
    var caja = $('ficha');
    caja.textContent = '';
    var q = B.h('div', 'aviso', [B.h('p', '', texto)]);
    if (urlApp && CLAVE) q.appendChild(B.h('p', '', [B.enlaceApp({ urlApp: urlApp, clave: CLAVE, antiguo: ANTIGUO }, 'Abrir su ficha en la app de hoy', '')]));
    caja.appendChild(q);
    caja.hidden = false;
    $('pruebas').hidden = true;
  }

  async function leerOpcional(nombre) { try { return await C.leerJson(nombre); } catch (e) { return null; } }

  async function cargar() {
    var buscador = await C.leerJson(C.INDICE);
    var urlApp = String(buscador.urlApp || '');
    var indice = await leerOpcional(INDICE_FICHA);
    if (!indice) { noEsta('Las fichas todavía no están preparadas: la aplicación las deja hechas en su vuelta de cada hora.', urlApp); return; }

    var fichero, estado = 'En marcha', hora = indice.hora;
    if (ANTIGUO) {
      if (!indice.antiguos) { noEsta('Los antiguos alumnos todavía no están preparados.', urlApp); return; }
      fichero = indice.antiguos.prefijo + B.trozo(CLAVE, indice.antiguos.trozos) + '.json';
      hora = indice.antiguos.hora || hora;
    } else {
      var g = (indice.grupos || []).filter(function (x) { return x.curso === CURSO && x.unidad === UNIDAD; })[0];
      if (!g) { noEsta('No encuentro esa unidad entre las fichas preparadas.', urlApp); return; }
      fichero = g.fichero; estado = g.estado || 'En marcha'; hora = g.hora || hora;
    }
    var datos = await leerOpcional(fichero);
    var registro = datos && datos.alumnos && datos.alumnos[CLAVE];
    if (!registro) { noEsta('No encuentro a ese alumno entre las fichas preparadas. Puede que haya llegado hace poco.', urlApp); return; }

    var ctx = {
      urlApp: urlApp, clave: CLAVE, antiguo: ANTIGUO, estado: estado, unido: !!indice.unido, nombres: indice.nombres || {},
      /* La situación familiar es reservada: su fichero solo se lee al abrir el candado y no se guarda en ninguna parte. */
      pedirSituacion: async function (id) {
        if (!indice.situacion) return { hayFichero: false };
        var f = await C.leerJson(indice.situacion.prefijo + B.trozo(id, indice.situacion.trozos) + '.json');
        if (!f.hayFichero) return { hayFichero: false };
        var r = (f.porId || {})[id] || ['', '', '', 0], una = function (clave, i) { return { trae: !!(f.cols || {})[clave], texto: r[i] }; };
        return { hayFichero: true, custodia: una('custodia', 0), familiaNumerosa: una('familia', 1), domicilio: una('domicilio', 2), avisoCustodia: !!r[3] };
      }
    };
    var caja = $('ficha');
    /* Instrucción 139: escribir desde aquí solo en un alumno actual de un curso que no está cerrado, y solo si la aplicación ha preparado las subcarpetas. Si no, la ficha sigue siendo de solo lectura. */
    var escribe = !ANTIGUO && estado !== 'Cerrado' && await X.preparar();
    var info = { clave: CLAVE, claveNotas: F.claveNotasDe(CLAVE), miCorreo: String(indice.miCorreo || ''), hora: hora };
    var control = null;
    function pintar() {
      var a = escribe ? F.superponer(registro, control.entradas(), info) : registro;
      caja.textContent = '';
      caja.appendChild(D.dibujar(a, ctx));
    }
    function decir(texto, error) {
      var linea = $('escritura');
      linea.textContent = texto || '';
      linea.className = 'estado-escritura' + (error ? ' estado-error' : '');
      linea.hidden = !texto;
    }
    if (escribe) {
      control = X.controlador({ alCambiar: pintar, alEstado: decir, alMedir: function (ms) { window.MedidasWeb.escribir(ms); } });
      ctx.escribir = {
        miCorreo: info.miCorreo, curso: CURSO, claveNotas: info.claveNotas, ui: { corregir: '', editarNota: '', borrador: '' }, aviso: decir, redibujar: pintar,
        pedir: function (funcion, args) { return control.pedir(funcion, args); },
        pedirCorreccion: function (a, cambios, motivo) { return control.pedir('webCorreccionGuardar', [CURSO, info.claveNotas, a.nombre, a.curso, cambios, motivo]); }
      };
      await control.cargar(hora);
    }
    caja.textContent = '';
    pintar();
    document.title = 'Ficha · ' + (registro.nombre || '');
    $('datos').textContent = E.lineaHora(hora);
    $('pruebas').hidden = true;
    caja.hidden = false;
    window.MedidasWeb.ficha(performance.now() - T0);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer la ficha. Puede que la aplicación todavía no la haya preparado.');
})();
