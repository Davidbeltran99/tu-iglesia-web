/* =========================================================
   Tú Iglesia — Servidor (Express)
   - Sirve la landing pública (public/)
   - API del portal de líderes (auth, usuarios, ministerios, eventos, personas)
   ========================================================= */

const path = require("path");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("./db");
const {
  hashPassword,
  verifyPassword,
  setAuthCookie,
  clearAuthCookie,
  getUserFromRequest,
  requireAuth,
  requireAdmin,
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* ---------- Seed del administrador (pastor) ---------- */
function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE || "Pastor";
  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se crea admin automático.");
    return;
  }
  const existing = db.getUserByEmailRaw(email);
  if (existing) return;
  const pastoral = db.listMinisterios().find((m) => m.slug === "pastoral");
  db.createUser({
    nombre,
    email,
    password_hash: hashPassword(password),
    role: "admin",
    ministerio_id: pastoral ? pastoral.id : null,
    estado: "active",
  });
  console.log(`[seed] Administrador creado: ${email}`);
}
seedAdmin();

/* ---------- Importación del calendario 2026 (una sola vez) ---------- */
function seedCalendar() {
  if (db.getFlag("calendarSeeded")) return;
  try {
    const p = path.join(__dirname, "seeds", "calendario-2026.json");
    if (!fs.existsSync(p)) return;
    const list = JSON.parse(fs.readFileSync(p, "utf8"));
    const n = db.importEvents(list);
    db.setFlag("calendarSeeded", true);
    console.log(`[seed] Calendario 2026 importado: ${n} actividades`);
  } catch (e) {
    console.error("[seed] No se pudo importar el calendario:", e.message);
  }
}
seedCalendar();

/* ===================== API ===================== */

/* ---------- Salud ---------- */
app.get("/health", (_req, res) => res.json({ ok: true, service: "tu-iglesia" }));

/* ---------- Ministerios ---------- */
// Lista pública (la usa el formulario de registro). Solo activos y campos mínimos.
app.get("/api/ministerios", (_req, res) => {
  const items = db.listMinisterios({ soloActivos: true }).map((m) => ({ id: m.id, nombre: m.nombre, slug: m.slug }));
  res.json({ ok: true, ministerios: items });
});
app.get("/api/ministerios/all", requireAdmin, (_req, res) => {
  res.json({ ok: true, ministerios: db.listMinisterios() });
});
app.post("/api/ministerios", requireAdmin, (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  if (!nombre) return res.status(400).json({ ok: false, error: "Falta el nombre" });
  try {
    res.json({ ok: true, ministerio: db.createMinisterio(nombre) });
  } catch (e) {
    res.status(400).json({ ok: false, error: "No se pudo crear (¿ya existe?)", detalle: e.message });
  }
});
app.patch("/api/ministerios/:id", requireAdmin, (req, res) => {
  const updated = db.updateMinisterio(Number(req.params.id), {
    nombre: req.body?.nombre,
    activo: req.body?.activo,
  });
  if (!updated) return res.status(404).json({ ok: false, error: "Ministerio no encontrado" });
  res.json({ ok: true, ministerio: updated });
});
app.delete("/api/ministerios/:id", requireAdmin, (req, res) => {
  const ok = db.deleteMinisterio(Number(req.params.id));
  res.json({ ok });
});

/* ---------- Auth ---------- */
app.post("/api/auth/register", (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const ministerio_id = req.body?.ministerio_id ? Number(req.body.ministerio_id) : null;

  if (!nombre || !email || !password) {
    return res.status(400).json({ ok: false, error: "Completa nombre, correo y contraseña" });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Correo no válido" });
  }
  if (db.getUserByEmailRaw(email)) {
    return res.status(409).json({ ok: false, error: "Ese correo ya está registrado" });
  }
  if (ministerio_id && !db.getMinisterioById(ministerio_id)) {
    return res.status(400).json({ ok: false, error: "Ministerio no válido" });
  }

  db.createUser({
    nombre,
    email,
    password_hash: hashPassword(password),
    role: "leader",
    ministerio_id,
    estado: "pending",
  });
  res.json({
    ok: true,
    message: "Tu solicitud quedó registrada. El pastor debe aprobar tu cuenta antes de poder ingresar.",
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = db.getUserByEmailRaw(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ ok: false, error: "Correo o contraseña incorrectos" });
  }
  if (user.estado === "pending") {
    return res.status(403).json({ ok: false, error: "Tu cuenta está pendiente de aprobación por el pastor." });
  }
  if (user.estado === "disabled") {
    return res.status(403).json({ ok: false, error: "Tu cuenta está desactivada. Contacta al pastor." });
  }
  setAuthCookie(res, user);
  res.json({ ok: true, user: db.getUserById(user.id) });
});

app.post("/api/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ ok: false, error: "No autenticado" });
  res.json({ ok: true, user });
});

/* ---------- Usuarios (admin) ---------- */
app.get("/api/users", requireAdmin, (req, res) => {
  const estado = req.query.estado ? String(req.query.estado) : undefined;
  res.json({ ok: true, users: db.listUsers({ estado }) });
});
app.patch("/api/users/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

  const fields = {};
  if (req.body?.nombre !== undefined) fields.nombre = String(req.body.nombre).trim();
  if (req.body?.estado !== undefined) fields.estado = req.body.estado;
  if (req.body?.role !== undefined) fields.role = req.body.role === "admin" ? "admin" : "leader";
  if (req.body?.ministerio_id !== undefined) {
    fields.ministerio_id = req.body.ministerio_id ? Number(req.body.ministerio_id) : null;
  }

  // Proteger: no degradar/desactivar al único admin, ni a sí mismo
  const quedaSinAdmin =
    target.role === "admin" &&
    ((fields.role && fields.role !== "admin") || fields.estado === "disabled") &&
    db.countAdmins() <= 1;
  if (quedaSinAdmin) {
    return res.status(400).json({ ok: false, error: "No puedes dejar la iglesia sin administrador." });
  }
  if (id === req.user.id && fields.estado === "disabled") {
    return res.status(400).json({ ok: false, error: "No puedes desactivar tu propia cuenta." });
  }

  res.json({ ok: true, user: db.updateUser(id, fields) });
});
app.delete("/api/users/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
  if (id === req.user.id) {
    return res.status(400).json({ ok: false, error: "No puedes eliminar tu propia cuenta." });
  }
  if (target.role === "admin" && db.countAdmins() <= 1) {
    return res.status(400).json({ ok: false, error: "No puedes eliminar al único administrador." });
  }
  res.json({ ok: db.deleteUser(id) });
});

/* ---------- Eventos ---------- */
app.get("/api/events", requireAuth, (_req, res) => {
  res.json({ ok: true, events: db.listEvents() });
});
app.post("/api/events", requireAdmin, (req, res) => {
  const titulo = String(req.body?.titulo || "").trim();
  const fecha = String(req.body?.fecha || "").trim();
  if (!titulo || !fecha) return res.status(400).json({ ok: false, error: "Faltan título y fecha" });
  const event = db.createEvent({
    titulo,
    descripcion: req.body?.descripcion ? String(req.body.descripcion).trim() : null,
    fecha,
    hora: req.body?.hora ? String(req.body.hora).trim() : null,
    tipo: req.body?.tipo === "especial" ? "especial" : "normal",
    creado_por: req.user.id,
  });
  res.json({ ok: true, event });
});
app.patch("/api/events/:id", requireAdmin, (req, res) => {
  const updated = db.updateEvent(Number(req.params.id), {
    titulo: req.body?.titulo,
    descripcion: req.body?.descripcion,
    fecha: req.body?.fecha,
    hora: req.body?.hora,
    tipo: req.body?.tipo,
  });
  if (!updated) return res.status(404).json({ ok: false, error: "Evento no encontrado" });
  res.json({ ok: true, event: updated });
});
app.delete("/api/events/:id", requireAdmin, (req, res) => {
  res.json({ ok: db.deleteEvent(Number(req.params.id)) });
});

/* ---------- Personas (members) ---------- */
function canTouchMember(user, member) {
  if (!member) return false;
  if (user.role === "admin") return true;
  return Number(member.ministerio_id) === Number(user.ministerio_id);
}

app.get("/api/members", requireAuth, (req, res) => {
  let ministerio_id = null;
  if (req.user.role === "admin") {
    ministerio_id = req.query.ministerio_id ? Number(req.query.ministerio_id) : null;
  } else {
    ministerio_id = req.user.ministerio_id || -1; // -1: si el líder no tiene ministerio, no ve nada
  }
  res.json({ ok: true, members: db.listMembers({ ministerio_id }) });
});
app.post("/api/members", requireAuth, (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  if (!nombre) return res.status(400).json({ ok: false, error: "Falta el nombre de la persona" });

  let ministerio_id;
  if (req.user.role === "admin") {
    ministerio_id = req.body?.ministerio_id ? Number(req.body.ministerio_id) : null;
  } else {
    ministerio_id = req.user.ministerio_id || null;
    if (!ministerio_id) {
      return res.status(400).json({ ok: false, error: "Tu cuenta no tiene un ministerio asignado. Pide al pastor que te lo asigne." });
    }
  }

  const member = db.createMember({
    nombre,
    telefono: req.body?.telefono ? String(req.body.telefono).trim() : null,
    email: req.body?.email ? String(req.body.email).trim() : null,
    direccion: req.body?.direccion ? String(req.body.direccion).trim() : null,
    ministerio_id,
    notas: req.body?.notas ? String(req.body.notas).trim() : null,
    registrado_por: req.user.id,
  });
  res.json({ ok: true, member });
});
app.patch("/api/members/:id", requireAuth, (req, res) => {
  const member = db.getMemberById(Number(req.params.id));
  if (!canTouchMember(req.user, member)) {
    return res.status(member ? 403 : 404).json({ ok: false, error: member ? "No puedes editar personas de otro ministerio" : "Persona no encontrada" });
  }
  const fields = {
    nombre: req.body?.nombre,
    telefono: req.body?.telefono,
    email: req.body?.email,
    direccion: req.body?.direccion,
    notas: req.body?.notas,
  };
  // Solo el admin puede cambiar el ministerio de una persona
  if (req.user.role === "admin" && req.body?.ministerio_id !== undefined) {
    fields.ministerio_id = req.body.ministerio_id ? Number(req.body.ministerio_id) : null;
  }
  res.json({ ok: true, member: db.updateMember(member.id, fields) });
});
app.delete("/api/members/:id", requireAuth, (req, res) => {
  const member = db.getMemberById(Number(req.params.id));
  if (!canTouchMember(req.user, member)) {
    return res.status(member ? 403 : 404).json({ ok: false, error: member ? "No puedes eliminar personas de otro ministerio" : "Persona no encontrada" });
  }
  res.json({ ok: db.deleteMember(member.id) });
});

/* ===================== Estáticos + 404 ===================== */
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders: (res, filePath) => {
      if (/\.(html|css|js)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

// 404 para rutas no encontradas
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "Ruta no encontrada" });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Manejo de errores
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ ok: false, error: "Error interno", detalle: err.message });
});

app.listen(PORT, () => {
  console.log(`Tú Iglesia corriendo en el puerto ${PORT}`);
  console.log(`Base de datos: ${db.DB_PATH}`);
});
