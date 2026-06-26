const { success, error } = require('../src/utils/apiResponse');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('apiResponse', () => {
  describe('success', () => {
    test('uses 200 by default and wraps data', () => {
      const res = mockRes();
      const payload = { id: 1, name: 'PV-1001' };
      success(res, payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: payload });
    });

    test('honors a custom status code', () => {
      const res = mockRes();
      success(res, { created: true }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { created: true },
      });
    });
  });

  describe('error', () => {
    test('uses 400 by default with a message', () => {
      const res = mockRes();
      error(res, 'Bad request');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad request',
      });
    });

    test('honors a custom status code', () => {
      const res = mockRes();
      error(res, 'Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not found',
      });
    });
  });
});
