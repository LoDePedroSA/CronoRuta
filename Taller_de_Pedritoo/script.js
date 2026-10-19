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
   NAVEGACIÓN DE PESTAÑAS
============================================================ */
function switchTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
  const sec = document.getElementById(tabId);
  if (sec) sec.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (tabId === "nuevo-pedido-pag") {
    prepararNuevoPedido();
  }
}

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
      alert("Sesión iniciada como administrador.");
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
    alert("Por favor, introducí un NUT.");
    return;
  }

  try {
    const doc = await db.collection("ticket").doc(nut).get();

    if (!doc.exists) {
      alert("NUT no encontrado.");
      return;
    }

    if (origen === "estado") {
      window.location.href =
        "https://lodepedrosa.github.io/CronoRuta/Taller_de_Pedritoo/index.html?=" + encodeURIComponent(nut);
    } else if (origen === "mod") {
      loadModPedido(nut, doc.data());
      switchTab("mod-pedido-pag");
      document.getElementById("nut-mod").value = "";
    } else if (origen === "eliminar") {
      if (confirm("¿Seguro que querés eliminar el pedido " + nut + "?")) {
        await db.collection("ticket").doc(nut).delete();
        alert("Pedido eliminado correctamente.");
        document.getElementById("nut-eliminar").value = "";
      }
    }
  } catch (e) {
    console.error(e);
    alert("Error al verificar el NUT.");
  }
}

/* ============================================================
   HELPERS DE CAMPOS DINÁMICOS ("cosas-pedido")
============================================================ */
function addCosaInput(containerId, className, value) {
  const container = document.getElementById(containerId);
  const row = document.createElement("div");
  row.className = "cosa-row";

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

  row.appendChild(input);
  row.appendChild(btn);
  container.appendChild(row);
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
  // Compatibilidad con pedidos viejos: si tenía "titular" con el teléfono,
  // intentamos sacar el número para no mostrarlo como cliente.
  if (data.titular) {
    const t = String(data.titular).trim();
    // Si es sólo dígitos, símbolos y +/-, asumimos que es el teléfono
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

  // Si ya hay uno reservado en esta sesión, no generamos otro
  if (reservedNUT) {
    previewEl.textContent = reservedNUT;
    return;
  }

  previewEl.textContent = "Generando...";

  try {
    const nut = await generateUniqueNUT();
    // Reservamos el documento para evitar colisiones entre admins
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
    alert("No se pudo reservar un NUT: " + e.message);
  }
}

async function saveNuevoPedido() {
  try {
    const nut = reservedNUT || await generateUniqueNUT();
    const precio = parseFloat(document.getElementById("np-precio").value) || 0;
    const descuento = parseFloat(document.getElementById("np-descuento").value) || 0;
    const cliente = document.getElementById("np-cliente").value.trim();
    const telefono = document.getElementById("np-telefono").value.trim();
    const cosas = Array.from(document.querySelectorAll("#np-cosas .np-cosa"))
      .map(el => el.value.trim())
      .filter(s => s)
      .join("</>");

    const data = {
      NUT: nut,
      cliente: cliente,
      telefono: telefono,
      personal: document.getElementById("np-personal").value,
      "cosas-pedido": cosas,
      estado: document.getElementById("np-estado").value,
      precio: precio,
      "descuento-total": descuento,
      "precio-total": precio - descuento,
      "estado-pago": document.getElementById("np-estado-pago").value,
      mod: document.getElementById("np-mod").value,
      notas: document.getElementById("np-notas").value,
      "tiempo-preparacion": 0,
      registro: new Date().toISOString(),
      imagenes: "",
      "imagenes-referencia": document.getElementById("np-imagenes-referencia").value,
      "imagenes-terminado": document.getElementById("np-imagenes-terminado").value
    };

    // set() sobrescribe la reserva
    await db.collection("ticket").doc(nut).set(data);

    // Mensaje: sólo el cliente (sin teléfono)
    const mensaje =
      "Hola " + (cliente || "[cliente]") + ", tu pedido ha sido *cargado* en la *web de nuestro taller*, " +
      "si quieres *acceder* a ella para ver el *estado de tu pedido*, haz click en el siguiente *link*, " +
      "*_muchas gracias_*.\n\n" +
      "*Link:* https://lodepedrosa.github.io/CronoRuta/Taller_de_Pedritoo/?=" + nut + "\n\n" +
      "*_Atte. Pedritoo_*";

    const copiado = await copyToClipboard(mensaje);

    if (copiado) {
      alert(
        "Pedido creado correctamente.\n\n" +
        "NUT: " + nut + "\n\n" +
        "✅ Mensaje copiado al portapapeles.\nYa podés pegarlo en WhatsApp."
      );
    } else {
      console.log("=== MENSAJE PARA EL CLIENTE (copiar manualmente) ===");
      console.log(mensaje);
      alert(
        "Pedido creado correctamente.\n\n" +
        "NUT: " + nut + "\n\n" +
        "⚠️ No se pudo copiar automáticamente al portapapeles.\n" +
        "El mensaje está en la consola (F12) para copiarlo manualmente."
      );
    }

    // Reset
    reservedNUT = null;
    ["np-cliente", "np-telefono", "np-personal", "np-estado", "np-precio", "np-descuento",
      "np-precio-total", "np-estado-pago", "np-mod", "np-notas",
      "np-imagenes-referencia", "np-imagenes-terminado"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("np-cosas").innerHTML = "";
    addCosaInput("np-cosas", "np-cosa");

    // Preparar siguiente NUT
    prepararNuevoPedido();

  } catch (e) {
    console.error(e);
    alert("Error al guardar el pedido: " + e.message);
  }
}

/* ============================================================
   CONTADOR DE TIEMPO
============================================================ */
let timerInterval = null;
let timerSeconds = 0;
let currentNutForTimer = null;

function formatTimer(seconds) {
  const s = Number(seconds);
  if (isNaN(s) || s < 0) return "00:00:00";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = n => String(n).padStart(2, "0");
  return pad(h) + ":" + pad(m) + ":" + pad(sec);
}

function updateTimerDisplay() {
  const el = document.getElementById("timer-display");
  if (!el) return;
  el.textContent = formatTimer(timerSeconds);
  if (timerInterval) el.classList.add("running");
  else el.classList.remove("running");
}

async function saveTimerValue(nut, seconds) {
  if (!nut) return;
  try {
    await db.collection("ticket").doc(nut).update({
      "tiempo-preparacion": Math.floor(seconds)
    });
  } catch (e) {
    console.error("Error guardando el contador:", e);
  }
}

async function saveTimer() {
  if (!currentNutForTimer) return;
  return saveTimerValue(currentNutForTimer, timerSeconds);
}

function setTimerButtonState(isRunning) {
  const btn = document.getElementById("timer-toggle-btn");
  if (!btn) return;
  if (isRunning) {
    btn.textContent = "⏸ Desactivar contador";
    btn.classList.remove("primary");
    btn.classList.add("danger");
  } else {
    btn.textContent = "▶ Activar contador";
    btn.classList.remove("danger");
    btn.classList.add("primary");
  }
}

async function toggleTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    setTimerButtonState(false);
    updateTimerDisplay();
    await saveTimer();
  } else {
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
      if (timerSeconds % 15 === 0) saveTimer();
    }, 1000);
    setTimerButtonState(true);
    updateTimerDisplay();
  }
}

window.addEventListener("beforeunload", (e) => {
  if (timerInterval) {
    e.preventDefault();
    e.returnValue = "El contador de tiempo está activo. ¿Seguro que querés salir?";
    return e.returnValue;
  }
});

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

function loadModPedido(nut, data) {
  if (timerInterval && currentNutForTimer) {
    clearInterval(timerInterval);
    timerInterval = null;
    const oldNut = currentNutForTimer;
    const oldSeconds = timerSeconds;
    saveTimerValue(oldNut, oldSeconds);
  }

  currentNutForTimer = nut;
  timerSeconds = parseInt(data["tiempo-preparacion"]) || 0;
  setTimerButtonState(false);
  updateTimerDisplay();

  document.getElementById("mp-nut").value = nut;
  document.getElementById("mp-cliente").value = getCliente(data);
  document.getElementById("mp-telefono").value = getTelefono(data);
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

  const container = document.getElementById("mp-cosas");
  container.innerHTML = "";

  const cosas = (data["cosas-pedido"] || "").split("</>").map(s => s.trim()).filter(s => s);
  if (cosas.length === 0) cosas.push("");
  cosas.forEach(c => addCosaInput("mp-cosas", "mp-cosa", c));
}

async function updatePedido() {
  try {
    const nut = document.getElementById("mp-nut").value;
    if (!nut) {
      alert("No hay ningún pedido cargado.");
      return;
    }

    const precio = parseFloat(document.getElementById("mp-precio").value) || 0;
    const descuento = parseFloat(document.getElementById("mp-descuento").value) || 0;
    const cosas = Array.from(document.querySelectorAll("#mp-cosas .mp-cosa"))
      .map(el => el.value.trim())
      .filter(s => s)
      .join("</>");

    await db.collection("ticket").doc(nut).update({
      cliente: document.getElementById("mp-cliente").value.trim(),
      telefono: document.getElementById("mp-telefono").value.trim(),
      personal: document.getElementById("mp-personal").value,
      "cosas-pedido": cosas,
      estado: document.getElementById("mp-estado").value,
      precio: precio,
      "descuento-total": descuento,
      "precio-total": precio - descuento,
      "estado-pago": document.getElementById("mp-estado-pago").value,
      mod: document.getElementById("mp-mod").value,
      notas: document.getElementById("mp-notas").value,
      "imagenes-referencia": document.getElementById("mp-imagenes-referencia").value,
      "imagenes-terminado": document.getElementById("mp-imagenes-terminado").value,
      "tiempo-preparacion": Math.floor(timerSeconds)
    });

    alert("Pedido actualizado correctamente.");
  } catch (e) {
    console.error(e);
    alert("Error al actualizar el pedido: " + e.message);
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

async function cargarTickets() {
  if (cachedTickets) return cachedTickets;
  const snapshot = await db.collection("ticket").get();
  const tickets = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    d.__id = doc.id;
    // Ignorar documentos "reservados" que todavía no son pedidos reales
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

  // Limpiar filtros rápidos visualmente
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
  await loadPedidoTab(nut);
}

/* ============================================================
   VISTA DEL PEDIDO
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
  const cosasHtml = cosas.length
    ? cosas.map((c, i) => "<li>" + (i + 1) + "- " + escapeHtml(c) + "</li>").join("")
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

  const tiempoSeg = parseInt(data["tiempo-preparacion"]) || 0;
  const tiempoFormateado = formatTimer(tiempoSeg);

  const cliente = getCliente(data);
  const telefono = getTelefono(data);

  document.getElementById("pedido-content").innerHTML =
    '<h2>Tu Pedido</h2>' +
    '<div class="recuadro">' +

      '<strong>Tiempo de preparación:</strong>' +
      '<div class="readonly-field readonly-field-timer">' + tiempoFormateado + '</div>' +
      '<p class="field-hint"><strong>¿Qué significan esos números de arriba? </strong>Los números de arriba son el tiempo que va tardando el personal en hacer el pedido; no cuánto tiempo desde que lo pediste, sino el tiempo que le estuvo dedicando al pedido.</p>' +
      '<hr class="mini">' +

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

  const search = window.location.search;
  let nutParam = "";
  if (search.startsWith("?=")) {
    nutParam = decodeURIComponent(search.substring(2));
  } else {
    const params = new URLSearchParams(search);
    nutParam = params.get("") || "";
  }

  if (nutParam) loadPedidoTab(nutParam);
}

init();