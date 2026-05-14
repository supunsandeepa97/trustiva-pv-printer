const { z } = require('zod');
const { error } = require('../utils/apiResponse');

const schemas = {
  login: z.object({
    email:    z.string().email(),
    password: z.string().min(6),
  }),

  register: z.object({
    name:     z.string().min(2),
    email:    z.string().email(),
    password: z.string().min(8),
    role:     z.enum(['finance_manager','finance_user','viewer']).optional(),
  }),

  createVoucher: z.object({
    date:        z.string(),
    payee_name:  z.string().min(1),
    amount:      z.number().positive(),
    description: z.string().optional(),
    bank_name:   z.string().optional(),
    cheque_no:   z.string().optional(),
    currency:    z.string().optional(),
    account_name:z.string().optional(),
    prepared_by: z.string().optional(),
    template_id: z.string().uuid().optional(),
  }),

  updateVoucher: z.object({
    date:        z.string().optional(),
    payee_name:  z.string().min(1).optional(),
    amount:      z.number().positive().optional(),
    description: z.string().optional(),
    bank_name:   z.string().optional(),
    cheque_no:   z.string().optional(),
    currency:    z.string().optional(),
    account_name:z.string().optional(),
    prepared_by: z.string().optional(),
    status:      z.enum(['draft','pending','printed','cancelled']).optional(),
    template_id: z.string().uuid().optional(),
  }),

  importMapping: z.object({
    name:    z.string().min(1),
    mapping: z.record(z.number()),
  }),

  companyUpdate: z.object({
    name:       z.string().optional(),
    address:    z.string().optional(),
    phone:      z.string().optional(),
    email:      z.string().email().optional(),
    tax_number: z.string().optional(),
  }),
};

function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return next();
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return error(res, messages.join('; '), 400);
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
