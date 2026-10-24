/* El menú de la web nueva (instrucción 149): ordenado por las tareas del curso, como la app de hoy (docs/WEB-NUEVA-6-MENU-POR-TAREAS.md).
   Fila de arriba, a todo el ancho: a la izquierda Inicio y las seis tareas (las de esta época, resaltadas); a la derecha, la caja de buscar alumno, Listados, Estadísticas y Configuración.
   Segunda fila, solo dentro de una tarea (`?tarea=…&paso=…` en la dirección): sus pasos numerados y, al lado, cómo van (los mismos estados que «Inicio»).
   Se pinta en el elemento `#menu` de cada página; la página actual se marca con `data-pagina="<fichero>"` en `body`. Las cuentas son las de hoy-base.js (HoyBase): qué tareas están en marcha y el estado de cada paso.
   La lista de tareas y de pasos sale sola (sin datos); lo que depende de las fechas y de los datos se pone cuando la carpeta privada está abierta. */
(function () {
  'use strict';
  var B = window.HoyBase, C = window.CarpetaWeb;
  var caja = document.getElementById('menu');
  if (!caja || !B) return;
  var actual = document.body.getAttribute('data-pagina') || '';
  var Q = new URLSearchParams(location.search);
  var TAREA = Q.get('tarea') || '', PASO = Q.get('paso') || '';
  if (!B.TAREAS.some(function (t) { return t.clave === TAREA; })) { TAREA = ''; PASO = ''; }
  var ESTADOS = { hecho: ['✓', 'Hecho'], toca: ['▶', 'Toca ahora'], pendiente: ['○', 'Pendiente'], nohace: ['—', 'No hace falta'] };
  var INDICE = '_hoy-indice.json';

  /* Las direcciones de antes (una por pantalla) llevan a la tarea y el paso que enseñaban. */
  var ANTIGUAS = { 'quienviene.html': 'admision/resolucion', 'revision.html': 'inicio/avisos', 'mesa.html': 'agrupamiento/mesa', 'documentos.html': 'inicio/documentos', 'transito.html': 'transito/tutores' };
  if (!TAREA && ANTIGUAS[actual]) {
    var d = ANTIGUAS[actual].split('/');
    location.replace(actual + '?tarea=' + d[0] + '&paso=' + d[1]);
    return;
  }

  function el(tipo, clase, texto) { var x = document.createElement(tipo); if (clase) x.className = clase; if (texto !== undefined) x.textContent = texto; return x; }
  function enlace(texto, href, clase) { var x = el('a', clase, texto); x.href = href; return x; }

  /* ---- Fila de arriba ---- */
  var izq = el('div', 'menu-izq'), dcha = el('div', 'menu-dcha');
  izq.appendChild(enlace('Inicio', 'hoy.html', actual === 'hoy.html' ? 'actual' : ''));
  var enlacesTarea = {};
  B.TAREAS.forEach(function (t) {
    var a = enlace(t.nombre, B.direccionTarea(t.clave), 'tarea' + (t.clave === TAREA ? ' actual' : ''));
    a.setAttribute('data-tarea', t.clave);
    enlacesTarea[t.clave] = a;
    izq.appendChild(a);
  });
  var buscar = el('div', 'menu-buscar');
  var entrada = el('input'); entrada.type = 'search'; entrada.id = 'menuBuscar'; entrada.placeholder = 'Buscar alumno'; entrada.autocomplete = 'off'; entrada.setAttribute('aria-label', 'Buscar alumno');
  var resultados = el('div', 'menu-resultados'); resultados.hidden = true;
  buscar.appendChild(entrada); buscar.appendChild(resultados);
  dcha.appendChild(buscar);
  dcha.appendChild(enlace('Listados', 'listado.html', actual === 'listado.html' ? 'actual' : ''));
  dcha.appendChild(enlace('Estadísticas', 'estadisticas.html', actual === 'estadisticas.html' ? 'actual' : ''));
  dcha.appendChild(enlace('Configuración', 'datos.html', actual === 'datos.html' && !TAREA ? 'actual' : ''));
  caja.textContent = '';
  caja.appendChild(izq); caja.appendChild(dcha);
  if (window.MenuBuscador) window.MenuBuscador.montar(buscar);

  /* ---- Segunda fila: los pasos de la tarea ---- */
  var filaPasos = null, enlacesPaso = {}, ESTADOS_ACTUALES = {}, CENTRO = undefined;
  function nombreDeTarea() { return B.TAREAS.filter(function (t) { return t.clave === TAREA; })[0].nombre; }

  /* El título de la página dice dónde estás: «Matrícula › A quién llamar». */
  function titular() {
    var h1 = document.querySelector('header h1'), p = B.pasosDeTarea({ centro: CENTRO }, TAREA).filter(function (x) { return x.clave === PASO; })[0];
    var texto = nombreDeTarea() + (p ? ' › ' + p.etiqueta : '');
    if (h1) h1.textContent = texto;
    document.title = texto;
  }

  /* `estados`: { clavePaso: { s, n, texto } } (vacío hasta que llegan los datos). */
  function pintarPasos(estados) {
    if (!filaPasos) {
      filaPasos = el('nav', 'menu-pasos'); filaPasos.id = 'menuPasos'; filaPasos.setAttribute('aria-label', 'Pasos de la tarea');
      caja.parentNode.insertBefore(filaPasos, caja.nextSibling);
    }
    filaPasos.textContent = '';
    enlacesPaso = {};
    filaPasos.appendChild(el('b', 'menu-tarea', nombreDeTarea()));
    B.pasosDeTarea({ centro: CENTRO }, TAREA).forEach(function (p, i) {
      var a = enlace('', B.direccionPaso(TAREA, p.clave), 'paso' + (p.clave === PASO ? ' actual' : ''));
      a.setAttribute('data-paso', p.clave);
      a.appendChild(el('span', 'num', (i + 1) + '.'));
      a.appendChild(document.createTextNode(' ' + p.etiqueta));
      var e = estados[p.clave];
      if (e) {
        var chip = el('span', 'est e-' + e.s, ESTADOS[e.s][0] + (e.n ? ' ' + e.n : ''));
        chip.title = e.texto || ESTADOS[e.s][1];
        a.appendChild(document.createTextNode(' ')); a.appendChild(chip);
      }
      filaPasos.appendChild(a);
      enlacesPaso[p.clave] = a;
    });
  }

  /* Pulsar un paso que esta misma pantalla sabe enseñar no recarga la página: la pantalla pone `window.MenuPasoEnSitio = function (tarea, paso)`, que devuelve true si lo ha enseñado ella. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('#menuPasos a[data-paso]') : null;
    if (!a || typeof window.MenuPasoEnSitio !== 'function' || ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    var paso = a.getAttribute('data-paso');
    if (window.MenuPasoEnSitio(TAREA, paso)) { ev.preventDefault(); irA(TAREA, paso); }
  });

  function recordarPaso() {
    try { if (PASO && window.localStorage) window.localStorage.setItem('bd-paso-' + TAREA, PASO); } catch (e) { /* sin recordar el paso */ }
  }

  if (TAREA) { pintarPasos({}); titular(); recordarPaso(); }

  /* Una pantalla que cambia de paso sin recargar (un enlace de una cifra a otro paso, por ejemplo) lo dice aquí: se marcan la tarea y el paso, se cambia la dirección (recargar abre el mismo sitio) y el título. */
  function irA(tarea, paso) {
    if (!B.TAREAS.some(function (t) { return t.clave === tarea; })) {
      if (tarea === 'datos' && window.history && history.replaceState) history.replaceState(null, '', 'datos.html?paso=' + paso);   // los apartados de Configuración
      return;
    }
    var cambiaTarea = tarea !== TAREA;
    TAREA = tarea; PASO = paso;
    Object.keys(enlacesTarea).forEach(function (k) { enlacesTarea[k].classList.toggle('actual', k === TAREA); });
    pintarPasos(cambiaTarea ? {} : ESTADOS_ACTUALES);
    titular(); recordarPaso();
    if (window.history && history.pushState) history.pushState(null, '', B.direccionPaso(TAREA, PASO));
    if (cambiaTarea) { ESTADOS_ACTUALES = {}; cargarEstados(); }
  }

  /* ---- Lo que depende de los datos: tareas resaltadas y estado de los pasos ---- */
  var yaIniciado = false, M = null, IND_HOY = null;
  async function cargarEstados() {
    if (!TAREA || !M) return;
    var tarea = TAREA, hoy = B.hoyIso(), curso;
    try { curso = B.cursoDeTarea(M, tarea, hoy); } catch (e) { return; }
    var f = (IND_HOY.cursos || []).filter(function (c) { return c.curso === curso; })[0];
    if (!f) return;
    if (!M.datos[curso] || !M.datos[curso].qv) { try { M.datos[curso] = (await C.leerJson(f.fichero)).lecturas || {}; } catch (e) { return; } }
    if (tarea !== TAREA) return;   // mientras tanto se cambió de tarea
    var estados = {};
    B.estadoPasosDe(M, tarea, curso, hoy).forEach(function (r) { estados[r.paso.clave] = { s: r.s, n: r.n, texto: r.texto }; });
    ESTADOS_ACTUALES = estados;
    pintarPasos(estados);
  }
  async function iniciar() {
    if (yaIniciado) return;
    yaIniciado = true;
    var ind;
    try { ind = await C.leerJson(INDICE); } catch (e) { return; }
    IND_HOY = ind; CENTRO = ind.centro;
    M = { abiertos: ind.abiertos || [], cursoVisto: ind.enMarcha, centro: ind.centro, datos: {} };
    (ind.cursos || []).forEach(function (c) { M.datos[c.curso] = { calendario: c.calendario }; });
    try {
      B.tareasResaltadas(M, B.hoyIso()).forEach(function (k) { if (enlacesTarea[k]) enlacesTarea[k].classList.add('toca'); });
    } catch (e) { /* sin calendario: nada resaltado */ }
    if (TAREA) { pintarPasos(ESTADOS_ACTUALES); await cargarEstados(); }
  }

  if (C && C.hayCarpeta && C.hayCarpeta()) iniciar();
  else document.addEventListener('web-carpeta-lista', iniciar);
  window.MenuWeb = { iniciar: iniciar, irA: irA,  tarea: function () { return TAREA; }, paso: function () { return PASO; } };
})();
