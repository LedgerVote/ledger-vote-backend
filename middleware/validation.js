const Joi = require("joi");

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "any.required": "Password confirmation is required",
      }),
    firstName: Joi.string().min(2).max(50).required().messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),
    userType: Joi.string().valid("voter", "admin").default("voter"),
    walletAddress: Joi.string()
      .length(42)
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        "string.length": "Wallet address must be exactly 42 characters",
        "string.pattern.base": "Invalid wallet address format",
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

const validateSession = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(255).required().messages({
      "string.min": "Title must be at least 3 characters long",
      "string.max": "Title cannot exceed 255 characters",
      "any.required": "Title is required",
    }),
    description: Joi.string().max(1000).optional().messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    endDate: Joi.date().greater("now").required().messages({
      "date.greater": "End date must be in the future",
      "any.required": "End date is required",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

module.exports = {
  validateLogin,
  validateRegister,
  validateSession,
};
