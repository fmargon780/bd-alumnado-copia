/* Cómo entra una página de la web nueva a la carpeta privada (instrucciones 135 y 136): recuerda la carpeta elegida, pide permiso o pide elegirla, y solo si es la buena llama a `cargar()`.
   Es común al buscador (arranque.js) y a la ficha (ficha.js): cada página pone su propia carga. Solo lee (las medidas de tiempo las guarda medidas.js). */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var DESDE_DISCO = location.protocol === 'file:';
  var $ = function (id) { return document.getElementById(id); };

  function dosCifras(n) { return String(n).padStart(2, '0'); }
  /* «Datos de las 10:32»; si son de otro día, «Datos de ayer, 18:05» o la fecha corta. */
  function lineaHora(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var hoy = new Date(), ayer = new Date(hoy.getTime() - 86400000);
    var mismo = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    var hm = dosCifras(d.getHours()) + ':' + dosCifras(d.getMinutes());
    if (mismo(d, hoy)) return 'Datos de las ' + hm;
    if (mismo(d, ayer)) return 'Datos de ayer, ' + hm;
    return 'Datos del ' + d.getDate() + '/' + (d.getMonth() + 1) + ', ' + hm;
  }

  function problema(texto) { $('problema').textContent = texto; $('problema').hidden = !texto; }

  /* cargar(): promesa que lee y pinta; si falla, el texto de su error (o `textoError`) sale como problema. */
  function empezar(cargar, textoError) {
    async function usar(handle) {
      if (!(await C.abrir(handle))) {
        problema(DESDE_DISCO ? 'En este ordenador no encuentro esa carpeta. Para usar la copia hace falta Google Drive para ordenador.' : 'Esa carpeta no es la buena.');
        return false;
      }
      problema('');
      document.dispatchEvent(new Event('web-carpeta-lista'));   // instrucción 149: el menú (menu.js) lee entonces las tareas en marcha y el estado de los pasos
      try { await C.guardada(handle); } catch (e) { /* sin recordarla: se pedirá otra vez */ }
      try { await cargar(); } catch (e) { problema((e && e.message) || textoError); return false; }
      return true;
    }
    function pedirElegir() {
      $('pedir').hidden = false;
      $('elegir').onclick = async function () {
        var h;
        try { h = await window.showDirectoryPicker({ id: 'bd-web-pagina', mode: 'readwrite' }); } catch (e) { return; }
        await usar(h);
      };
    }
    async function arrancar() {
      if (typeof window.showDirectoryPicker !== 'function') { problema('Este navegador no puede abrir la carpeta: hace falta Google Chrome.'); return; }
      var h = null;
      try { h = await C.guardada(); } catch (e) { h = null; }
      if (!h) { pedirElegir(); return; }
      var permiso = 'prompt';
      try { permiso = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { permiso = 'prompt'; }
      if (permiso === 'granted' && (await usar(h))) return;
      $('pedir').hidden = false;
      $('elegir').textContent = permiso === 'granted' ? 'Elegir la carpeta' : 'Dar permiso';
      $('elegir').onclick = async function () {
        var r = 'denied';
        if (permiso !== 'granted') { try { r = await h.requestPermission({ mode: 'readwrite' }); } catch (e) { r = 'denied'; } if (r === 'granted' && (await usar(h))) return; }
        var n;
        try { n = await window.showDirectoryPicker({ id: 'bd-web-pagina', mode: 'readwrite' }); } catch (e) { return; }
        await usar(n);
      };
    }
    return arrancar();
  }

  window.EntrarWeb = { empezar: empezar, lineaHora: lineaHora, problema: problema, DESDE_DISCO: DESDE_DISCO };
})();
