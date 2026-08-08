const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const config = require("../config");

const JWT_SECRET = process.env.JWT_SECRET || "ledgerguard-dev-secret-change-in-prod";

const getMainConnection = async () => {
  const baseUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledgerguard_main";
  const uri = baseUri.includes("retryWrites") ? baseUri : baseUri + (baseUri.includes("?") ? "&" : "?") + "retryWrites=false";
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return mongoose.connect(uri);
};

const register = async ({ email, password, tenantId, name }) => {
  await getMainConnection();

  const existing = await User.findOne({ email });
  if (existing) {
    return { success: false, statusCode: 409, data: { error: "Email already registered" } };
  }

  const user = await User.create({ email, password, tenantId, name });
  const token = jwt.sign(
    { sub: user._id, email: user.email, tid: tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    success: true,
    statusCode: 201,
    data: {
      token,
      user: { id: user._id, email: user.email, tenantId, name: user.name, role: user.role },
    },
  };
};

const login = async ({ email, password }) => {
  await getMainConnection();

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return { success: false, statusCode: 401, data: { error: "Invalid credentials" } };
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return { success: false, statusCode: 401, data: { error: "Invalid credentials" } };
  }

  const token = jwt.sign(
    { sub: user._id, email: user.email, tid: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    success: true,
    statusCode: 200,
    data: {
      token,
      user: { id: user._id, email: user.email, tenantId: user.tenantId, name: user.name, role: user.role },
    },
  };
};

module.exports = { register, login };
