import {
  crearLimitadorConsulta,
  crearLimitadoresLogin,
  enteroDeEntorno,
  limitesDesactivados,
} from '../../../src/middlewares/limitador.middleware';

describe('limitador.middleware (Issue 1.12)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  describe('limitesDesactivados', () => {
    it('con NODE_ENV=test están apagados por defecto', () => {
      delete process.env.RATE_LIMIT_DISABLED;
      process.env.NODE_ENV = 'test';
      expect(limitesDesactivados()).toBe(true);
    });

    it('RATE_LIMIT_DISABLED=false los activa incluso en pruebas', () => {
      process.env.NODE_ENV = 'test';
      process.env.RATE_LIMIT_DISABLED = 'false';
      expect(limitesDesactivados()).toBe(false);
    });

    it('RATE_LIMIT_DISABLED=true los apaga fuera de pruebas', () => {
      process.env.NODE_ENV = 'production';
      process.env.RATE_LIMIT_DISABLED = ' TRUE ';
      expect(limitesDesactivados()).toBe(true);
    });

    it('sin variable y fuera de pruebas están activos', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RATE_LIMIT_DISABLED;
      expect(limitesDesactivados()).toBe(false);
    });
  });

  describe('enteroDeEntorno', () => {
    it('usa el valor entero positivo y, si no es válido, el de respaldo', () => {
      process.env.X_LIMITE = '7';
      expect(enteroDeEntorno('X_LIMITE', 3)).toBe(7);
      process.env.X_LIMITE = '0';
      expect(enteroDeEntorno('X_LIMITE', 3)).toBe(3);
      process.env.X_LIMITE = 'abc';
      expect(enteroDeEntorno('X_LIMITE', 3)).toBe(3);
      process.env.X_LIMITE = '2.5';
      expect(enteroDeEntorno('X_LIMITE', 3)).toBe(3);
      delete process.env.X_LIMITE;
      expect(enteroDeEntorno('X_LIMITE', 3)).toBe(3);
    });
  });

  describe('fábricas', () => {
    it('apagadas, devuelven un paso directo que no bloquea', () => {
      process.env.RATE_LIMIT_DISABLED = 'true';
      const login = crearLimitadoresLogin();
      const consulta = crearLimitadorConsulta();
      expect(login).toHaveLength(1);
      const next = jest.fn();
      login[0]({} as any, {} as any, next);
      consulta({} as any, {} as any, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('activas, el login tiene un límite por IP y otro por usuario', () => {
      process.env.RATE_LIMIT_DISABLED = 'false';
      expect(crearLimitadoresLogin()).toHaveLength(2);
      expect(typeof crearLimitadorConsulta()).toBe('function');
    });
  });
});
