const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  tenantId: z.string().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().max(128).optional().default(""),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };
