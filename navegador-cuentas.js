/* Las cuentas hechas en este ordenador para una pantalla (instrucción 171: el listado, «Revisión», «Estadísticas» y la ficha). Sale primero lo de siempre (el fichero que deja Google); después la página, con la carpeta «CENTRO DE DATOS»
   (que se elige una vez y se recuerda), hace las cuentas con los ficheros de Séneca y cambia lo que se ve por lo calculado aquí, con la hora de Séneca arriba. Si algo falla, o no hay carpeta, o el navegador no puede, se queda lo de siempre
   y no molesta. No guarda nada de alumnos en el ordenador. Interruptor de una línea (`ACTIVADO`): con `true` se hacen las cuentas aquí para todos y `?navegador=0` las apaga en esa visita; con `false` solo se hacen con `?navegador=1`.
   Instrucción 171, parte «quitar el parámetro»: el cambio está preparado y probado en los dos modos; se pone en `true` cuando Francisco haya medido cuánto tardan en su Chromebook. */
(function () {
  'use strict';
  var G = window, $ = function (id) { return document.getElementById(id); };
  var ACTIVADO = false;   // ← el interruptor: `true` quita la necesidad del parámetro (ver arriba)
  var PROGRAMA = ['centro-datos-web.js', 'cuentas-mundo.js', 'cuentas-programa.js', 'cuentas-web.js', 'cuentas-carga.js'];
  var CLAVE_AHORA_NO = 'bdAlumnado_cuentasAhoraNo';   // en la sesión de esta pestaña: «Ahora no» no vuelve a preguntar hasta cerrarla

  /* ¿Hay que hacer las cuentas aquí? Con `?navegador=0` nunca; con `?navegador=1` siempre que se pueda; sin parámetro, según el interruptor ACTIVADO. `busqueda` es la dirección tal como estaba al cargar el programa de la página (el menú la cambia después).
     Si el navegador no sabe abrir carpetas, no. */
  function debeArrancar(busqueda) {
    if (/[?&]navegador=0(&|$)/.test(busqueda || '')) return false;
    if (!ACTIVADO && !/[?&]navegador=1(&|$)/.test(busqueda || '')) return false;
    if (typeof G.showDirectoryPicker !== 'function') return false;
    try { if (G.sessionStorage.getItem(CLAVE_AHORA_NO)) return false; } catch (e) { /* sin sessionStorage, se pregunta */ }
    return true;
  }

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script'); s.src = src;
      s.onload = function () { ok(); }; s.onerror = function () { mal(new Error('No he podido cargar ' + src + '.')); };
      document.head.appendChild(s);
    });
  }
  async function cargarPrograma() { for (var i = 0; i < PROGRAMA.length; i++) await cargarScript(PROGRAMA[i]); }
  /* El recuadro solo se ve cuando hay algo que decir o que pulsar; si no, las cuentas se hacen sin ruido. El texto se pone siempre. */
  function estado(texto, error, ver) { var e = $('estadoCuentas'); e.textContent = texto || ''; e.className = 'suave' + (error ? ' estado-error' : ''); e.hidden = !texto; $('cuentasNavegador').hidden = !ver; }

  /* `o`: { privada (CarpetaWeb), curso, quiere: ['listado'] | ['revision'] | ['estadisticas'] | ['ficha'], clave (para la ficha), usar(resultado, línea de arriba) (cambia la pantalla, o lanza un error), lineaHora(iso) }. */
  async function arrancar(o) {
    estado('', false, false);
    var tPrograma = performance.now();
    try { await cargarPrograma(); } catch (e) { return; }   // sin el programa, se queda lo de siempre
    tPrograma = performance.now() - tPrograma;   // bajar y preparar el programa de las cuentas
    var C = G.CentroDatosWeb;
    var r = await C.recordada();
    if (r.estado !== 'abierta') {
      estado('Para ver los datos de Séneca al momento, elige una vez la carpeta CENTRO DE DATOS. Mientras tanto ves los de la última puesta al día.', false, true);
      $('elegirCentro').hidden = false; $('ahoraNo').hidden = false;
      $('elegirCentro').textContent = r.estado === 'permiso' ? 'Dar permiso a la carpeta CENTRO DE DATOS' : 'Elegir la carpeta CENTRO DE DATOS';
      var sigue = await new Promise(function (listo) {
        $('ahoraNo').onclick = function () { try { G.sessionStorage.setItem(CLAVE_AHORA_NO, '1'); } catch (e) { /* se preguntará la próxima vez */ } listo(false); };
        $('elegirCentro').onclick = async function () {
          if (await C.conectar(r)) listo(true); else estado('Esa carpeta no es la del Centro de datos. Prueba otra vez.', true, true);
        };
      });
      $('elegirCentro').hidden = true; $('ahoraNo').hidden = true;
      if (!sigue) { estado('', false, false); return; }
    }
    var T_TODO = performance.now();   // desde que hay carpeta: leer los ficheros y calcular. Con el programa, es lo que tarda (la meta es 3 segundos); no cuenta lo que se espera a que alguien pulse el botón
    estado('Calculando con los ficheros de Séneca…', false, false);
    try {
      var res = await G.CuentasCarga.cargar({ centro: C, privada: o.privada, datosCentro: { nombre: '', codigo: '' }, quiere: o.quiere, clave: o.clave });
      if (!res.ok || o.quiere.some(function (q) { return !res[q]; })) throw new Error('Las cuentas no han terminado bien.');
      if (o.curso !== res.curso) throw new Error('Este curso no se calcula aquí: se ven los datos de la última puesta al día.');
      o.usar(res, o.lineaHora(res.hora).replace(/^Datos/, 'Datos de Séneca'));
      var ms = Math.round(tPrograma + performance.now() - T_TODO);
      var versionPie = $('version');
      if (versionPie) versionPie.textContent += ' · cuentas aquí ' + ms + ' ms';   // la medida, sin molestar
      /* Solo se ve el recuadro si hay algo que la persona deba saber. */
      var avisos = [];
      if (res.sinExpedientes) avisos.push('faltan los expedientes de Primaria y Secundaria');
      if (res.faltan.length) avisos.push('faltan datos que deja la aplicación (' + res.faltan.length + ')');
      if (ms > 3000) avisos.push('ha tardado más de 3 segundos (' + Math.round(ms / 100) / 10 + ' s)');
      estado(avisos.length ? 'Datos de Séneca al momento, pero ' + avisos.join(' y ') + ': puede que algo no coincida con lo de siempre.' : 'Datos de Séneca al momento (' + ms + ' ms).', false, avisos.length > 0);
      /* Solo cifras, para que Google compare (comprobación `navegador-cuentas-igual`). Si no se puede escribir, no pasa nada. */
      try { await o.privada.escribirJson('_navegador-cuentas.json', { formato: 1, hora: new Date().toISOString(), version: res.version, curso: res.curso, horaSeneca: res.hora, sinExpedientes: res.sinExpedientes, faltan: res.faltan, ms: ms, resumen: res.resumen }); } catch (e) { /* sin él, la comprobación espera */ }
      return res;
    } catch (e) { estado('', false, false); }   // se queda lo de siempre, sin ruido
  }

  G.NavegadorCuentas = { arrancar: arrancar, debeArrancar: debeArrancar, PROGRAMA: PROGRAMA, activado: function () { return ACTIVADO; } };
})();
