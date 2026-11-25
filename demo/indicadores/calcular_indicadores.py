"""Indicadores TO-BE de SAIE a partir de la exportación de la base.

Uso (desde la raíz del repo):
    cd backend && npm run prisma:export && cd ..
    python demo/indicadores/calcular_indicadores.py

Lee los CSV de backend/prisma/export/ y no escribe nada en la base.
"""

import collections
import csv
import statistics
import sys
from pathlib import Path

EXPORT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("backend/prisma/export")
DEMO = "DEMO001"  # sección escalada a propósito para la demo


def leer(nombre):
    with open(EXPORT / nombre, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f, delimiter=";"))


def minutos(hora):
    h, m = hora.split(":")
    return int(h) * 60 + int(m)


def lista(valor):
    return [x.strip() for x in valor.split("|") if x.strip()]


def pct(a, b):
    return f"{100 * a / b:.1f} % ({a} de {b})" if b else "sin datos"


# «Aula 101» existe en los dos pabellones: el espacio se identifica por pabellón y nombre.
espacios = {(e["pabellon"], e["identificador"]): e for e in leer("01-espacios.csv")}
secciones = {(s["codigoCurso"], s["codigoSeccion"]): s for s in leer("02-cursos-secciones.csv")}
asignaciones = [a for a in leer("06-asignaciones.csv") if a["codigoCurso"] != DEMO]
vigentes = [a for a in asignaciones if a["estado"] == "VIGENTE"]
matriculas = leer("04-matriculas.csv")
auditoria = leer("fallos-04-auditoria.csv")

horarios = collections.defaultdict(list)
for h in leer("03-horarios.csv"):
    horarios[(h["codigoCurso"], h["codigoSeccion"])].append(
        (h["diaSemana"], minutos(h["horaInicio"]), minutos(h["horaFin"]))
    )


def capacidad_real(e):
    pcs = int(e["pcsMalogradas"] or 0) if e["tipo"] == "LABORATORIO" else 0
    return int(e["aforoNominal"] or 0) - pcs


def espacios_de(a):
    return [(a["pabellon"], x) for x in lista(a["aulas"])]


# Capacidad, tipo y contigüidad
bajo_capacidad = tipo_incorrecto = varios = contiguos = 0
ocupacion, libres = [], []
total_m = total_c = 0
for a in vigentes:
    ids = espacios_de(a)
    cap = sum(capacidad_real(espacios[i]) for i in ids)
    mat = int(a["alumnosMatriculados"])
    total_m, total_c = total_m + mat, total_c + cap
    ocupacion.append(mat / cap)
    libres.append(cap - mat)
    bajo_capacidad += cap < mat
    tipo = secciones[(a["codigoCurso"], a["codigoSeccion"])]["tipoEspacioRequerido"]
    tipo_incorrecto += sum(espacios[i]["tipo"] != tipo for i in ids)
    if len(ids) > 1:
        varios += 1
        vecinos = {i: {(a["pabellon"], x) for x in lista(espacios[i]["contiguos"])} for i in ids}
        vistos, pila = {ids[0]}, [ids[0]]
        while pila:
            for v in vecinos[pila.pop()]:
                if v in ids and v not in vistos:
                    vistos.add(v)
                    pila.append(v)
        contiguos += len(vistos) == len(ids)

# Dobles reservas
ocupado = collections.defaultdict(list)
for a in vigentes:
    clave = (a["codigoCurso"], a["codigoSeccion"])
    for i in espacios_de(a):
        for dia, ini, fin in horarios[clave]:
            ocupado[(i, dia)].append((ini, fin))
dobles = 0
for franjas in ocupado.values():
    franjas.sort()
    dobles += sum(
        1
        for x in range(len(franjas))
        for y in range(x + 1, len(franjas))
        if franjas[y][0] < franjas[x][1]
    )

# Software requerido (R-06)
con_software = cumple_software = 0
for a in vigentes:
    requerido = lista(secciones[(a["codigoCurso"], a["codigoSeccion"])]["stackSoftwareRequerido"])
    if not requerido:
        continue
    con_software += 1
    instalado = [
        {s.lower() for s in lista(espacios[i]["softwareInstalado"])} for i in espacios_de(a)
    ]
    cumple_software += all(
        any(r.lower() in s or s.startswith(r.lower()) for s in inst)
        for inst in instalado
        for r in requerido
    )

# Movilidad reducida en el Piso 1 (R-07)
con_movilidad = {
    (m["codigoCurso"], m["codigoSeccion"])
    for m in matriculas
    if m["movilidadReducida"].strip().lower() in ("sí", "si", "true")
}
mov = [a for a in vigentes if (a["codigoCurso"], a["codigoSeccion"]) in con_movilidad]
mov_piso1 = sum(a["piso"] == "1" for a in mov)

# Secciones paralelas (R-08)
grupos = collections.defaultdict(list)
for a in vigentes:
    tipo = secciones[(a["codigoCurso"], a["codigoSeccion"])]["tipoEspacioRequerido"]
    grupos[(a["codigoCurso"], tipo)].append(a)
paralelas = [g for g in grupos.values() if len(g) > 1]

verificaciones = [r for r in auditoria if r["tipoEvento"] == "VERIFICACION"]
no_conformes = sum("no conforme" in r["detalle"].lower() for r in verificaciones)

print("Indicadores TO-BE — SAIE")
print(f"Secciones asignadas automáticamente: {pct(len(vigentes), len(asignaciones))}")
print(f"Capacidad real menor a matriculados: {bajo_capacidad}")
print(f"Dobles reservas: {dobles}")
print(f"Espacios de tipo incorrecto: {tipo_incorrecto}")
print(f"Secciones con varios espacios en bloque contiguo: {pct(contiguos, varios)}")
print(f"Secciones con software requerido que lo tienen: {pct(cumple_software, con_software)}")
print(f"Secciones con movilidad reducida en el Piso 1: {pct(mov_piso1, len(mov))}")
print(
    "Paralelas en el mismo pabellón: "
    + pct(sum(len({a['pabellon'] for a in g}) == 1 for g in paralelas), len(paralelas))
)
print(f"Verificaciones conformes: {pct(len(verificaciones) - no_conformes, len(verificaciones))}")
print(
    f"Ocupación global: {100 * total_m / total_c:.1f} %; "
    f"asientos libres por sección (mediana): {statistics.median(libres):.0f}"
)
