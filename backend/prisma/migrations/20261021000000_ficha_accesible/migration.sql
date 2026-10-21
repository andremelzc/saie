-- El alumno declara en su ficha médica si tiene una condición que le impide subir a pisos
-- superiores o usar escaleras. El dato vive en la ficha (es una declaración propia) y se
-- propaga a `matriculas.movilidad_reducida` para que el motor priorice las aulas del Piso 1.
ALTER TABLE "fichas_medicas" ADD COLUMN "condicion_accesible" BOOLEAN NOT NULL DEFAULT false;
