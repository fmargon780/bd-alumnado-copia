/* Generado de JsCentroDatos.html por web/construir-datos.mjs: no se toca a mano. */
var CENTRO_DATOS_PEDIDO_ = false;

function centroDatosDespuesDePintar_(d) {
  FALTA_FICHERO_ = !!(d && (d.filas || []).some(function (f) { return f.color === 'rojo'; }));
  aplicarPantalla_(d && d.pantalla);   // instrucción 94: lo primero, para que la frase de abajo y los botones usen las pantallas de ahora
  var fr = document.getElementById('centroDatosFrase');
  var cd = d && d.centroDatos;
  if (fr) {
    if (cd && cd.hay) {
      fr.innerHTML = (pantallaNueva_() ? 'Los ficheros se sueltan en el Centro de datos. Si un fichero no aparece aquí, mira «Sin clasificar» en el Centro de datos.' : 'Los ficheros llegan solos del Centro de datos.') +
        (cd.web ? ' <a href="' + escapaAtributo_(cd.web) + '" target="_blank" rel="noopener">Abrir el Centro de datos</a>' : '');
      fr.classList.remove('oculto');
    } else { fr.innerHTML = ''; fr.classList.add('oculto'); }
  }
  pintarLineaDatos_(d && d.datos);   // instrucción 93: la línea de estado, también junto al botón del paso
  pintarPorPreguntar_(d && d.porPreguntar);   // instrucción 93: lo que llegó sin saberse de qué curso es
  leerResolucionGuardada_(d);   // instrucción 93: el PDF de la resolución que llegó del Centro de datos
  if (CENTRO_DATOS_PEDIDO_) return;
  CENTRO_DATOS_PEDIDO_ = true;
  llamar('webCentroDatosTraer').then(function (r) {
    if (!r || !r.tomados || !r.tomados.length) return;
    avisar('Traído del Centro de datos: ' + r.tomados.join(', ') + '.', 'aviso aviso-verde');
    cargarDescargas();
  }).catch(function () { /* si el Centro de datos no responde, todo sigue como siempre */ });
}
