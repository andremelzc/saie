import { crearClienteTelegram, ErrorTelegram } from '../../../src/telegram/cliente';

describe('ClienteTelegram (Issue 3.25)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('ErrorTelegram identifica correctamente el código 403 como bloqueadoPorUsuario', () => {
    const error403 = new ErrorTelegram(403, 'Forbidden');
    expect(error403.bloqueadoPorUsuario).toBe(true);

    const error500 = new ErrorTelegram(500, 'Server Error');
    expect(error500.bloqueadoPorUsuario).toBe(false);
  });

  it('crearClienteTelegram lanza error si no se pasa token ni está en el entorno', () => {
    const tokenPrevio = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    expect(() => crearClienteTelegram()).toThrow('TELEGRAM_BOT_TOKEN no está configurado');

    process.env.TELEGRAM_BOT_TOKEN = tokenPrevio;
  });

  it('enviarMensaje llama a la API con el método sendMessage y parámetros correctos', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
    });
    global.fetch = mockFetch;

    const cliente = crearClienteTelegram('token-de-prueba');
    await cliente.enviarMensaje('12345', 'Mensaje de prueba');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken-de-prueba/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '12345', text: 'Mensaje de prueba' }),
      }),
    );
  });

  it('borrarMensaje llama a deleteMessage con chat_id y message_id', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
    });
    global.fetch = mockFetch;

    const cliente = crearClienteTelegram('token-de-prueba');
    await cliente.borrarMensaje('12345', 789);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken-de-prueba/deleteMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '12345', message_id: 789 }),
      }),
    );
  });

  it('lanza ErrorTelegram cuando la API responde con ok: false', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: false, error_code: 403, description: 'Bot blocked' }),
    });
    global.fetch = mockFetch;

    const cliente = crearClienteTelegram('token-de-prueba');

    await expect(cliente.enviarMensaje('123', 'hola')).rejects.toThrow(ErrorTelegram);
    await expect(cliente.enviarMensaje('123', 'hola')).rejects.toMatchObject({
      codigo: 403,
      bloqueadoPorUsuario: true,
    });
  });

  it('lanza ErrorTelegram con código 0 y oculta el token si hay un fallo de red', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch https://secret-token'));
    global.fetch = mockFetch;

    const cliente = crearClienteTelegram('token-secreto');

    await expect(cliente.enviarMensaje('123', 'hola')).rejects.toMatchObject({
      codigo: 0,
      message: expect.not.stringContaining('token-secreto'),
    });
  });
});
