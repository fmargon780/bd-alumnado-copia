/* Las cuentas hechas en este ordenador para una pantalla (instrucción 171, tramos 6 y 8: el listado y «Revisión»). Solo se activa con `?navegador=1` en la dirección (en pruebas: solo quien lo pide). Primero sale lo de siempre (el fichero que deja Google); después, con la carpeta «CENTRO DE DATOS»
   (que se elige una vez y se recuerda), la página hace las cuentas con los ficheros de Séneca y cambia lo que se ve por lo calculado aquí, con la hora de Séneca arriba. Si algo falla, se queda lo de siempre y lo dice. No guarda nada de alumnos en el ordenador. */
(function () {
  'use strict';
  var G = window, $ = function (id) { return document.getElementById(id); };
  var PROGRAMA = ['centro-datos-web.js', 'cuentas-mundo.js', 'cuentas-programa.js', 'cuentas-web.js', 'cuentas-carga.js'];

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script'); s.src = src;
      s.onload = function () { ok(); }; s.onerror = function () { mal(new Error('No he podido cargar ' + src + '.')); };
      document.head.appendChild(s);
    });
  }
  async function cargarPrograma() { for (var i = 0; i < PROGRAMA.length; i++) await cargarScript(PROGRAMA[i]); }
  function estado(texto, error) { var e = $('estadoCuentas'); e.textContent = texto || ''; e.className = 'suave' + (error ? ' estado-error' : ''); e.hidden = !texto; }

  /* `o`: { privada (CarpetaWeb), curso, quiere: ['listado'] | ['revision'], usar(resultado) (cambia la pantalla y da la línea de arriba, o lanza un error), lineaHora(iso) }. */
  async function arrancar(o) {
    $('cuentasNavegador').hidden = false;
    estado('Preparando las cuentas en este ordenador…');
    try { await cargarPrograma(); } catch (e) { estado(e.message, true); return; }
    var C = G.CentroDatosWeb;
    var r = await C.recordada();
    if (r.estado !== 'abierta') {
      estado('Para calcular aquí hace falta la carpeta CENTRO DE DATOS.');
      $('elegirCentro').hidden = false;
      $('elegirCentro').textContent = r.estado === 'permiso' ? 'Dar permiso a la carpeta CENTRO DE DATOS' : 'Elegir la carpeta CENTRO DE DATOS';
      await new Promise(function (listo) {
        $('elegirCentro').onclick = async function () {
          if (await C.conectar(r)) { $('elegirCentro').hidden = true; listo(); } else estado('Esa carpeta no es la del Centro de datos. Prueba otra vez.', true);
        };
      });
    }
    estado('Calculando con los ficheros de Séneca…');
    try {
      var t0 = performance.now();
      var res = await G.CuentasCarga.cargar({ centro: C, privada: o.privada, datosCentro: { nombre: '', codigo: '' }, quiere: o.quiere });
      if (!res.ok || o.quiere.some(function (q) { return !res[q]; })) throw new Error('Las cuentas no han terminado bien. Se queda lo de siempre.');
      if (o.curso !== res.curso) throw new Error('Este ordenador solo calcula el curso en marcha (' + res.curso + '). Se queda lo de siempre.');
      o.usar(res, o.lineaHora(res.hora).replace(/^Datos/, 'Datos de Séneca') + ' · calculados en este ordenador');
      var avisos = [];
      if (res.sinExpedientes) avisos.push('sin los expedientes de Primaria y Secundaria'); else avisos.push('con ' + res.expedientes.primaria + ' expedientes de Primaria y ' + res.expedientes.secundaria + ' de Secundaria');
      if (res.faltan.length) avisos.push('sin ' + res.faltan.length + ' pestañas del cuaderno que deja Google (' + res.faltan.join(', ') + ')');
      estado('Calculado en este ordenador en ' + Math.round(performance.now() - t0) + ' ms' + (avisos.length ? ', ' + avisos.join(' y ') : '') + '.');
      /* Solo cifras, para que Google compare (comprobación `navegador-cuentas-igual`). Si no se puede escribir, no pasa nada. */
      try { await o.privada.escribirJson('_navegador-cuentas.json', { formato: 1, hora: new Date().toISOString(), version: res.version, curso: res.curso, horaSeneca: res.hora, sinExpedientes: res.sinExpedientes, faltan: res.faltan, resumen: res.resumen }); } catch (e) { /* sin él, la comprobación espera */ }
      return res;
    } catch (e) { estado((e && e.message) || 'No he podido calcular aquí. Se queda lo de siempre.', true); }
  }

  G.NavegadorCuentas = { arrancar: arrancar, PROGRAMA: PROGRAMA };
})();
