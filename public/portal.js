/* =========================================================
   Tú Iglesia — Portal de líderes (lógica del panel)
   ========================================================= */

const $ = (id) => document.getElementById(id);
const MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

let CURRENT = null;   // usuario actual
let IS_ADMIN = false;
let MINISTERIOS = [];

/* ---------- Utilidades ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}
function fmtFecha(fecha) {
  // fecha "YYYY-MM-DD"
  const m = String(fecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { d: "--", mes: "" };
  return { d: m[3], mes: MESES[Number(m[2]) - 1] || "" };
}
function fmtFechaLarga(fecha) {
  const f = fmtFecha(fecha);
  return `${f.d} ${f.mes}`;
}
async function api(method, url, body) {
  const opts = { method, headers: {}, credentials: "same-origin" };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  return { res, data };
}
let toastTimer;
function toast(msg, type = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 3200);
}

/* ---------- Modal ---------- */
let modalSaveHandler = null;
function openModal(title, bodyHtml, onSave) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  modalSaveHandler = onSave;
  $("modalBackdrop").classList.add("open");
}
function closeModal() {
  $("modalBackdrop").classList.remove("open");
  modalSaveHandler = null;
}
$("modalCancel").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", (e) => { if (e.target === $("modalBackdrop")) closeModal(); });
$("modalSave").addEventListener("click", async () => {
  if (modalSaveHandler) await modalSaveHandler();
});

function ministerioOptions(selectedId) {
  return MINISTERIOS.map((m) =>
    `<option value="${m.id}" ${Number(selectedId) === m.id ? "selected" : ""}>${escapeHtml(m.nombre)}</option>`
  ).join("");
}

/* ---------- Arranque ---------- */
async function init() {
  const { res, data } = await api("GET", "/api/auth/me");
  if (!res.ok || !data.ok) {
    window.location.href = "/login.html";
    return;
  }
  CURRENT = data.user;
  IS_ADMIN = CURRENT.role === "admin";

  $("whoName").textContent = CURRENT.nombre;
  $("whoRole").textContent = IS_ADMIN ? "Administrador (Pastoral)" : (CURRENT.ministerio_nombre || "Líder");

  // Mostrar/ocultar elementos solo-admin
  document.querySelectorAll("[data-admin]").forEach((el) => {
    el.style.display = IS_ADMIN ? "" : "none";
  });
  if (!IS_ADMIN) {
    $("personasSub").textContent = `Personas de tu ministerio: ${CURRENT.ministerio_nombre || "—"}`;
  }

  await loadMinisterios();
  setupNav();
  loadEvents();
  loadMembers();
  if (IS_ADMIN) { loadUsers(); renderMinisterios(); }
}

/* ---------- Navegación ---------- */
function setupNav() {
  document.querySelectorAll(".sidebar button[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
      $(`sec-${btn.dataset.section}`).classList.add("active");
    });
  });
  $("reporteBtn")?.addEventListener("click", () => window.open("/reporte.html", "_blank"));
  $("logoutBtn").addEventListener("click", async () => {
    await api("POST", "/api/auth/logout");
    window.location.href = "/login.html";
  });
}

/* ---------- Ministerios ---------- */
async function loadMinisterios() {
  const { data } = await api("GET", IS_ADMIN ? "/api/ministerios/all" : "/api/ministerios");
  MINISTERIOS = data.ministerios || [];
  // filtro de personas (admin)
  const filter = $("filterMinisterio");
  if (filter && IS_ADMIN) {
    filter.innerHTML = `<option value="">Todos los ministerios</option>` +
      MINISTERIOS.map((m) => `<option value="${m.id}">${escapeHtml(m.nombre)}</option>`).join("");
    filter.onchange = () => loadMembers();
  }
}

function renderMinisterios() {
  const wrap = $("ministeriosWrap");
  if (!MINISTERIOS.length) { wrap.innerHTML = `<div class="empty">Sin ministerios.</div>`; return; }
  wrap.innerHTML = `<table class="table"><thead><tr><th>Ministerio</th><th>Estado</th><th></th></tr></thead><tbody>${
    MINISTERIOS.map((m) => `
      <tr>
        <td>${escapeHtml(m.nombre)}</td>
        <td>${m.activo ? '<span class="badge active">Activo</span>' : '<span class="badge disabled">Inactivo</span>'}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" onclick="toggleMinisterio(${m.id}, ${m.activo ? 0 : 1})">${m.activo ? "Desactivar" : "Activar"}</button>
          <button class="btn btn-danger btn-sm" onclick="removeMinisterio(${m.id})">Eliminar</button>
        </td>
      </tr>`).join("")
  }</tbody></table>`;
}
$("addMinisterioBtn")?.addEventListener("click", () => {
  openModal("Nuevo ministerio", `
    <div class="field"><label>Nombre</label><input id="mNombre" placeholder="Ej: Intercesión" /></div>
  `, async () => {
    const nombre = $("mNombre").value.trim();
    if (!nombre) return toast("Escribe un nombre", "error");
    const { res, data } = await api("POST", "/api/ministerios", { nombre });
    if (!res.ok) return toast(data.error || "Error", "error");
    closeModal(); toast("Ministerio creado", "success");
    await loadMinisterios(); renderMinisterios();
  });
});
async function toggleMinisterio(id, activo) {
  const { res, data } = await api("PATCH", `/api/ministerios/${id}`, { activo });
  if (!res.ok) return toast(data.error || "Error", "error");
  await loadMinisterios(); renderMinisterios(); toast("Actualizado", "success");
}
async function removeMinisterio(id) {
  if (!confirm("¿Eliminar este ministerio?")) return;
  const { res, data } = await api("DELETE", `/api/ministerios/${id}`);
  if (!res.ok) return toast(data.error || "Error", "error");
  await loadMinisterios(); renderMinisterios(); toast("Eliminado", "success");
}

/* ---------- Eventos (calendario) ---------- */
let ALL_EVENTS = [];
let SELECTED_MONTH = null;
const MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

// "Hoy" según la hora de Bogotá (America/Bogota), independiente del dispositivo
function bogotaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDaysStr(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}
function weekdayName(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}
function whenLabel(ymd, today) {
  if (ymd === today) return "Hoy";
  if (ymd === addDaysStr(today, 1)) return "Mañana";
  const [, m, d] = ymd.split("-").map(Number);
  return `${weekdayName(ymd)}|${d} ${MESES_LARGO[m - 1]}`;
}

async function loadEvents() {
  const { data } = await api("GET", "/api/events");
  ALL_EVENTS = data.events || [];
  const today = bogotaToday();
  renderProximas(today);
  renderMesTabs(today);
  const curMonth = today.slice(0, 7);
  SELECTED_MONTH = ALL_EVENTS.some((e) => e.fecha.slice(0, 7) === curMonth)
    ? curMonth
    : (ALL_EVENTS[0] ? ALL_EVENTS[0].fecha.slice(0, 7) : curMonth);
  renderMonth(SELECTED_MONTH, today);
}

function renderProximas(today) {
  const box = $("proximasList");
  const prox = ALL_EVENTS.filter((e) => e.fecha >= today).slice(0, 12);
  if (!prox.length) { box.innerHTML = `<div class="empty">No hay actividades próximas.</div>`; return; }
  box.innerHTML = prox.map((ev) => {
    const wl = whenLabel(ev.fecha, today).split("|");
    const when = wl.length > 1 ? `${wl[0]}<small>${wl[1]}</small>` : wl[0];
    return `<div class="prox-item ${ev.fecha === today ? "hoy" : ""}">
      <div class="prox-when">${when}</div>
      <div class="prox-body"><span class="t">${escapeHtml(ev.titulo)}</span>
        ${ev.tipo === "especial" ? '<span class="badge especial" style="margin-left:.4rem">Especial</span>' : ""}</div>
      ${ev.hora ? `<div class="prox-hora">🕒 ${escapeHtml(ev.hora)}</div>` : ""}
    </div>`;
  }).join("");
}

function renderMesTabs(today) {
  const tabs = $("mesTabs");
  const meses = [...new Set(ALL_EVENTS.map((e) => e.fecha.slice(0, 7)))].sort();
  tabs.innerHTML = meses.map((ym) => {
    const nombre = MESES_LARGO[Number(ym.slice(5, 7)) - 1];
    return `<button class="mes-tab" data-month="${ym}">${nombre[0].toUpperCase() + nombre.slice(1)}</button>`;
  }).join("");
  tabs.querySelectorAll(".mes-tab").forEach((b) => {
    b.addEventListener("click", () => { SELECTED_MONTH = b.dataset.month; renderMonth(SELECTED_MONTH, today); });
  });
}

function renderMonth(ym, today) {
  $("mesTabs").querySelectorAll(".mes-tab").forEach((b) => b.classList.toggle("active", b.dataset.month === ym));
  const list = $("eventsList");
  const evs = ALL_EVENTS.filter((e) => e.fecha.slice(0, 7) === ym);
  if (!evs.length) { list.innerHTML = `<div class="empty">Sin actividades este mes.</div>`; return; }
  list.innerHTML = evs.map((ev) => {
    const f = fmtFecha(ev.fecha);
    return `<div class="card event-card ${ev.fecha === today ? "hoy" : ""}">
      <div class="event-date"><span class="d">${f.d}</span><span class="m">${f.mes}</span></div>
      <div style="flex:1">
        <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
          <h3 style="font-size:1.15rem">${escapeHtml(ev.titulo)}</h3>
          ${ev.tipo === "especial" ? '<span class="badge especial">Especial</span>' : ""}
          ${ev.hora ? `<span class="sub">🕒 ${escapeHtml(ev.hora)}</span>` : ""}
          ${ev.fecha === today ? '<span class="badge admin">Hoy</span>' : ""}
        </div>
        ${ev.descripcion ? `<p class="sub" style="margin:.3rem 0 0">${escapeHtml(ev.descripcion)}</p>` : ""}
      </div>
      ${IS_ADMIN ? `<div class="actions">
        <button class="btn btn-ghost btn-sm" onclick='editEvent(${JSON.stringify(ev).replace(/'/g, "&#39;")})'>Editar</button>
        <button class="btn btn-danger btn-sm" onclick="removeEvent(${ev.id})">Borrar</button>
      </div>` : ""}
    </div>`;
  }).join("");
}
function eventForm(ev = {}) {
  return `
    <div class="field"><label>Título</label><input id="evTitulo" value="${escapeHtml(ev.titulo || "")}" placeholder="Ej: Vigilia de oración" /></div>
    <div class="row">
      <div class="field"><label>Fecha</label><input type="date" id="evFecha" value="${escapeHtml(ev.fecha || "")}" /></div>
      <div class="field"><label>Hora (opcional)</label><input id="evHora" value="${escapeHtml(ev.hora || "")}" placeholder="7:00 PM" /></div>
    </div>
    <div class="field"><label>Tipo</label>
      <select id="evTipo">
        <option value="normal" ${ev.tipo !== "especial" ? "selected" : ""}>Evento normal</option>
        <option value="especial" ${ev.tipo === "especial" ? "selected" : ""}>Evento especial</option>
      </select>
    </div>
    <div class="field"><label>Descripción (opcional)</label><textarea id="evDesc" rows="3">${escapeHtml(ev.descripcion || "")}</textarea></div>`;
}
$("addEventBtn")?.addEventListener("click", () => {
  openModal("Nuevo evento", eventForm(), () => saveEvent(null));
});
function editEvent(ev) {
  openModal("Editar evento", eventForm(ev), () => saveEvent(ev.id));
}
async function saveEvent(id) {
  const payload = {
    titulo: $("evTitulo").value.trim(),
    fecha: $("evFecha").value,
    hora: $("evHora").value.trim() || null,
    tipo: $("evTipo").value,
    descripcion: $("evDesc").value.trim() || null,
  };
  if (!payload.titulo || !payload.fecha) return toast("Título y fecha son obligatorios", "error");
  const { res, data } = id
    ? await api("PATCH", `/api/events/${id}`, payload)
    : await api("POST", "/api/events", payload);
  if (!res.ok) return toast(data.error || "Error", "error");
  closeModal(); toast(id ? "Evento actualizado" : "Evento creado", "success");
  loadEvents();
}
async function removeEvent(id) {
  if (!confirm("¿Borrar este evento?")) return;
  const { res, data } = await api("DELETE", `/api/events/${id}`);
  if (!res.ok) return toast(data.error || "Error", "error");
  toast("Evento borrado", "success"); loadEvents();
}

/* ---------- Personas ---------- */
async function loadMembers() {
  let url = "/api/members";
  if (IS_ADMIN) {
    const f = $("filterMinisterio").value;
    if (f) url += `?ministerio_id=${f}`;
  }
  const { data } = await api("GET", url);
  const members = data.members || [];
  const wrap = $("membersWrap");
  if (!members.length) { wrap.innerHTML = `<div class="empty">Aún no hay personas registradas.</div>`; return; }
  wrap.innerHTML = `<table class="table"><thead><tr>
      <th>Nombre</th><th>Teléfono</th><th>Correo</th>${IS_ADMIN ? "<th>Ministerio</th>" : ""}<th></th>
    </tr></thead><tbody>${
    members.map((m) => `<tr>
      <td><strong>${escapeHtml(m.nombre)}</strong>${m.direccion ? `<br><span class="sub">${escapeHtml(m.direccion)}</span>` : ""}</td>
      <td>${escapeHtml(m.telefono || "—")}</td>
      <td>${escapeHtml(m.email || "—")}</td>
      ${IS_ADMIN ? `<td>${escapeHtml(m.ministerio_nombre || "—")}</td>` : ""}
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick='editMember(${JSON.stringify(m)})'>Editar</button>
        <button class="btn btn-danger btn-sm" onclick="removeMember(${m.id})">Borrar</button>
      </td>
    </tr>`).join("")
  }</tbody></table>`;
}
function memberForm(m = {}) {
  return `
    <div class="field"><label>Nombre completo</label><input id="meNombre" value="${escapeHtml(m.nombre || "")}" /></div>
    <div class="row">
      <div class="field"><label>Teléfono</label><input id="meTel" value="${escapeHtml(m.telefono || "")}" /></div>
      <div class="field"><label>Correo</label><input id="meEmail" value="${escapeHtml(m.email || "")}" /></div>
    </div>
    <div class="field"><label>Dirección</label><input id="meDir" value="${escapeHtml(m.direccion || "")}" /></div>
    ${IS_ADMIN ? `<div class="field"><label>Ministerio</label><select id="meMin"><option value="">Sin ministerio</option>${ministerioOptions(m.ministerio_id)}</select></div>` : ""}
    <div class="field"><label>Notas (opcional)</label><textarea id="meNotas" rows="2">${escapeHtml(m.notas || "")}</textarea></div>`;
}
$("addMemberBtn")?.addEventListener("click", () => {
  if (!IS_ADMIN && !CURRENT.ministerio_id) {
    return toast("El pastor aún no te asignó un ministerio.", "error");
  }
  openModal("Registrar persona", memberForm(), () => saveMember(null));
});
function editMember(m) {
  openModal("Editar persona", memberForm(m), () => saveMember(m.id));
}
async function saveMember(id) {
  const payload = {
    nombre: $("meNombre").value.trim(),
    telefono: $("meTel").value.trim() || null,
    email: $("meEmail").value.trim() || null,
    direccion: $("meDir").value.trim() || null,
    notas: $("meNotas").value.trim() || null,
  };
  if (IS_ADMIN && $("meMin")) payload.ministerio_id = $("meMin").value || null;
  if (!payload.nombre) return toast("El nombre es obligatorio", "error");
  const { res, data } = id
    ? await api("PATCH", `/api/members/${id}`, payload)
    : await api("POST", "/api/members", payload);
  if (!res.ok) return toast(data.error || "Error", "error");
  closeModal(); toast(id ? "Persona actualizada" : "Persona registrada", "success");
  loadMembers();
}
async function removeMember(id) {
  if (!confirm("¿Borrar esta persona?")) return;
  const { res, data } = await api("DELETE", `/api/members/${id}`);
  if (!res.ok) return toast(data.error || "Error", "error");
  toast("Persona borrada", "success"); loadMembers();
}

/* ---------- Usuarios / Aprobaciones (admin) ---------- */
async function loadUsers() {
  const { data } = await api("GET", "/api/users");
  const users = data.users || [];
  const wrap = $("usersWrap");
  const pendientes = users.filter((u) => u.estado === "pending");
  const otros = users.filter((u) => u.estado !== "pending");
  const rowFor = (u) => `<tr>
      <td><strong>${escapeHtml(u.nombre)}</strong><br><span class="sub">${escapeHtml(u.email)}</span></td>
      <td>${escapeHtml(u.ministerio_nombre || "—")}</td>
      <td>${u.role === "admin" ? '<span class="badge admin">Admin</span>' : "Líder"}</td>
      <td><span class="badge ${u.estado}">${u.estado === "active" ? "Activo" : u.estado === "pending" ? "Pendiente" : "Inactivo"}</span></td>
      <td class="actions">
        ${u.estado === "pending" ? `<button class="btn btn-primary btn-sm" onclick='approveUser(${JSON.stringify(u)})'>Aprobar</button>` : `<button class="btn btn-ghost btn-sm" onclick='editUser(${JSON.stringify(u)})'>Editar</button>`}
        ${u.id !== CURRENT.id ? `<button class="btn btn-danger btn-sm" onclick="removeUser(${u.id})">Eliminar</button>` : ""}
      </td>
    </tr>`;
  wrap.innerHTML = `
    ${pendientes.length ? `<div class="card"><h3 style="font-size:1.1rem;margin-bottom:.6rem">⏳ Solicitudes pendientes (${pendientes.length})</h3>
      <table class="table"><thead><tr><th>Líder</th><th>Ministerio</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${pendientes.map(rowFor).join("")}</tbody></table></div>` : ""}
    <div class="card"><h3 style="font-size:1.1rem;margin-bottom:.6rem">Líderes y cuentas</h3>
      ${otros.length ? `<table class="table"><thead><tr><th>Líder</th><th>Ministerio</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${otros.map(rowFor).join("")}</tbody></table>` : `<div class="empty">Aún no hay cuentas activas.</div>`}
    </div>`;
}
function userForm(u = {}) {
  return `
    <div class="field"><label>Nombre</label><input id="usNombre" value="${escapeHtml(u.nombre || "")}" /></div>
    <div class="field"><label>Ministerio</label><select id="usMin"><option value="">Sin ministerio</option>${ministerioOptions(u.ministerio_id)}</select></div>
    <div class="row">
      <div class="field"><label>Rol</label><select id="usRole">
        <option value="leader" ${u.role !== "admin" ? "selected" : ""}>Líder</option>
        <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option>
      </select></div>
      <div class="field"><label>Estado</label><select id="usEstado">
        <option value="active" ${u.estado === "active" ? "selected" : ""}>Activo</option>
        <option value="pending" ${u.estado === "pending" ? "selected" : ""}>Pendiente</option>
        <option value="disabled" ${u.estado === "disabled" ? "selected" : ""}>Inactivo</option>
      </select></div>
    </div>`;
}
function approveUser(u) {
  openModal(`Aprobar a ${u.nombre}`, userForm({ ...u, estado: "active" }), () => saveUser(u.id));
}
function editUser(u) {
  openModal(`Editar ${u.nombre}`, userForm(u), () => saveUser(u.id));
}
async function saveUser(id) {
  const payload = {
    nombre: $("usNombre").value.trim(),
    ministerio_id: $("usMin").value || null,
    role: $("usRole").value,
    estado: $("usEstado").value,
  };
  const { res, data } = await api("PATCH", `/api/users/${id}`, payload);
  if (!res.ok) return toast(data.error || "Error", "error");
  closeModal(); toast("Cuenta actualizada", "success"); loadUsers();
}
async function removeUser(id) {
  if (!confirm("¿Eliminar esta cuenta de líder?")) return;
  const { res, data } = await api("DELETE", `/api/users/${id}`);
  if (!res.ok) return toast(data.error || "Error", "error");
  toast("Cuenta eliminada", "success"); loadUsers();
}

// Exponer funciones usadas en onclick inline
Object.assign(window, {
  editEvent, removeEvent, editMember, removeMember,
  approveUser, editUser, removeUser, toggleMinisterio, removeMinisterio,
});

init();
