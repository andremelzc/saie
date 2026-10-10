/**
 * seed.ts — Issue #219: Script de seed y dataset de demostración
 *
 * Reconstruye la base desde cero de forma idempotente (upsert en cada entidad).
 * Correrlo dos veces no duplica registros.
 *
 * Uso:
 *   npx prisma db seed
 *
 * Variables de entorno opcionales:
 *   SEED_VOLUMEN=k6   → carga el conjunto de volumen para pruebas de carga (Issue 5.8)
 */

import bcrypt from 'bcrypt';
import { PrismaClient, RolCuenta, TipoEspacio, DiaSemana } from '@prisma/client';
import { sembrarEspaciosYContiguedades } from '../src/services/contiguedad.seed';
import { importarCursosYSecciones } from '../src/importers/cursosSecciones.importer';
import { importarHorarios } from '../src/importers/horarios.importer';
import { importarDocentes } from '../src/importers/docentes.importer';
import { importarMatriculas } from '../src/importers/matriculas.importer';

const prisma = new PrismaClient();

// ============================================================
// 1. CUENTAS DE SISTEMA (Coordinación y Jefatura)
// ============================================================

const CUENTAS_SISTEMA = [
  {
    usuarioLogin: 'coordinacion',
    clave: 'saie-coord-2026',
    rol: RolCuenta.COORDINACION_ACADEMICA,
  },
  {
    usuarioLogin: 'jefatura',
    clave: 'saie-jef-2026',
    rol: RolCuenta.JEFATURA_LABORATORIOS,
  },
] as const;

/** Laboratorios asignados a la cuenta de Jefatura (EspacioResponsable). */
const LABS_JEFATURA = [
  { pabellon: 'Pabellon A', identificador: 'Lab 101' },
  { pabellon: 'Pabellon A', identificador: 'Lab 102' },
  { pabellon: 'Pabellon A', identificador: 'Lab 201' },
  { pabellon: 'Pabellon A', identificador: 'Lab 202' },
];

// ============================================================
// 2. DATOS MAESTROS SINTÉTICOS — DOCENTES
// ============================================================

const DOCENTES_SEED = [
  {
    codigoDocente: 'D001',
    nombre: 'Ana García López',
    correoInstitucional: 'a.garcia@unmsm.edu.pe',
    departamento: 'Ingeniería de Software',
  },
  {
    codigoDocente: 'D002',
    nombre: 'Carlos Mendoza Ríos',
    correoInstitucional: 'c.mendoza@unmsm.edu.pe',
    departamento: 'Ciencias de la Computación',
  },
  {
    codigoDocente: 'D003',
    nombre: 'María Torres Vega',
    correoInstitucional: 'm.torres@unmsm.edu.pe',
    departamento: 'Sistemas de Información',
  },
  {
    codigoDocente: 'D004',
    nombre: 'Luis Ramírez Chávez',
    correoInstitucional: 'l.ramirez@unmsm.edu.pe',
    departamento: 'Redes y Comunicaciones',
  },
];

// ============================================================
// 3. CURSOS Y SECCIONES PARALELAS — Período 2026-2
// ============================================================

const PERIODO = '2026-2';

const CURSOS_SECCIONES_SEED = [
  // Curso teórico con 2 secciones paralelas (A y B) → Aulas piso 1
  {
    codigoCurso: 'CC-101',
    nombreCurso: 'Algoritmos y Estructuras de Datos',
    codigoSeccion: 'A',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
  },
  {
    codigoCurso: 'CC-101',
    nombreCurso: 'Algoritmos y Estructuras de Datos',
    codigoSeccion: 'B',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
  },
  // Curso teórico con 1 sección → Aula piso 2
  {
    codigoCurso: 'SI-201',
    nombreCurso: 'Bases de Datos I',
    codigoSeccion: 'A',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
  },
  // Curso de laboratorio con 2 secciones paralelas → Labs piso 1
  {
    codigoCurso: 'IS-301',
    nombreCurso: 'Laboratorio de Programación Web',
    codigoSeccion: 'A',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.LABORATORIO,
    stackSoftwareRequerido: ['VS Code', 'Node.js'],
  },
  {
    codigoCurso: 'IS-301',
    nombreCurso: 'Laboratorio de Programación Web',
    codigoSeccion: 'B',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.LABORATORIO,
    stackSoftwareRequerido: ['VS Code', 'Node.js'],
  },
  // Curso de laboratorio con software sin cobertura → ejercita ESCALAMIENTO
  {
    codigoCurso: 'RC-401',
    nombreCurso: 'Laboratorio de Redes',
    codigoSeccion: 'A',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.LABORATORIO,
    stackSoftwareRequerido: ['Cisco Packet Tracer', 'Wireshark'],
  },
  // Curso teórico con 60 alumnos → ejercita ALERTA DE CAPACIDAD / bloque contiguo
  {
    codigoCurso: 'CC-501',
    nombreCurso: 'Inteligencia Artificial',
    codigoSeccion: 'A',
    periodo: PERIODO,
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
  },
];

// ============================================================
// 4. HORARIOS
// ============================================================

const HORARIOS_SEED = [
  // CC-101 A: Lunes y Miércoles 08:00-10:00
  { codigoCurso: 'CC-101', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
  { codigoCurso: 'CC-101', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.MIERCOLES, horaInicio: '08:00', horaFin: '10:00' },
  // CC-101 B: Lunes y Miércoles 10:00-12:00 (paralela a A)
  { codigoCurso: 'CC-101', codigoSeccion: 'B', periodo: PERIODO, diaSemana: DiaSemana.LUNES, horaInicio: '10:00', horaFin: '12:00' },
  { codigoCurso: 'CC-101', codigoSeccion: 'B', periodo: PERIODO, diaSemana: DiaSemana.MIERCOLES, horaInicio: '10:00', horaFin: '12:00' },
  // SI-201 A: Martes y Jueves 08:00-10:00
  { codigoCurso: 'SI-201', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.MARTES, horaInicio: '08:00', horaFin: '10:00' },
  { codigoCurso: 'SI-201', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.JUEVES, horaInicio: '08:00', horaFin: '10:00' },
  // IS-301 A: Viernes 08:00-11:00
  { codigoCurso: 'IS-301', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.VIERNES, horaInicio: '08:00', horaFin: '11:00' },
  // IS-301 B: Viernes 11:00-14:00 (paralela a A)
  { codigoCurso: 'IS-301', codigoSeccion: 'B', periodo: PERIODO, diaSemana: DiaSemana.VIERNES, horaInicio: '11:00', horaFin: '14:00' },
  // RC-401 A: Sábado 08:00-11:00 (software imposible → escalamiento)
  { codigoCurso: 'RC-401', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.SABADO, horaInicio: '08:00', horaFin: '11:00' },
  // CC-501 A: Lunes y Miércoles 14:00-16:00 (grupo grande → alerta capacidad)
  { codigoCurso: 'CC-501', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.LUNES, horaInicio: '14:00', horaFin: '16:00' },
  { codigoCurso: 'CC-501', codigoSeccion: 'A', periodo: PERIODO, diaSemana: DiaSemana.MIERCOLES, horaInicio: '14:00', horaFin: '16:00' },
];

// ============================================================
// 5. MATRÍCULAS SINTÉTICAS
// ============================================================

const MATRICULAS_BASE_SEED = [
  // CC-101 A — 20 alumnos (3 con movilidad reducida)
  ...Array.from({ length: 20 }, (_, i) => ({
    codigoAlumno: `22200${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno Demo ${i + 1}`,
    correo: `alumno${i + 1}@demo.saie.pe`,
    movilidadReducida: i < 3,
    codigoCurso: 'CC-101',
    codigoSeccion: 'A',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // CC-101 B — 18 alumnos
  ...Array.from({ length: 18 }, (_, i) => ({
    codigoAlumno: `22200${String(i + 21).padStart(3, '0')}`,
    nombre: `Alumno Demo ${i + 21}`,
    correo: `alumno${i + 21}@demo.saie.pe`,
    movilidadReducida: false,
    codigoCurso: 'CC-101',
    codigoSeccion: 'B',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // SI-201 A — 25 alumnos (1 con movilidad reducida)
  ...Array.from({ length: 25 }, (_, i) => ({
    codigoAlumno: `22300${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno BD ${i + 1}`,
    correo: `alumnobd${i + 1}@demo.saie.pe`,
    movilidadReducida: i === 0,
    codigoCurso: 'SI-201',
    codigoSeccion: 'A',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // IS-301 A — 15 alumnos (lab)
  ...Array.from({ length: 15 }, (_, i) => ({
    codigoAlumno: `22400${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno WebLab ${i + 1}`,
    correo: `alumnolab${i + 1}@demo.saie.pe`,
    movilidadReducida: false,
    codigoCurso: 'IS-301',
    codigoSeccion: 'A',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // IS-301 B — 14 alumnos (lab paralelo)
  ...Array.from({ length: 14 }, (_, i) => ({
    codigoAlumno: `22400${String(i + 16).padStart(3, '0')}`,
    nombre: `Alumno WebLab ${i + 16}`,
    correo: `alumnolab${i + 16}@demo.saie.pe`,
    movilidadReducida: false,
    codigoCurso: 'IS-301',
    codigoSeccion: 'B',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // RC-401 A — 12 alumnos (escalamiento)
  ...Array.from({ length: 12 }, (_, i) => ({
    codigoAlumno: `22500${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno Redes ${i + 1}`,
    correo: `alumnored${i + 1}@demo.saie.pe`,
    movilidadReducida: false,
    codigoCurso: 'RC-401',
    codigoSeccion: 'A',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
  // CC-501 A — 60 alumnos (alerta capacidad)
  ...Array.from({ length: 60 }, (_, i) => ({
    codigoAlumno: `22600${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno IA ${i + 1}`,
    correo: `alumnoia${i + 1}@demo.saie.pe`,
    movilidadReducida: false,
    codigoCurso: 'CC-501',
    codigoSeccion: 'A',
    periodo: PERIODO,
    crearCuentaAcceso: true,
  })),
];

// ============================================================
// 6. DATASET DE VOLUMEN PARA k6 (Issue 5.8)
// ============================================================

function generarMatriculasVolumen(): typeof MATRICULAS_BASE_SEED {
  const secciones = [
    { codigoCurso: 'CC-101', codigoSeccion: 'A' },
    { codigoCurso: 'CC-101', codigoSeccion: 'B' },
    { codigoCurso: 'SI-201', codigoSeccion: 'A' },
  ];

  return Array.from({ length: 500 }, (_, i) => {
    const s = secciones[i % secciones.length];
    return {
      codigoAlumno: `99${String(i + 1).padStart(6, '0')}`,
      nombre: `Alumno Volumen ${i + 1}`,
      correo: `vol${i + 1}@k6.saie.pe`,
      movilidadReducida: false,
      codigoCurso: s.codigoCurso,
      codigoSeccion: s.codigoSeccion,
      periodo: PERIODO,
      crearCuentaAcceso: false,
    };
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const modoVolumen = process.env.SEED_VOLUMEN === 'k6';

  console.log('🌱 SAIE Seed — Issue #219');
  console.log('=========================================');
  if (modoVolumen) {
    console.log('⚡ Modo: VOLUMEN (k6) — 500 matrículas extra');
  } else {
    console.log('📦 Modo: DEMO + BASE');
  }
  console.log('');

  // PASO 1: Espacios y contigüidades
  console.log('[1/6] Sembrando espacios y contigüidades...');
  const resEspacios = await sembrarEspaciosYContiguedades(prisma);
  console.log(`     ✅ ${resEspacios.espaciosSembrados} espacios, ${resEspacios.contiguedadesSembradas} contigüidades`);

  // PASO 2: Cuentas de sistema
  console.log('[2/6] Sembrando cuentas de sistema...');
  const cuentasSistema: Array<{ usuarioLogin: string; id: string }> = [];

  for (const c of CUENTAS_SISTEMA) {
    const claveHash = await bcrypt.hash(c.clave, 10);
    const cuenta = await prisma.cuenta.upsert({
      where: { usuarioLogin: c.usuarioLogin },
      update: {},
      create: {
        rol: c.rol,
        usuarioLogin: c.usuarioLogin,
        claveHash,
        debeCambiarClave: false,
      },
    });
    cuentasSistema.push({ usuarioLogin: c.usuarioLogin, id: cuenta.id });
    console.log(`     ✅ Cuenta: ${c.usuarioLogin} (${c.rol})`);
  }

  // Asignar laboratorios a Jefatura (EspacioResponsable)
  const cuentaJefatura = cuentasSistema.find((c) => c.usuarioLogin === 'jefatura');
  if (cuentaJefatura) {
    for (const lab of LABS_JEFATURA) {
      const espacio = await prisma.espacio.findUnique({
        where: { pabellon_identificador: { pabellon: lab.pabellon, identificador: lab.identificador } },
      });
      if (espacio) {
        await prisma.espacioResponsable.upsert({
          where: { cuentaId_espacioId: { cuentaId: cuentaJefatura.id, espacioId: espacio.id } },
          update: {},
          create: { cuentaId: cuentaJefatura.id, espacioId: espacio.id },
        });
        console.log(`     ✅ EspacioResponsable: Jefatura → ${lab.identificador}`);
      }
    }
  }

  // PASO 3: Docentes
  console.log('[3/6] Sembrando docentes...');
  const resDocentes = await importarDocentes(DOCENTES_SEED, prisma);
  if (resDocentes.errores.length > 0) {
    console.warn('     ⚠️  Errores en docentes:', resDocentes.errores);
  }
  console.log(`     ✅ ${resDocentes.docentesProcesados} docentes, ${resDocentes.cuentasCreadas} cuentas`);

  // PASO 4: Cursos, secciones y horarios
  console.log('[4/6] Sembrando cursos, secciones y horarios...');
  const resCursos = await importarCursosYSecciones(CURSOS_SECCIONES_SEED, prisma);
  if (resCursos.errores.length > 0) {
    console.warn('     ⚠️  Errores en cursos/secciones:', resCursos.errores);
  }
  console.log(`     ✅ ${resCursos.cursosProcesados} cursos, ${resCursos.seccionesProcesadas} secciones`);

  const resHorarios = await importarHorarios(HORARIOS_SEED, prisma);
  if (resHorarios.errores.length > 0) {
    console.warn('     ⚠️  Errores en horarios:', resHorarios.errores);
  }
  console.log(`     ✅ ${resHorarios.horariosProcesados} horarios`);

  // Vincular docentes a secciones
  const asignacionesDocentes = [
    { codigoDocente: 'D001', codigoCurso: 'CC-101', codigoSeccion: 'A' },
    { codigoDocente: 'D001', codigoCurso: 'CC-101', codigoSeccion: 'B' },
    { codigoDocente: 'D002', codigoCurso: 'SI-201', codigoSeccion: 'A' },
    { codigoDocente: 'D003', codigoCurso: 'IS-301', codigoSeccion: 'A' },
    { codigoDocente: 'D003', codigoCurso: 'IS-301', codigoSeccion: 'B' },
    { codigoDocente: 'D004', codigoCurso: 'RC-401', codigoSeccion: 'A' },
    { codigoDocente: 'D002', codigoCurso: 'CC-501', codigoSeccion: 'A' },
  ];

  for (const ad of asignacionesDocentes) {
    const docente = await prisma.docente.findUnique({ where: { codigoDocente: ad.codigoDocente } });
    const curso = await prisma.curso.findUnique({ where: { codigo: ad.codigoCurso } });
    if (docente && curso) {
      const seccion = await prisma.seccion.findUnique({
        where: { cursoId_codigoSeccion_periodo: { cursoId: curso.id, codigoSeccion: ad.codigoSeccion, periodo: PERIODO } },
      });
      if (seccion) {
        await prisma.seccion.update({ where: { id: seccion.id }, data: { docenteId: docente.id } });
      }
    }
  }
  console.log('     ✅ Docentes vinculados a secciones');

  // PASO 5: Matrículas
  console.log('[5/6] Sembrando matrículas...');
  const matriculas = modoVolumen
    ? [...MATRICULAS_BASE_SEED, ...generarMatriculasVolumen()]
    : MATRICULAS_BASE_SEED;

  const resMatriculas = await importarMatriculas(matriculas, prisma);
  if (resMatriculas.errores.length > 0) {
    console.warn(`     ⚠️  ${resMatriculas.errores.length} errores en matrículas`);
  }
  console.log(
    `     ✅ ${resMatriculas.alumnosProcesados} alumnos, ${resMatriculas.cuentasCreadas} cuentas, ${resMatriculas.matriculasProcesadas} matrículas`,
  );

  // PASO 6: Resumen
  console.log('[6/6] ✅ Escenario de demostración cargado.');
  console.log('');
  console.log('  📋 ESCENARIO DE DEMOSTRACIÓN');
  console.log('  ─────────────────────────────────────────');
  console.log('  1. FLUJO FELIZ AULA:    CC-101-A (20 alumnos, 3 con movilidad reducida) → Aula piso 1');
  console.log('  2. SECCIONES PARALELAS: CC-101-A y CC-101-B → desempate por cercanía (Aula 101 ↔ Aula 102)');
  console.log('  3. FLUJO FELIZ LAB:     IS-301-A → Lab 101 (VS Code + Node.js disponibles)');
  console.log('  4. ESCALAMIENTO:        RC-401-A → ningún lab tiene Cisco Packet Tracer → revisión manual');
  console.log('  5. ALERTA CAPACIDAD:    CC-501-A (60 alumnos) → requiere bloque contiguo');
  console.log('  6. BATCH:               POST /api/v1/asignaciones/batch { periodo: "' + PERIODO + '" }');
  console.log('');
  console.log('  🔑 Credenciales:');
  console.log('     coordinacion / saie-coord-2026');
  console.log('     jefatura     / saie-jef-2026');
  console.log('     Docentes:    código / código  (ej: D001 / D001)');
  console.log('     Alumnos:     código / código  (ej: 22200001 / 22200001)');

  if (modoVolumen) {
    console.log('');
    console.log('  ⚡ Conjunto k6: 500 alumnos en CC-101-A/B y SI-201-A');
  }

  console.log('');
  console.log('=========================================');
  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
