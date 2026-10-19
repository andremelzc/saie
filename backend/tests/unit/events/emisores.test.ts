import { EstadoAsignacion, TipoAlerta, TipoEspacio } from '@prisma/client';
import { bus } from '../../../src/events/bus';
import {
  construirEventoCambio,
  detectarCambioDeEspacios,
  emitirAlertasCreadas,
  emitirCambiosDeAsignacion,
} from '../../../src/events/emisores';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import { SeccionInputMotor } from '../../../src/types/asignacion';

describe('Emisores de Eventos (Issue 2.16)', () => {
  describe('detectarCambioDeEspacios', () => {
    it('retorna null si no había asignación previa', () => {
      const res = detectarCambioDeEspacios(null, EstadoAsignacion.VIGENTE, ['e1']);
      expect(res).toBeNull();
    });

    it('retorna null si la asignación previa no estaba VIGENTE (ej. ESCALADA)', () => {
      const res = detectarCambioDeEspacios(
        { estado: EstadoAsignacion.ESCALADA, espacioIds: ['e1'] },
        EstadoAsignacion.VIGENTE,
        ['e2'],
      );
      expect(res).toBeNull();
    });

    it('retorna null si la nueva asignación no es VIGENTE', () => {
      const res = detectarCambioDeEspacios(
        { estado: EstadoAsignacion.VIGENTE, espacioIds: ['e1'] },
        EstadoAsignacion.ESCALADA,
        [],
      );
      expect(res).toBeNull();
    });

    it('retorna null por idempotencia si los espacios son exactamente los mismos', () => {
      const res = detectarCambioDeEspacios(
        { estado: EstadoAsignacion.VIGENTE, espacioIds: ['e1', 'e2'] },
        EstadoAsignacion.VIGENTE,
        ['e2', 'e1'],
      );
      expect(res).toBeNull();
    });

    it('retorna anteriores y nuevos si ambas son VIGENTES y los espacios cambiaron', () => {
      const res = detectarCambioDeEspacios(
        { estado: EstadoAsignacion.VIGENTE, espacioIds: ['e1'] },
        EstadoAsignacion.VIGENTE,
        ['e2'],
      );
      expect(res).toEqual({ anteriores: ['e1'], nuevos: ['e2'] });
    });
  });

  describe('construirEventoCambio', () => {
    it('construye el DTO con nombres e identificadores legibles', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoCurso: 'ISW101',
        nombreCurso: 'Software',
        codigoSeccion: '01',
        periodo: '2026-1',
        alumnosMatriculados: 30,
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        softwareRequerido: [],
        horarios: [],
      };

      const espacios: EspacioConexo[] = [
        {
          id: 'e1',
          identificador: 'Aula 101',
          tipo: TipoEspacio.AULA_TEORICA,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 40,
          softwareInstalado: [],
          pcsMalogradas: null,
        },
        {
          id: 'e2',
          identificador: 'Aula 202',
          tipo: TipoEspacio.AULA_TEORICA,
          pabellon: 'A',
          piso: 2,
          aforoNominal: 40,
          softwareInstalado: [],
          pcsMalogradas: null,
        },
      ];

      const evento = construirEventoCambio(
        seccion,
        { anteriores: ['e1'], nuevos: ['e2'] },
        espacios,
      );

      expect(evento).toEqual({
        seccionId: 'sec-1',
        codigoCurso: 'ISW101',
        nombreCurso: 'Software',
        codigoSeccion: '01',
        periodo: '2026-1',
        espaciosAnteriores: [{ id: 'e1', identificador: 'Aula 101' }],
        espaciosNuevos: [{ id: 'e2', identificador: 'Aula 202' }],
        horarios: [],
      });
    });
  });

  describe('emitirCambiosDeAsignacion y emitirAlertasCreadas', () => {
    beforeEach(() => {
      bus.limpiar();
    });

    it('emite asignacion.cambiada en el bus', async () => {
      const handler = jest.fn();
      bus.suscribir('asignacion.cambiada', handler);

      const evento = {
        seccionId: 's1',
        codigoCurso: 'CS1',
        nombreCurso: 'Intro',
        codigoSeccion: '1',
        periodo: '2026-1',
        espaciosAnteriores: [],
        espaciosNuevos: [],
        horarios: [],
      };

      emitirCambiosDeAsignacion([evento]);

      // Esperar microtareas para que la promesa del bus se resuelva
      await new Promise((r) => setImmediate(r));

      expect(handler).toHaveBeenCalledWith(evento);
    });

    it('emitirAlertasCreadas solo emite si creada es true', async () => {
      const handler = jest.fn();
      bus.suscribir('alerta.creada', handler);

      emitirAlertasCreadas([
        {
          id: 'al-1',
          tipo: TipoAlerta.CAPACIDAD,
          espacioId: 'e-1',
          motivo: 'Superado',
          asignacionesAfectadas: 1,
          creada: true,
        },
        {
          id: 'al-2',
          tipo: TipoAlerta.SOFTWARE,
          espacioId: 'e-2',
          motivo: 'Falta Docker',
          asignacionesAfectadas: 1,
          creada: false, // Ya existía: no debe emitir
        },
      ]);

      await new Promise((r) => setImmediate(r));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ alertaId: 'al-1' }));
    });
  });
});
