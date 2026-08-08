const { registerSchema, loginSchema } = require("../validators/auth.validator");
const authService = require("../services/auth.service");

const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request payload", issues: parsed.error.flatten() });
    }

    const result = await authService.register(parsed.data);
    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("[AUTH] Register error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request payload", issues: parsed.error.flatten() });
    }

    const result = await authService.login(parsed.data);
    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("[AUTH] Login error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { register, login };
