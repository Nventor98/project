// Request Validation Middleware (Joi)

const Joi = require("joi");

/**
 * Helper to validate req keys.
 * Used internally by exported validation middleware block.
 */
function validateRequest(schema, property = "body") {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    const valid = error == null;

    if (valid) {
      next();
    } else {
      const { details } = error;
      const message = details.map((i) => i.message).join(", ");
      res.status(422).json({ error: "Validation Error", message });
    }
  };
}

// Validation schemas
const schemas = {
  login: Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(10)
      .max(15)
      .required()
      .messages({ "string.pattern.base": "Phone must contain only numbers" }),
    pin: Joi.string()
      .length(4)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({ "string.pattern.base": "PIN must be securely formatted 4 digits" }),
  }),

  register: Joi.object({
    name: Joi.string().trim().min(3).max(50).required(),
    phone: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(10)
      .max(15)
      .required(),
    pin: Joi.string()
      .length(4)
      .pattern(/^[0-9]+$/)
      .required(),
  }),

  requestReset: Joi.object({
    phone: Joi.string().required(),
  }),

  resetPin: Joi.object({
    phone: Joi.string().required(),
    otp: Joi.string().length(6).required(),
    newPin: Joi.string().length(4).required(),
  }),

  changePin: Joi.object({
    oldPin: Joi.string().length(4).required(),
    newPin: Joi.string().length(4).required(),
  }),

  sendTransaction: Joi.object({
    type: Joi.string().valid("credit", "debit").required(),
    party: Joi.string().trim().min(2).max(50).required(),
    amount: Joi.number().positive().required(),
    note: Joi.string().allow("").max(100),
    channel: Joi.string().valid("online", "bluetooth", "qr", "nfc").required(),
    status: Joi.string().valid("confirmed", "pending", "failed"),
    id: Joi.string().optional(),
    date: Joi.string().optional(),
    time: Joi.string().optional(),
  }),

  syncTransactions: Joi.object({
    transactionIds: Joi.array().items(Joi.string()).min(1).required(),
  }),

  loanApplication: Joi.object({
    amount: Joi.number().positive().required(),
  }),
};

module.exports = {
  validateLogin: validateRequest(schemas.login),
  validateRegister: validateRequest(schemas.register),
  validateRequestReset: validateRequest(schemas.requestReset),
  validateResetPin: validateRequest(schemas.resetPin),
  validateChangePin: validateRequest(schemas.changePin),
  validateSendTransaction: validateRequest(schemas.sendTransaction),
  validateSyncTransactions: validateRequest(schemas.syncTransactions),
  validateLoanApplication: validateRequest(schemas.loanApplication),
};
