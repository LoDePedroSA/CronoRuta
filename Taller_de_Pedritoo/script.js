/* ============================================================
   CONFIGURACIÓN FIREBASE
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyC0Jimi-JuSIF6R18xEB26gHmK2QhIHCKk",
  authDomain: "armadosstudios.firebaseapp.com",
  projectId: "armadosstudios",
  storageBucket: "armadosstudios.firebasestorage.app",
  messagingSenderId: "750018454804",
  appId: "1:750018454804:web:3cdb44ea4d63cfca050e01"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   TOASTS (notificaciones)
============================================================ */
function showToast(message, type = "info", duration = 5000) {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.log("[Toast]", type, message);
    return;
  }

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️"
  };

  const toast = document.createElement("div");
  toast.className = "toast " + type;

  const iconEl = document.createElement("span");
  iconEl.className = "toast-icon";
  iconEl.textContent = icons[type] || icons.info;

  const textEl = document.createElement("span");
  textEl.className = "toast-text";
  textEl.textContent = message;

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   SISTEMA DE ROLES
============================================================ */
function isAdmin() {
  return localStorage.getItem("admin") === "true";
}

function updateUIBasedOnRole() {
  const admin = isAdmin();

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = admin ? "" : "none";
  });

  document.getElementById("floating-btn").textContent = admin ? "🔓" : "🔐";
  document.getElementById("login-menu").classList.remove("open");
  document.getElementById("logout-menu").classList.remove("open");

  const active = document.querySelector(".tab-section.active");
  if (!admin && active && active.classList.contains("admin-only")) {
    switchTab("inicio");
  }
}

/* ============================================================
   NAVEGACIÓN CON PILA + MEMORIA DE SCROLL
============================================================ */
const navStack = []; // [{tab, scrollY}]
let currentTab = null;
let isNavigating = false;

const scrollMemory = {}; // tabId -> scrollY

function switchTab(tabId, options = {}) {
  if (isNavigating) return;
  if (tabId === currentTab && !options.force) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  isNavigating = true;

  // Guardar scroll de la pestaña actual
  if (currentTab) {
    scrollMemory[currentTab] = window.scrollY;
  }

  // Actualizar pila
  if (options.push !== false && currentTab && currentTab !== tabId) {
    navStack.push({ tab: currentTab, scrollY: scrollMemory[currentTab] || 0 });
  }

  // Cambiar de pestaña
  document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
  const sec = document.getElementById(tabId);
  if (sec) sec.classList.add("active");

  currentTab = tabId;

  // Restaurar scroll
  const targetY = (options.restoreScroll !== false && scrollMemory[tabId] != null)
    ? scrollMemory[tabId]
    : 0;

  setTimeout(() => {
    window.scrollTo({ top: targetY, behavior: options.smoothScroll ? "smooth" : "auto" });
    isNavigating = false;
  }, 30);

  if (tabId === "nuevo-pedido-pag") {
    prepararNuevoPedido();
  }
}

function goBack() {
  if (navStack.length === 0) return false;
  const prev = navStack.pop();
  switchTab(prev.tab, { push: false, restoreScroll: true, force: true });
  setTimeout(() => {
    window.scrollTo({ top: prev.scrollY, behavior: "auto" });
  }, 40);
  return true;
}

// Escape → volver atrás
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const loginMenu = document.getElementById("login-menu");
    const logoutMenu = document.getElementById("logout-menu");
    const modalCliente = document.getElementById("modal-cliente");

    if (modalCliente && modalCliente.style.display === "block") {
      cerrarModalCliente();
      return;
    }
    if (loginMenu.classList.contains("open")) {
      loginMenu.classList.remove("open");
      return;
    }
    if (logoutMenu.classList.contains("open")) {
      logoutMenu.classList.remove("open");
      return;
    }

    goBack();
  }
});

/* ============================================================
   BOTÓN Y MENÚS FLOTANTES
============================================================ */
function toggleFloatingMenu() {
  const admin = isAdmin();
  const menuId = admin ? "logout-menu" : "login-menu";
  const otherId = admin ? "login-menu" : "logout-menu";

  document.getElementById(otherId).classList.remove("open");
  document.getElementById(menuId).classList.toggle("open");
}

/* ============================================================
   LOGIN
============================================================ */
document.getElementById("login-input").addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "").slice(0, 6);
  this.value = v;
  document.getElementById("login-error").textContent = "";

  if (v.length === 6) verifyLogin(v);
});

async function verifyLogin(clave) {
  try {
    const doc = await db.collection("admin").doc("clave").get();
    const stored = doc.exists ? doc.data().clave : null;

    if (stored !== null && String(stored) === clave) {
      localStorage.setItem("admin", "true");
      document.getElementById("login-input").value = "";
      updateUIBasedOnRole();
      showToast("Sesión iniciada como administrador.", "success");
    } else {
      document.getElementById("login-error").textContent = "Clave incorrecta";
      document.getElementById("login-input").value = "";
    }
  } catch (e) {
    console.error(e);
    document.getElementById("login-error").textContent = "Error de conexión con la base de datos";
    document.getElementById("login-input").value = "";
  }
}

function logout() {
  localStorage.removeItem("admin");
  updateUIBasedOnRole();
  document.getElementById("logout-menu").classList.remove("open");
  showToast("Sesión cerrada.", "info");
}

/* ============================================================
   INPUTS DE NUT (solo A-Z y 0-9, en MAYÚSCULAS)
============================================================ */
["nut-mod", "nut-eliminar", "nut-estado"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
});

/* ============================================================
   VERIFICAR NUT
============================================================ */
async function verificarNUT(origen) {
  let inputId;

  if (origen === "mod") inputId = "nut-mod";
  else if (origen === "eliminar") inputId = "nut-eliminar";
  else if (origen === "estado") inputId = "nut-estado";
  else return;

  const nut = document.getElementById(inputId).value.trim();

  if (!nut) {
    showToast("Por favor, introducí un NUT.", "warning");
    return;
  }

  try {
    const doc = await db.collection("ticket").doc(nut).get();

    if (!doc.exists) {
      showToast("NUT no encontrado.", "error");
      return;
    }

    if (origen === "estado") {
      window.location.href =
        "https://lodepedrosa.github.io/CronoRuta/Taller_de_Pedritoo/index.html?=" + encodeURIComponent(nut);
    } else if (origen === "mod") {
      await loadModPedido(nut, doc.data());
      switchTab("mod-pedido-pag");
      document.getElementById("nut-mod").value = "";
    } else if (origen === "eliminar") {
      if (confirm("¿Seguro que querés eliminar el pedido " + nut + "?")) {
        await db.collection("ticket").doc(nut).delete();
        showToast("Pedido " + nut + " eliminado correctamente.", "success");
        document.getElementById("nut-eliminar").value = "";
      }
    }
  } catch (e) {
    console.error(e);
    showToast("Error al verificar el NUT.", "error");
  }
}

/* ============================================================
   HELPERS DE CAMPOS DINÁMICOS ("cosas-pedido") CON CHECKBOX
============================================================ */
function addCosaInput(containerId, className, value, completada) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement("div");
  row.className = "cosa-row";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = className + "-check";
  check.checked = !!completada;
  check.title = "Marcar como completado";

  const input = document.createElement("input");
  input.type = "text";
  input.className = className;
  input.value = value || "";
  input.placeholder = "Detalle del pedido";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "×";
  btn.title = "Eliminar detalle";
  btn.onclick = () => row.remove();

  row.appendChild(check);
  row.appendChild(input);
  row.appendChild(btn);
  container.appendChild(row);
}

function recolectarCosas(containerId, className) {
  const rows = document.querySelectorAll("#" + containerId + " .cosa-row");
  const cosas = [];
  const completadas = [];
  rows.forEach(row => {
    const input = row.querySelector("." + className);
    const check = row.querySelector("." + className + "-check");
    if (!input) return;
    const val = input.value.trim();
    if (val) {
      cosas.push(val);
      completadas.push(!!(check && check.checked));
    }
  });
  return { cosas: cosas.join("</>"), completadas: completadas };
}

/* ============================================================
   HELPER: SELECT
============================================================ */
function setSelectValue(selectId, value) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const val = value || "";
  const exists = Array.from(sel.options).some(o => o.value === val);
  if (!exists && val) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.appendChild(opt);
  }
  sel.value = val;
}

/* ============================================================
   HELPER: lectura retrocompatible cliente/teléfono o titular
============================================================ */
function getCliente(data) {
  if (data.cliente) return data.cliente;
  if (data.titular) {
    const t = String(data.titular).trim();
    if (/^[+\d\s\-()]+$/.test(t)) return "";
    return t;
  }
  return "";
}

function getTelefono(data) {
  if (data.telefono) return data.telefono;
  if (data.titular) {
    const t = String(data.titular).trim();
    if (/^[+\d\s\-()]+$/.test(t)) return t;
  }
  return "";
}

/* ============================================================
   COPIAR AL PORTAPAPELES
============================================================ */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("Clipboard API falló, usando fallback:", e);
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    console.error("No se pudo copiar al portapapeles:", e);
    return false;
  }
}

/* ============================================================
   SISTEMA DE CLIENTES
============================================================ */
let cachedClientes = null;

async function cargarClientes(force = false) {
  if (cachedClientes && !force) return cachedClientes;
  const snap = await db.collection("clientes").orderBy("nombre").get();
  cachedClientes = [];
  snap.forEach(doc => cachedClientes.push({ id: doc.id, ...doc.data() }));
  return cachedClientes;
}

function invalidarCacheClientes() {
  cachedClientes = null;
}

async function llenarSelectClientes(selectId, clienteIdSeleccionado) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const clientes = await cargarClientes();
    sel.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clientes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre + (c.telefono ? " — " + c.telefono : "");
      sel.appendChild(opt);
    });
    if (clienteIdSeleccionado) sel.value = clienteIdSeleccionado;
  } catch (e) {
    console.error("Error cargando clientes:", e);
    showToast("No se pudieron cargar los clientes: " + e.message, "error");
  }
}

/* --- Modal de crear cliente --- */
let contextoModalCliente = null; // 'nuevo' | 'mod'

function abrirModalCliente(contexto) {
  contextoModalCliente = contexto;
  document.getElementById("nc-nombre").value = "";
  document.getElementById("nc-telefono").value = "";
  document.getElementById("nc-error").textContent = "";
  document.getElementById("modal-cliente").style.display = "block";
  setTimeout(() => document.getElementById("nc-nombre").focus(), 50);
}

function cerrarModalCliente() {
  document.getElementById("modal-cliente").style.display = "none";
  contextoModalCliente = null;
}

async function guardarNuevoCliente() {
  const nombre = document.getElementById("nc-nombre").value.trim();
  const telefono = document.getElementById("nc-telefono").value.trim();
  const errEl = document.getElementById("nc-error");

  if (!nombre) {
    errEl.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    const ref = await db.collection("clientes").add({
      nombre: nombre,
      telefono: telefono,
      creadoEn: new Date().toISOString()
    });
    invalidarCacheClientes();

    const selectId = contextoModalCliente === "nuevo" ? "np-cliente-select" : "mp-cliente-select";
    await llenarSelectClientes(selectId, ref.id);

    showToast("Cliente '" + nombre + "' creado.", "success");
    cerrarModalCliente();
  } catch (e) {
    console.error(e);
    errEl.textContent = "Error al guardar el cliente: " + e.message;
  }
}

/* ============================================================
   NUEVO PEDIDO
============================================================ */
document.getElementById("np-precio").addEventListener("input", calcNPTotal);
document.getElementById("np-descuento").addEventListener("input", calcNPTotal);

function calcNPTotal() {
  const p = parseFloat(document.getElementById("np-precio").value) || 0;
  const d = parseFloat(document.getElementById("np-descuento").value) || 0;
  document.getElementById("np-precio-total").value = (p - d).toFixed(2);
}

let reservedNUT = null;

async function generateUniqueNUT() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 8; attempt++) {
    let nut = "";
    for (let i = 0; i < 6; i++) {
      nut += chars[Math.floor(Math.random() * chars.length)];
    }
    const doc = await db.collection("ticket").doc(nut).get();
    if (!doc.exists) return nut;
  }
  throw new Error("No se pudo generar un NUT único.");
}

async function prepararNuevoPedido() {
  const previewEl = document.getElementById("np-nut-preview");
  if (!previewEl) return;

  // Cargar select de clientes (sin preselección)
  llenarSelectClientes("np-cliente-select");

  if (reservedNUT) {
    previewEl.textContent = reservedNUT;
    return;
  }

  previewEl.textContent = "Generando...";

  try {
    const nut = await generateUniqueNUT();
    await db.collection("ticket").doc(nut).set({
      NUT: nut,
      reservado: true,
      reservadoEn: new Date().toISOString()
    });
    reservedNUT = nut;
    previewEl.textContent = nut;
  } catch (e) {
    console.error(e);
    previewEl.textContent = "ERROR";
    showToast("No se pudo reservar un NUT: " + e.message, "error");
  }
}

async function saveNuevoPedido() {
  try {
    const clienteId = document.getElementById("np-cliente-select").value;
    if (!clienteId) {
      showToast("Seleccioná un cliente antes de guardar.", "warning");
      return;
    }

    const clientes = await cargarClientes();
    const clienteObj = clientes.find(c => c.id === clienteId);
    if (!clienteObj) {
      showToast("El cliente seleccionado no existe.", "error");
      return;
    }

    const nut = reservedNUT || await generateUniqueNUT();
    const precio = parseFloat(document.getElementById("np-precio").value) || 0;
    const descuento = parseFloat(document.getElementById("np-descuento").value) || 0;
    const { cosas, completadas } = recolectarCosas("np-cosas", "np-cosa");

    const data = {
      NUT: nut,
      clienteId: clienteId,
      cliente: clienteObj.nombre,
      telefono: clienteObj.telefono || "",
      personal: document.getElementById("np-personal").value,
      "cosas-pedido": cosas,
      "cosas-completadas": completadas,
      estado: document.getElementById("np-estado").value,
      precio: precio,
      "descuento-total": descuento,
      "precio-total": precio - descuento,
      "estado-pago": document.getElementById("np-estado-pago").value,
      mod: document.getElementById("np-mod").value,
      notas: document.getElementById("np-notas").value,
      registro: new Date().toISOString(),
      imagenes: "",
      "imagenes-referencia": document.getElementById("np-imagenes-referencia").value,
      "imagenes-terminado": document.getElementById("np-imagenes-terminado").value
    };

    await db.collection("ticket").doc(nut).set(data);

    const mensaje =
      "Hola " + (clienteObj.nombre || "[cliente]") + ", tu pedido ha sido *cargado* en la *web de nuestro taller*, " +
      "si quieres *acceder* a ella para ver el *estado de tu pedido*, haz click en el siguiente *link*, " +
      "*_muchas gracias_*.\n\n" +
      "*Link:* https://lodepedrosa.github.io/CronoRuta/Taller_de_Pedritoo/?=" + nut + "\n\n" +
      "*_Atte. Pedritoo_*";

    const copiado = await copyToClipboard(mensaje);

    if (copiado) {
      showToast(
        "Pedido creado correctamente.\nNUT: " + nut + "\n\n✅ Mensaje copiado al portapapeles.",
        "success"
      );
    } else {
      console.log("=== MENSAJE PARA EL CLIENTE (copiar manualmente) ===");
      console.log(mensaje);
      showToast(
        "Pedido creado correctamente.\nNUT: " + nut + "\n\n⚠️ No se pudo copiar el mensaje automáticamente. Está en la consola (F12).",
        "warning"
      );
    }

    reservedNUT = null;
    ["np-personal", "np-estado", "np-precio", "np-descuento", "np-precio-total",
      "np-estado-pago", "np-mod", "np-notas",
      "np-imagenes-referencia", "np-imagenes-terminado"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("np-cosas").innerHTML = "";
    addCosaInput("np-cosas", "np-cosa");
    const selCliente = document.getElementById("np-cliente-select");
    if (selCliente) selCliente.value = "";

    invalidarCacheClientes();
    prepararNuevoPedido();

  } catch (e) {
    console.error(e);
    showToast("Error al guardar el pedido: " + e.message, "error");
  }
}

/* ============================================================
   MODIFICAR PEDIDO
============================================================ */
document.getElementById("mp-precio").addEventListener("input", calcMPTotal);
document.getElementById("mp-descuento").addEventListener("input", calcMPTotal);

function calcMPTotal() {
  const p = parseFloat(document.getElementById("mp-precio").value) || 0;
  const d = parseFloat(document.getElementById("mp-descuento").value) || 0;
  document.getElementById("mp-precio-total").value = (p - d).toFixed(2);
}

async function loadModPedido(nut, data) {
  document.getElementById("mp-nut").value = nut;
  document.getElementById("mp-personal").value = data.personal || "";
  setSelectValue("mp-estado", data.estado || "");
  document.getElementById("mp-precio").value = data.precio != null ? data.precio : "";
  document.getElementById("mp-descuento").value = data["descuento-total"] != null ? data["descuento-total"] : "";
  document.getElementById("mp-precio-total").value = data["precio-total"] != null ? data["precio-total"] : "";
  setSelectValue("mp-estado-pago", data["estado-pago"] || "");
  document.getElementById("mp-mod").value = data.mod || "";
  document.getElementById("mp-notas").value = data.notas || "";
  document.getElementById("mp-imagenes-referencia").value = data["imagenes-referencia"] || "";
  document.getElementById("mp-imagenes-terminado").value = data["imagenes-terminado"] || "";

  // Cargar select de clientes (con el cliente actual seleccionado)
  await llenarSelectClientes("mp-cliente-select", data.clienteId || "");

  // Detalles con checkboxes
  const container = document.getElementById("mp-cosas");
  container.innerHTML = "";
  const cosas = (data["cosas-pedido"] || "").split("</>").map(s => s.trim()).filter(s => s);
  const completadas = Array.isArray(data["cosas-completadas"]) ? data["cosas-completadas"] : [];
  if (cosas.length === 0) cosas.push("");
  cosas.forEach((c, i) => addCosaInput("mp-cosas", "mp-cosa", c, completadas[i] || false));
}

async function updatePedido() {
  try {
    const nut = document.getElementById("mp-nut").value;
    if (!nut) {
      showToast("No hay ningún pedido cargado.", "warning");
      return;
    }

    const clienteId = document.getElementById("mp-cliente-select").value;
    if (!clienteId) {
      showToast("Seleccioná un cliente.", "warning");
      return;
    }

    const clientes = await cargarClientes();
    const clienteObj = clientes.find(c => c.id === clienteId);
    if (!clienteObj) {
      showToast("El cliente seleccionado no existe.", "error");
      return;
    }

    const precio = parseFloat(document.getElementById("mp-precio").value) || 0;
    const descuento = parseFloat(document.getElementById("mp-descuento").value) || 0;
    const { cosas, completadas } = recolectarCosas("mp-cosas", "mp-cosa");

    await db.collection("ticket").doc(nut).update({
      clienteId: clienteId,
      cliente: clienteObj.nombre,
      telefono: clienteObj.telefono || "",
      personal: document.getElementById("mp-personal").value,
      "cosas-pedido": cosas,
      "cosas-completadas": completadas,
      estado: document.getElementById("mp-estado").value,
      precio: precio,
      "descuento-total": descuento,
      "precio-total": precio - descuento,
      "estado-pago": document.getElementById("mp-estado-pago").value,
      mod: document.getElementById("mp-mod").value,
      notas: document.getElementById("mp-notas").value,
      "imagenes-referencia": document.getElementById("mp-imagenes-referencia").value,
      "imagenes-terminado": document.getElementById("mp-imagenes-terminado").value
    });

    showToast("Pedido " + nut + " actualizado correctamente.", "success");

    // Invalidar cache de tickets por si cambió el cliente
    cachedTickets = null;

    navStack.length = 0;
    switchTab("inicio", { push: false, restoreScroll: false, force: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (e) {
    console.error(e);
    showToast("Error al actualizar el pedido: " + e.message, "error");
  }
}

/* ============================================================
   HELPERS DE FORMATO
============================================================ */
function formatMoney(val) {
  if (val === null || val === undefined || val === "") return "-";
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString("es-AR");
}

function formatDate(val) {
  if (!val) return "-";

  let d;
  try {
    if (typeof val === "object" && typeof val.toDate === "function") d = val.toDate();
    else d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
  } catch (e) {
    return String(val);
  }

  const pad = n => String(n).padStart(2, "0");
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear()
    + " - " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseImageUrls(raw, emptyHtml) {
  const urls = (raw || "").split(",").map(s => s.trim()).filter(s => s);
  const valid = urls.filter(u => /^https?:\/\//i.test(u));
  return valid.length
    ? valid.map(src => '<img class="imagen-pedido" src="' + escapeHtml(src) + '" alt="Imagen del pedido">').join("")
    : emptyHtml;
}

/* ============================================================
   FILTROS Y BUSCADOR (solo admin)
============================================================ */
let filtroActivo = null;
let cachedTickets = null;

async function cargarTickets(force = false) {
  if (cachedTickets && !force) return cachedTickets;
  const snapshot = await db.collection("ticket").get();
  const tickets = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    d.__id = doc.id;
    if (d.reservado && !d.registro) return;
    tickets.push(d);
  });
  cachedTickets = tickets;
  return tickets;
}

async function aplicarFiltro(tipo) {
  filtroActivo = tipo;

  ["todos", "terminados", "sin-pagar", "sin-terminar"].forEach(t => {
    const b = document.getElementById("filtro-" + t);
    if (b) b.classList.toggle("activo", t === tipo);
  });

  const errorEl = document.getElementById("filtros-error");
  const resultadosEl = document.getElementById("filtros-resultados");
  errorEl.textContent = "";
  resultadosEl.innerHTML = '<div class="filtros-vacio">Cargando pedidos...</div>';

  try {
    const tickets = await cargarTickets();

    let filtrados = [];
    let titulo = "";

    if (tipo === "todos") {
      titulo = "Todos los pedidos";
      filtrados = tickets.slice();
    } else if (tipo === "terminados") {
      titulo = "Pedidos Terminados";
      filtrados = tickets.filter(t => t.estado === "Terminado");
    } else if (tipo === "sin-pagar") {
      titulo = "Pedidos sin pagar";
      filtrados = tickets.filter(t => t["estado-pago"] === "No pagado");
    } else if (tipo === "sin-terminar") {
      titulo = "Pedidos sin terminar";
      filtrados = tickets.filter(t => t.estado && t.estado !== "Terminado");
    }

    filtrados.sort((a, b) => {
      const da = a.registro ? new Date(a.registro).getTime() : 0;
      const db_ = b.registro ? new Date(b.registro).getTime() : 0;
      return db_ - da;
    });

    renderListadoTickets(filtrados, titulo);
  } catch (e) {
    console.error(e);
    errorEl.textContent = "Error al cargar los pedidos: " + e.message;
    resultadosEl.innerHTML = "";
  }
}

function renderListadoTickets(filtrados, titulo) {
  const resultadosEl = document.getElementById("filtros-resultados");

  if (filtrados.length === 0) {
    resultadosEl.innerHTML =
      '<div class="filtros-vacio">No se encontraron ' + escapeHtml(titulo.toLowerCase()) + '.</div>';
    return;
  }

  let html = '<p class="filtros-count">' + escapeHtml(titulo) + ' (' + filtrados.length + ')</p>';

  filtrados.forEach(t => {
    const estado = t.estado || "-";
    const estadoPago = t["estado-pago"] || "-";

    let estadoBadgeClass = "sin-terminar";
    if (estado === "Terminado") estadoBadgeClass = "terminado";
    else if (estado === "En proceso") estadoBadgeClass = "en-proceso";

    let pagoBadgeClass = estadoPago === "Pagado" ? "pagado" : "no-pagado";

    const cliente = getCliente(t) || "-";
    const telefono = getTelefono(t) || "-";

    html +=
      '<div class="ticket-card" onclick="abrirTicketDesdeFiltro(\'' + encodeURIComponent(t.__id) + '\')">' +
        '<h4>' +
          '<span class="nut">' + escapeHtml(t.NUT || t.__id) + '</span>' +
          '<span class="estado-badge ' + estadoBadgeClass + '">' + escapeHtml(estado) + '</span>' +
        '</h4>' +
        '<p><strong>Cliente:</strong> ' + escapeHtml(cliente) + '</p>' +
        '<p><strong>Teléfono:</strong> ' + escapeHtml(telefono) + '</p>' +
        '<p><strong>Modelo:</strong> ' + escapeHtml(t.mod || "-") + '</p>' +
        '<p><strong>Personal:</strong> ' + escapeHtml(t.personal || "-") + '</p>' +
        '<p><strong>Registro:</strong> ' + formatDate(t.registro) + '</p>' +
        '<p><strong>Total:</strong> $' + formatMoney(t["precio-total"]) +
          ' &nbsp;·&nbsp; <strong>Pago:</strong> ' +
          '<span class="estado-badge ' + pagoBadgeClass + '">' + escapeHtml(estadoPago) + '</span>' +
        '</p>' +
      '</div>';
  });

  resultadosEl.innerHTML = html;
}

async function ejecutarBusqueda() {
  const errorEl = document.getElementById("filtros-error");
  const resultadosEl = document.getElementById("filtros-resultados");
  errorEl.textContent = "";

  const termino = document.getElementById("buscador-input").value.trim().toLowerCase();
  const tipo = document.getElementById("buscador-tipo").value;

  if (!termino) {
    errorEl.textContent = "Escribí algo para buscar.";
    return;
  }

  ["todos", "terminados", "sin-pagar", "sin-terminar"].forEach(t => {
    const b = document.getElementById("filtro-" + t);
    if (b) b.classList.remove("activo");
  });
  filtroActivo = "busqueda";

  resultadosEl.innerHTML = '<div class="filtros-vacio">Buscando...</div>';

  try {
    const tickets = await cargarTickets();

    const filtrados = tickets.filter(t => {
      let campo = "";
      if (tipo === "telefono") campo = getTelefono(t);
      else if (tipo === "cliente") campo = getCliente(t);
      else if (tipo === "mod") campo = t.mod || "";
      return String(campo).toLowerCase().includes(termino);
    });

    filtrados.sort((a, b) => {
      const da = a.registro ? new Date(a.registro).getTime() : 0;
      const db_ = b.registro ? new Date(b.registro).getTime() : 0;
      return db_ - da;
    });

    const tipoLabel = tipo === "telefono" ? "Número de Teléfono"
      : tipo === "cliente" ? "Nombre de la persona"
      : "Modelo";

    renderListadoTickets(filtrados, 'Resultados para "' + termino + '" en ' + tipoLabel);
  } catch (e) {
    console.error(e);
    errorEl.textContent = "Error al buscar: " + e.message;
    resultadosEl.innerHTML = "";
  }
}

function limpiarBusqueda() {
  document.getElementById("buscador-input").value = "";
  document.getElementById("buscador-tipo").value = "telefono";
  document.getElementById("filtros-error").textContent = "";
  document.getElementById("filtros-resultados").innerHTML = "";
  filtroActivo = null;
  ["todos", "terminados", "sin-pagar", "sin-terminar"].forEach(t => {
    const b = document.getElementById("filtro-" + t);
    if (b) b.classList.remove("activo");
  });
}

async function abrirTicketDesdeFiltro(nutEncoded) {
  const nut = decodeURIComponent(nutEncoded);

  if (isAdmin()) {
    try {
      const doc = await db.collection("ticket").doc(nut).get();
      if (!doc.exists) {
        showToast("NUT no encontrado.", "error");
        return;
      }
      await loadModPedido(nut, doc.data());
      switchTab("mod-pedido-pag");
      showToast("Pedido " + nut + " cargado para editar.", "info");
    } catch (e) {
      console.error(e);
      showToast("Error al abrir el pedido: " + e.message, "error");
    }
  } else {
    await loadPedidoTab(nut);
  }
}

/* ============================================================
   LISTADO / PERFIL DE CLIENTES
============================================================ */
async function listarTodosClientes() {
  document.getElementById("clientes-error").textContent = "";
  document.getElementById("clientes-resultados").innerHTML =
    '<div class="filtros-vacio">Cargando...</div>';
  try {
    const clientes = await cargarClientes(true);
    renderListadoClientes(clientes, "Todos los clientes");
  } catch (e) {
    console.error(e);
    document.getElementById("clientes-error").textContent = "Error: " + e.message;
    document.getElementById("clientes-resultados").innerHTML = "";
  }
}

async function buscarClientes() {
  const term = document.getElementById("buscador-cliente-input").value.trim().toLowerCase();
  document.getElementById("clientes-error").textContent = "";
  if (!term) {
    document.getElementById("clientes-error").textContent = "Escribí un nombre para buscar.";
    return;
  }
  document.getElementById("clientes-resultados").innerHTML =
    '<div class="filtros-vacio">Buscando...</div>';
  try {
    const clientes = await cargarClientes(true);
    const filtrados = clientes.filter(c => (c.nombre || "").toLowerCase().includes(term));
    renderListadoClientes(filtrados, 'Resultados para "' + term + '"');
  } catch (e) {
    console.error(e);
    document.getElementById("clientes-error").textContent = "Error: " + e.message;
    document.getElementById("clientes-resultados").innerHTML = "";
  }
}

function renderListadoClientes(clientes, titulo) {
  const el = document.getElementById("clientes-resultados");
  if (clientes.length === 0) {
    el.innerHTML = '<div class="filtros-vacio">No se encontraron clientes.</div>';
    return;
  }
  let html = '<p class="filtros-count">' + escapeHtml(titulo) + ' (' + clientes.length + ')</p>';
  clientes.forEach(c => {
    html +=
      '<div class="ticket-card" onclick="abrirPerfilCliente(\'' + encodeURIComponent(c.id) + '\')">' +
        '<h4><span>' + escapeHtml(c.nombre || "-") + '</span></h4>' +
        '<p><strong>Teléfono:</strong> ' + escapeHtml(c.telefono || "-") + '</p>' +
        '<p><strong>Cliente desde:</strong> ' + formatDate(c.creadoEn) + '</p>' +
      '</div>';
  });
  el.innerHTML = html;
}

async function abrirPerfilCliente(idEncoded) {
  const id = decodeURIComponent(idEncoded);
  try {
    const doc = await db.collection("clientes").doc(id).get();
    if (!doc.exists) {
      showToast("Cliente no encontrado.", "error");
      return;
    }
    const cliente = { id: doc.id, ...doc.data() };

    const snap = await db.collection("ticket").where("clienteId", "==", id).get();
    const tickets = [];
    snap.forEach(t => {
      const d = t.data();
      d.__id = t.id;
      if (d.reservado && !d.registro) return;
      tickets.push(d);
    });
    tickets.sort((a, b) => new Date(b.registro || 0) - new Date(a.registro || 0));

    let pedidosHtml = "";
    if (tickets.length === 0) {
      pedidosHtml = '<div class="filtros-vacio">Este cliente todavía no tiene pedidos.</div>';
    } else {
      tickets.forEach(t => {
        const estado = t.estado || "-";
        let badgeClass = "sin-terminar";
        if (estado === "Terminado") badgeClass = "terminado";
        else if (estado === "En proceso") badgeClass = "en-proceso";

        pedidosHtml +=
          '<div class="ticket-card" onclick="abrirTicketDesdeFiltro(\'' + encodeURIComponent(t.__id) + '\')">' +
            '<h4>' +
              '<span class="nut">' + escapeHtml(t.NUT || t.__id) + '</span>' +
              '<span class="estado-badge ' + badgeClass + '">' + escapeHtml(estado) + '</span>' +
            '</h4>' +
            '<p><strong>Modelo:</strong> ' + escapeHtml(t.mod || "-") + '</p>' +
            '<p><strong>Registro:</strong> ' + formatDate(t.registro) + '</p>' +
            '<p><strong>Total:</strong> $' + formatMoney(t["precio-total"]) + '</p>' +
          '</div>';
      });
    }

    document.getElementById("cliente-content").innerHTML =
      '<h2>Perfil de ' + escapeHtml(cliente.nombre || "-") + '</h2>' +
      '<div class="recuadro">' +
        '<strong>Nombre:</strong>' +
        '<div class="readonly-field">' + escapeHtml(cliente.nombre || "-") + '</div>' +
        '<hr class="mini">' +
        '<strong>Teléfono:</strong>' +
        '<div class="readonly-field">' + escapeHtml(cliente.telefono || "-") + '</div>' +
        '<hr class="mini">' +
        '<strong>Cliente desde:</strong>' +
        '<div class="readonly-field">' + formatDate(cliente.creadoEn) + '</div>' +
      '</div>' +
      '<h2>Pedidos realizados (' + tickets.length + ')</h2>' +
      '<div>' + pedidosHtml + '</div>';

    switchTab("cliente-pag");
  } catch (e) {
    console.error(e);
    showToast("Error al cargar el perfil: " + e.message, "error");
  }
}

/* ============================================================
   VISTA PÚBLICA DEL PEDIDO
============================================================ */
async function loadPedidoTab(nut) {
  try {
    const doc = await db.collection("ticket").doc(nut).get();

    if (!doc.exists) {
      document.getElementById("pedido-content").innerHTML =
        '<h2>Tu Pedido</h2>' +
        '<div class="recuadro"><h3>Ticket no encontrado</h3>' +
        '<p>El NUT <strong>' + escapeHtml(nut) + '</strong> no existe en nuestra base de datos.</p></div>';
    } else {
      renderPedido(doc.data());
    }

    switchTab("pedido");
  } catch (e) {
    console.error(e);
    document.getElementById("pedido-content").innerHTML =
      '<h2>Tu Pedido</h2>' +
      '<div class="recuadro"><p>Error al cargar el ticket.</p></div>';
  }
}

function renderPedido(data) {
  const estado = data.estado || "";
  let estadoColor = "inherit";
  if (estado === "Terminado") estadoColor = "green";
  else if (estado === "En proceso") estadoColor = "orange";
  else if (estado === "Solamente tomado") estadoColor = "red";

  const estadoPago = data["estado-pago"] || "";
  let estadoPagoColor = "inherit";
  if (estadoPago === "Pagado") estadoPagoColor = "green";
  else if (estadoPago === "No pagado") estadoPagoColor = "red";

  const cosas = (data["cosas-pedido"] || "").split("</>").map(s => s.trim()).filter(s => s);
  const completadas = Array.isArray(data["cosas-completadas"]) ? data["cosas-completadas"] : [];
  const cosasHtml = cosas.length
    ? cosas.map((c, i) => {
        const hecho = completadas[i];
        return "<li>" + (hecho ? "✅ " : "☐ ") + (i + 1) + "- " +
               escapeHtml(c) +
               (hecho ? " <em>(completado)</em>" : "") + "</li>";
      }).join("")
    : "<li>-</li>";

  const imagenesHtml = parseImageUrls(
    data.imagenes,
    '<strong style="color: red;">No se han adjuntado imágenes...</strong>'
  );
  const imagenesRefHtml = parseImageUrls(
    data["imagenes-referencia"],
    '<strong style="color: red;">No se han adjuntado imágenes de referencia...</strong>'
  );
  const imagenesTermHtml = parseImageUrls(
    data["imagenes-terminado"],
    '<em style="color: #888;">Aún no se han adjuntado fotos del pedido terminado.</em>'
  );

  const cliente = getCliente(data);
  const telefono = getTelefono(data);

  document.getElementById("pedido-content").innerHTML =
    '<h2>Tu Pedido</h2>' +
    '<div class="recuadro">' +

      '<strong>Cliente:</strong>' +
      '<div class="readonly-field">' + escapeHtml(cliente || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Número de Teléfono:</strong>' +
      '<div class="readonly-field">' + escapeHtml(telefono || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Personal que está atendiendo tu pedido:</strong>' +
      '<div class="readonly-field">' + escapeHtml(data.personal || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Detalles del pedido:</strong>' +
      '<div class="readonly-field readonly-field-block">' +
        '<ul class="lista-detalles">' + cosasHtml + '</ul>' +
      '</div>' +
      '<hr class="mini">' +

      '<strong>Estado del pedido:</strong>' +
      '<div class="readonly-field" style="color:' + estadoColor + ';font-weight:700;">' + escapeHtml(estado || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Fecha y Hora cuando se registró el pedido:</strong>' +
      '<div class="readonly-field">' + formatDate(data.registro) + '</div>' +
      '<hr class="mini">' +

      '<strong>Precio del Pedido:</strong>' +
      '<div class="readonly-field">$' + formatMoney(data.precio) + '</div>' +
      '<hr class="mini">' +

      '<strong>Descuentos aplicados en total:</strong>' +
      '<div class="readonly-field">' + escapeHtml(String(data["descuento-total"] != null ? data["descuento-total"] : "-")) + '</div>' +
      '<hr class="mini">' +

      '<strong>Total a pagar:</strong>' +
      '<div class="readonly-field">$' + formatMoney(data["precio-total"]) + '</div>' +
      '<hr class="mini">' +

      '<strong>Estado del pago:</strong>' +
      '<div class="readonly-field" style="color:' + estadoPagoColor + ';font-weight:700;">' + escapeHtml(estadoPago || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>NUT del Pedido:</strong>' +
      '<div class="readonly-field">' + escapeHtml(data.NUT || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Modelo del Pedido:</strong>' +
      '<div class="readonly-field">' + escapeHtml(data.mod || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Notas extras:</strong>' +
      '<div class="readonly-field">' + escapeHtml(data.notas || "-") + '</div>' +
      '<hr class="mini">' +

      '<strong>Imágenes de cómo quedó el pedido:</strong>' +
      '<div class="readonly-field readonly-field-block">' + imagenesHtml + '</div>' +
      '<hr class="mini">' +

      '<strong>Fotos de referencia:</strong>' +
      '<div class="readonly-field readonly-field-block">' + imagenesRefHtml + '</div>' +
      '<hr class="mini">' +

      '<strong>Fotos del pedido terminado:</strong>' +
      '<div class="readonly-field readonly-field-block">' + imagenesTermHtml + '</div>' +

    '</div>';
}

/* ============================================================
   BIENVENIDA ANIMADA
============================================================ */
function showWelcome() {
  const overlay = document.getElementById("welcome-overlay");
  const textEl = document.getElementById("welcome-text");
  const text = "Bienvenido a la web del Taller de Pedritoo";

  textEl.innerHTML = "";
  let charIndex = 0;

  text.split(" ").forEach((word, wordIdx, arr) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "welcome-word";

    word.split("").forEach(ch => {
      const chSpan = document.createElement("span");
      chSpan.className = "welcome-char";
      chSpan.textContent = ch;
      chSpan.style.animationDelay = (charIndex * 0.03) + "s";
      charIndex++;
      wordSpan.appendChild(chSpan);
    });

    textEl.appendChild(wordSpan);

    if (wordIdx < arr.length - 1) {
      textEl.appendChild(document.createTextNode(" "));
      charIndex++;
    }
  });

  const totalDelay = (charIndex * 30) + 550 + 1800;
  setTimeout(() => dismissWelcome(), totalDelay);
}

function dismissWelcome() {
  const overlay = document.getElementById("welcome-overlay");
  if (!overlay || overlay.classList.contains("fade-out")) return;
  overlay.classList.add("fade-out");
  setTimeout(() => { overlay.style.display = "none"; }, 900);
}

/* ============================================================
   INICIALIZACIÓN
============================================================ */
function init() {
  const overlay = document.getElementById("welcome-overlay");
  if (localStorage.getItem("welcome_shown") === "true") {
    overlay.style.display = "none";
  } else {
    localStorage.setItem("welcome_shown", "true");
    showWelcome();
  }

  updateUIBasedOnRole();

  addCosaInput("np-cosas", "np-cosa");
  addCosaInput("mp-cosas", "mp-cosa");

  currentTab = "inicio";

  const search = window.location.search;
  let nutParam = "";
  if (search.startsWith("?=")) {
    nutParam = decodeURIComponent(search.substring(2));
  } else {
    const params = new URLSearchParams(search);
    nutParam = params.get("") || "";
  }

  if (nutParam) {
    // 🔑 Si es admin y abre un link de pedido → modo edición automático
    if (isAdmin()) {
      db.collection("ticket").doc(nutParam).get()
        .then(doc => {
          if (doc.exists) {
            return loadModPedido(nutParam, doc.data())
              .then(() => {
                switchTab("mod-pedido-pag");
                showToast("Modo editor activado para el NUT " + nutParam, "info");
              });
          } else {
            return loadPedidoTab(nutParam);
          }
        })
        .catch(e => {
          console.error(e);
          loadPedidoTab(nutParam);
        });
    } else {
      loadPedidoTab(nutParam);
    }
  }
}

init();