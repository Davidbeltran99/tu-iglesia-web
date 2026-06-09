/* =========================================================
   Tú Iglesia — Autenticación (bcrypt + JWT en cookie)
   ========================================================= */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUserById } = require("./db");

const COOKIE_NAME = "ti_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-cambia-esto-en-produccion";
const TOKEN_TTL = "7d";

if (!process.env.JWT_SECRET) {
  console.warn("[auth] ADVERTENCIA: JWT_SECRET no está definido. Usando secreto de desarrollo (NO usar en producción).");
}

function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), 10);
}
function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(String(plain), String(hash));
  } catch {
    return false;
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // el sitio va por HTTPS (Cloudflare); httpOnly + sameSite es suficiente aquí
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// Devuelve el usuario (hidratado, sin hash) a partir de la cookie, o null
function getUserFromRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user || user.estado !== "active") return null;
    return user;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "No autenticado" });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "No autenticado" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Solo el administrador puede hacer esto" });
  }
  req.user = user;
  next();
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  getUserFromRequest,
  requireAuth,
  requireAdmin,
};
