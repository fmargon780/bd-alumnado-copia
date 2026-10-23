/* Generado de JsMesaEquilibrio.html por web/construir-mesa.mjs: no se toca a mano. */
let EQ_MATERIAS_ABIERTAS_ = true;   // se recuerda mientras no se recargue la web

function alternarFilasMaterias_() {
  EQ_MATERIAS_ABIERTAS_ = !EQ_MATERIAS_ABIERTAS_;
  pintarEquilibrio();
}

function pintarEquilibrio() {
  const grupos = DATA.grupos;
  const cuenta = function (pred) { return function (g) { return g.filter(pred).length; }; };
  const filasCfg = [
    { et: 'Alumnado', f: function (g) { return g.length; }, tope: 2 },
    { et: 'Chicos', f: cuenta(function (a) { return /^(h|v)/i.test(a.sexo || ''); }), tope: 1 },
    { et: 'Chicas', f: cuenta(function (a) { return /^m/i.test(a.sexo || ''); }), tope: 1 },
    { et: 'Repetidores', f: cuenta(function (a) { return a.rep; }), tope: 1 },
    { et: 'PIL', f: cuenta(function (a) { return a.pil; }), tope: 1 },
    { et: 'NEAE', f: cuenta(function (a) { return a.neae; }), tope: 1 },
    { et: 'Diversificación', f: cuenta(function (a) { return a.div; }), tope: 1 },
    { et: 'Conflictivos', f: cuenta(function (a) { return a.conflictivo; }), tope: 1 },
    { et: 'Pide bilingüe', f: cuenta(function (a) { return a.bilingue; }), tope: 1 },
    { et: '3 o más suspensas', f: cuenta(function (a) { return (a.suspensas || 0) >= 3; }), tope: 1 }
  ];
  /* Instrucción 61: en el curso que viene se enseña quién está sin matricular, más la fila «Sin elegir»; PIL, suspensas y materias vuelven con lo que la instrucción 64 sabe de cada esperado. */
  const enPrep = DATA.estadoCurso === 'preparacion';
  if (enPrep) {
    filasCfg.splice(1, 0, { et: 'Sin matricular', f: cuenta(function (a) { return a.estadoMatricula === 'pendiente' || a.estadoMatricula === 'provisional'; }), tope: Infinity, sinRojo: true,
      extra: function (lista) { const n = lista.filter(mesaFueraDePlazo_).length; return n ? ' (' + n + ' fuera de plazo)' : ''; } });
    filasCfg.push({ et: 'Sin elegir', f: cuenta(mesaSinElegir_), tope: Infinity, sinRojo: true });
  }
  const porGrupo = {};
  grupos.forEach(function (gr) { porGrupo[gr] = DATA.alumnos.filter(function (a) { return grupoDe(a.clave) === gr; }); });

  let html = '<tr><th class="etiqueta">Por grupo</th>' + grupos.map(function (g) { return '<th>' + escapaHtml(g) + '</th>'; }).join('') + '</tr>';
  filasCfg.forEach(function (fc) {
    const valores = grupos.map(function (g) { return fc.f(porGrupo[g]); });
    const media = valores.reduce(function (s, v) { return s + v; }, 0) / (grupos.length || 1);
    html += '<tr><td class="etiqueta">' + fc.et + '</td>' + valores.map(function (v, i) {
      const rojo = !fc.sinRojo && Math.abs(v - media) > fc.tope + 0.001 ? ' rojo' : '';   // «Sin matricular» nunca se pinta en rojo
      return '<td class="' + rojo.trim() + '">' + v + (fc.extra ? fc.extra(porGrupo[grupos[i]]) : '') + '</td>';
    }).join('') + '</tr>';
  });

  /* Las materias: el rótulo plegable y una fila por materia con alumnos. */
  const franjas = franjasDelCurso_();
  const materias = materiasDelCurso_(DATA.alumnos, franjas, ASIGNACIONES);
  if (materias.length) {
    html += '<tr class="eq-sep" onclick="alternarFilasMaterias_()" role="button" tabindex="0" aria-expanded="' + EQ_MATERIAS_ABIERTAS_ +
      '" onkeydown="if (event.key === \'Enter\') alternarFilasMaterias_()"><td colspan="' + (grupos.length + 1) + '">' +
      (EQ_MATERIAS_ABIERTAS_ ? '▾' : '▸') + ' Optativas y Religión</td></tr>';
    if (EQ_MATERIAS_ABIERTAS_) {
      const esCriterio = {};
      CRITERIOS.lista.forEach(function (c) { if (c.activo && criterioEsMateria_(c.id)) esCriterio[c.id.slice(4)] = true; });
      materias.forEach(function (m) {
        const dan = gruposQueDan_(m.codigo, franjas, grupos);
        const valores = grupos.map(function (g) {
          return porGrupo[g].filter(function (a) { return materiasDeAlumno_(a, ASIGNACIONES[a.clave]).indexOf(m.codigo) !== -1; }).length;
        });
        const enDan = grupos.map(function (g, i) { return dan.indexOf(g) !== -1 ? valores[i] : null; }).filter(function (v) { return v !== null; });
        const media = enDan.reduce(function (s, v) { return s + v; }, 0) / (enDan.length || 1);
        html += '<tr class="eq-materia"><td class="etiqueta">' + (esCriterio[m.codigo] ? '<span class="eq-criterio" title="Es un criterio del reparto">◆</span> ' : '') +
          escapaHtml(m.etiqueta) + '</td>' + grupos.map(function (g, i) {
          if (dan.indexOf(g) === -1) {
            return valores[i] > 0 ? '<td class="rojo">' + valores[i] + '</td>' : '<td class="no-da" title="Este grupo no la da">·</td>';
          }
          const rojo = esCriterio[m.codigo] && Math.abs(valores[i] - media) > 1.001 ? 'rojo' : '';
          return '<td class="' + rojo + '">' + valores[i] + '</td>';
        }).join('') + '</tr>';
      });
    }
  }
  document.getElementById('tablaEquilibrio').innerHTML = html;
}
