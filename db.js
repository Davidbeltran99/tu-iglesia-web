/* =========================================================
   Tú Iglesia — Base de datos (almacén JSON, sin dependencias nativas)
   Colecciones: ministerios, users, events, members
   Volumen pequeño (una iglesia): un archivo JSON en disco es suficiente,
   robusto y funciona en cualquier versión de Node / Railway.
   ========================================================= */

const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "iglesia.json");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

/* ---------- Carga / guardado ---------- */
function emptyData() {
  return {
    seq: { ministerios: 0, users: 0, events: 0, members: 0 },
    ministerios: [],
    users: [],
    events: [],
    members: [],
  };
}

let data = emptyData();
if (fs.existsSync(DB_PATH)) {
  try {
    data = { ...emptyData(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
  } catch (e) {
    console.error("[db] No se pudo leer la base, se respalda y se empieza vacía:", e.message);
    try { fs.renameSync(DB_PATH, `${DB_PATH}.corrupto-${Date.now()}`); } catch {}
    data = emptyData();
  }
}

function save() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH); // escritura atómica
}

function nextId(coll) {
  data.seq[coll] = (data.seq[coll] || 0) + 1;
  return data.seq[coll];
}
const nowISO = () => new Date().toISOString();

/* ---------- Utilidades ---------- */
function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ---------- Seeds ---------- */
function seedMinisterios() {
  const base = ["Pastoral", "Alabanza", "Audiovisual", "Escuela Dominical", "Ujieres"];
  let changed = false;
  base.forEach((nombre) => {
    const slug = slugify(nombre);
    if (!data.ministerios.some((m) => m.slug === slug)) {
      data.ministerios.push({ id: nextId("ministerios"), nombre, slug, activo: 1, created_at: nowISO() });
      changed = true;
    }
  });
  if (changed) save();
}
seedMinisterios();

/* ---------- Ministerios ---------- */
function listMinisterios({ soloActivos = false } = {}) {
  const arr = soloActivos ? data.ministerios.filter((m) => m.activo) : data.ministerios.slice();
  return arr.sort((a, b) => a.nombre.localeCompare(b.nombre));
}
function getMinisterioById(id) {
  return data.ministerios.find((m) => m.id === Number(id)) || null;
}
function createMinisterio(nombre) {
  const slug = slugify(nombre);
  if (data.ministerios.some((m) => m.slug === slug)) {
    const err = new Error("Ese ministerio ya existe");
    throw err;
  }
  const m = { id: nextId("ministerios"), nombre, slug, activo: 1, created_at: nowISO() };
  data.ministerios.push(m);
  save();
  return m;
}
function updateMinisterio(id, { nombre, activo } = {}) {
  const m = getMinisterioById(id);
  if (!m) return null;
  if (nombre != null) { m.nombre = nombre; m.slug = slugify(nombre); }
  if (activo != null) m.activo = activo ? 1 : 0;
  save();
  return m;
}
function deleteMinisterio(id) {
  const before = data.ministerios.length;
  data.ministerios = data.ministerios.filter((m) => m.id !== Number(id));
  const removed = data.ministerios.length < before;
  if (removed) save();
  return removed;
}

/* ---------- Users ---------- */
function hydrateUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  const min = u.ministerio_id ? getMinisterioById(u.ministerio_id) : null;
  return { ...safe, ministerio_nombre: min ? min.nombre : null };
}
function getUserByEmailRaw(email) {
  const e = String(email || "").trim().toLowerCase();
  const u = data.users.find((x) => x.email === e);
  return u ? { ...u } : null;
}
function getUserRawById(id) {
  const u = data.users.find((x) => x.id === Number(id));
  return u ? { ...u } : null;
}
function getUserById(id) {
  return hydrateUser(data.users.find((x) => x.id === Number(id)));
}
function createUser({ nombre, email, password_hash, role = "leader", ministerio_id = null, estado = "pending" }) {
  const u = {
    id: nextId("users"),
    nombre,
    email: String(email).trim().toLowerCase(),
    password_hash,
    role,
    ministerio_id: ministerio_id ? Number(ministerio_id) : null,
    estado,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  data.users.push(u);
  save();
  return hydrateUser(u);
}
function listUsers({ estado } = {}) {
  let arr = data.users.slice();
  if (estado) arr = arr.filter((u) => u.estado === estado);
  arr.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return arr.map(hydrateUser);
}
function updateUser(id, fields = {}) {
  const u = data.users.find((x) => x.id === Number(id));
  if (!u) return null;
  if (fields.nombre !== undefined) u.nombre = fields.nombre;
  if (fields.role !== undefined) u.role = fields.role;
  if (fields.ministerio_id !== undefined) u.ministerio_id = fields.ministerio_id ? Number(fields.ministerio_id) : null;
  if (fields.estado !== undefined) u.estado = fields.estado;
  if (fields.password_hash !== undefined) u.password_hash = fields.password_hash;
  u.updated_at = nowISO();
  save();
  return hydrateUser(u);
}
function deleteUser(id) {
  const before = data.users.length;
  data.users = data.users.filter((u) => u.id !== Number(id));
  const removed = data.users.length < before;
  if (removed) save();
  return removed;
}
function countAdmins() {
  return data.users.filter((u) => u.role === "admin").length;
}

/* ---------- Events ---------- */
function getEventById(id) {
  return data.events.find((e) => e.id === Number(id)) || null;
}
function listEvents() {
  return data.events.slice().sort((a, b) => {
    const f = String(a.fecha).localeCompare(String(b.fecha));
    return f !== 0 ? f : String(a.hora || "").localeCompare(String(b.hora || ""));
  });
}
function createEvent({ titulo, descripcion = null, fecha, hora = null, tipo = "normal", creado_por = null }) {
  const ev = { id: nextId("events"), titulo, descripcion, fecha, hora, tipo, creado_por, created_at: nowISO() };
  data.events.push(ev);
  save();
  return ev;
}
function updateEvent(id, fields = {}) {
  const ev = getEventById(id);
  if (!ev) return null;
  ["titulo", "descripcion", "fecha", "hora", "tipo"].forEach((k) => {
    if (fields[k] !== undefined) ev[k] = fields[k];
  });
  save();
  return ev;
}
function deleteEvent(id) {
  const before = data.events.length;
  data.events = data.events.filter((e) => e.id !== Number(id));
  const removed = data.events.length < before;
  if (removed) save();
  return removed;
}

/* ---------- Members (personas) ---------- */
function hydrateMember(m) {
  if (!m) return null;
  const min = m.ministerio_id ? getMinisterioById(m.ministerio_id) : null;
  return { ...m, ministerio_nombre: min ? min.nombre : null };
}
function getMemberById(id) {
  return hydrateMember(data.members.find((m) => m.id === Number(id)));
}
function listMembers({ ministerio_id = null } = {}) {
  let arr = data.members.slice();
  if (ministerio_id != null) arr = arr.filter((m) => Number(m.ministerio_id) === Number(ministerio_id));
  arr.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return arr.map(hydrateMember);
}
function createMember({ nombre, telefono = null, email = null, direccion = null, ministerio_id = null, notas = null, registrado_por = null }) {
  const m = {
    id: nextId("members"),
    nombre,
    telefono,
    email,
    direccion,
    ministerio_id: ministerio_id ? Number(ministerio_id) : null,
    notas,
    registrado_por,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  data.members.push(m);
  save();
  return hydrateMember(m);
}
function updateMember(id, fields = {}) {
  const m = data.members.find((x) => x.id === Number(id));
  if (!m) return null;
  ["nombre", "telefono", "email", "direccion", "notas"].forEach((k) => {
    if (fields[k] !== undefined) m[k] = fields[k];
  });
  if (fields.ministerio_id !== undefined) m.ministerio_id = fields.ministerio_id ? Number(fields.ministerio_id) : null;
  m.updated_at = nowISO();
  save();
  return hydrateMember(m);
}
function deleteMember(id) {
  const before = data.members.length;
  data.members = data.members.filter((m) => m.id !== Number(id));
  const removed = data.members.length < before;
  if (removed) save();
  return removed;
}

module.exports = {
  DB_PATH,
  slugify,
  listMinisterios, getMinisterioById, createMinisterio, updateMinisterio, deleteMinisterio,
  hydrateUser, getUserByEmailRaw, getUserById, getUserRawById, createUser, listUsers, updateUser, deleteUser, countAdmins,
  listEvents, getEventById, createEvent, updateEvent, deleteEvent,
  listMembers, getMemberById, createMember, updateMember, deleteMember,
};
