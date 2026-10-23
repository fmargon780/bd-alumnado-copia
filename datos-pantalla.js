/* Generado de JsDatosYConfiguracion.html por web/construir-datos.mjs: no se toca a mano. */
var VISTA_DATOS_ = 'fechas';

/* Los pasos de «Datos y configuración» que viven en esta pantalla: «Fechas del curso» y «El centro». */
function cargarDatosYConfiguracion_() {
  document.getElementById('tarjetaFechas').classList.toggle('oculto', VISTA_DATOS_ !== 'fechas');
  document.getElementById('tarjetaCentro').classList.toggle('oculto', VISTA_DATOS_ !== 'centro');
  document.getElementById('tarjetaEquipo').classList.toggle('oculto', VISTA_DATOS_ !== 'equipo');
  document.getElementById('tarjetaCambios').classList.toggle('oculto', VISTA_DATOS_ !== 'cambios');
  if (VISTA_DATOS_ === 'centro') cargarCentro_(); else if (VISTA_DATOS_ === 'equipo') cargarEquipo_(); else if (VISTA_DATOS_ === 'cambios') cargarCambios_(); else pintarCalendario_();
}
