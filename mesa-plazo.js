/* Generado de JsMesaPlazo.html por web/construir-mesa.mjs: no se toca a mano. */
/* Hoy en formato aaaa-mm-dd, con el reloj del navegador. */
function mesaHoy_() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* Un pendiente está fuera de plazo pasado el final del tramo de julio; 2º de Bachillerato y quien repite 1º de Bachillerato, pasado el de septiembre. */
function mesaFueraDePlazo_(al) {
  if (!al || al.estadoMatricula !== 'pendiente' || !DATA || DATA.estadoCurso !== 'preparacion') return false;
  const tramos = DATA.tramosMatricula || {};
  const septiembre = DATA.nivel === '2º BACH' || (DATA.nivel === '1º BACH' && al.rep);
  const hasta = tramos[septiembre ? 2 : 1];
  return !!hasta && mesaHoy_() > hasta;
}

/* Sin optativa y sin religión elegidas, solo en el curso que viene. Nada se supone a partir del curso pasado. */
function mesaOptativaSinElegir_(al) {
  return !!DATA && DATA.estadoCurso === 'preparacion' && !(al.optativas && al.optativas.length) && !(ASIGNACIONES[al.clave] && ASIGNACIONES[al.clave].optativa);
}
function mesaReligionSinElegir_(al) {
  return !!DATA && DATA.estadoCurso === 'preparacion' && !al.religion;
}
function mesaSinElegir_(al) { return mesaOptativaSinElegir_(al) || mesaReligionSinElegir_(al); }
