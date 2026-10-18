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
   HELPER: SELECT (para asegurar que el valor guardado aparezca)
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

async function generateUniqueNUT() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 6; attempt++) {
    let nut = "";
    for (let i = 0; i < 6; i++) {
      nut += chars[Math.floor(Math.random() * chars.length)];
    }
    const doc = await db.collection("ticket").doc(nut).get();
    if (!doc.exists) return nut;
  }
  throw new Error("No se pudo generar un NUT único.");
}

async function saveNuevoPedido() {
  try {
    const nut = await generateUniqueNUT();
    const precio = parseFloat(document.getElementById("np-precio").value) || 0;
    const descuento = parseFloat(document.getElementById("np-descuento").value) || 0;
    const titular = document.getElementById("np-titular").value.trim();
    const cosas = Array.from(document.querySelectorAll("#np-cosas .np-cosa"))
      .map(el => el.value.trim())
      .filter(s => s)
      .join("</>");

    const data = {
      NUT: nut,
      personal: document.getElementById("np-personal").value,
      titular: titular,
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

    await db.collection("ticket").doc(nut).set(data);

    // --- Mensaje para el cliente (formato WhatsApp) ---
    const mensaje =
      "Hola " + (titular || "[titular]") + ", tu pedido ha sido *cargado* en la *web de nuestro taller*, " +
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

    // --- Limpiar formulario ---
    ["np-personal", "np-titular", "np-estado", "np-precio", "np-descuento",
      "np-precio-total", "np-estado-pago", "np-mod", "np-notas",
      "np-imagenes-referencia", "np-imagenes-terminado"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("np-cosas").innerHTML = "";
    addCosaInput("np-cosas", "np-cosa");

  } catch (e) {
    console.error(e);
    alert("Error al guardar el pedido: " + e.message);
  }
}

/* ============================================================
   CONTADOR DE TIEMPO (solo en modificar pedido)
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
  if (timerInterval) {
    el.classList.add("running");
  } else {
    el.classList.remove("running");
  }
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
    // --- Detener ---
    clearInterval(timerInterval);
    timerInterval = null;
    setTimerButtonState(false);
    updateTimerDisplay();
    await saveTimer();
  } else {
    // --- Iniciar ---
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
      // Autoguardado cada 15 segundos
      if (timerSeconds % 15 === 0) saveTimer();
    }, 1000);
    setTimerButtonState(true);
    updateTimerDisplay();
  }
}

/* Aviso al cerrar la página si el contador está corriendo */
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
  // Guardar el contador pendiente si era de otro pedido
  if (timerInterval && currentNutForTimer) {
    clearInterval(timerInterval);
    timerInterval = null;
    const oldNut = currentNutForTimer;
    const oldSeconds = timerSeconds;
    saveTimerValue(oldNut, oldSeconds); // fire-and-forget
  }

  // Resetear estado del contador
  currentNutForTimer = nut;
  timerSeconds = parseInt(data["tiempo-preparacion"]) || 0;
  setTimerButtonState(false);
  updateTimerDisplay();

  // Cargar campos
  document.getElementById("mp-nut").value = nut;
  document.getElementById("mp-personal").value = data.personal || "";
  document.getElementById("mp-titular").value = data.titular || "";
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
      personal: document.getElementById("mp-personal").value,
      titular: document.getElementById("mp-titular").value,
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
   VISTA DEL PEDIDO
============================================================ */
async function loadPedidoTab(nut) {
  try {
    const doc = await db.collection("ticket").doc(nut).get();

    if (!doc.exists) {
      document.getElementById("pedido-content").innerHTML =
        '<div class="recuadro"><h2>Ticket no encontrado</h2><p>El NUT <strong>'
        + escapeHtml(nut) + '</strong> no existe en nuestra base de datos.</p></div>';
    } else {
      renderPedido(doc.data());
    }

    switchTab("pedido");
  } catch (e) {
    console.error(e);
    document.getElementById("pedido-content").innerHTML =
      '<div class="recuadro"><p>Error al cargar el ticket.</p></div>';
  }
}

function renderPedido(data) {
  const estado = data.estado || "";
  let estadoColor = "inherit";
  if (estado === "Terminado") estadoColor = "green";
  else if (estado === "En proceso") estadoColor = "orange";
  else if (estado === "Solamente tomado") estadoColor = "red";

  const isTerminado = estado === "Terminado";

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

  const nutEscaped = encodeURIComponent(data.NUT || "");
  const tiempoSeg = parseInt(data["tiempo-preparacion"]) || 0;
  const tiempoFormateado = formatTimer(tiempoSeg);

  const bannerTerminadoHtml = isTerminado ? (
    '<div class="banner-terminado">' +
      '<h3>🎉 ¡Tu pedido está terminado! 🎉</h3>' +
      '<p>Podés ver todos los detalles finales en la página especial del pedido terminado.</p>' +
      '<a href="pedido-terminado.html?=' + nutEscaped + '" class="btn-terminado">' +
        'Ver página del pedido terminado →' +
      '</a>' +
    '</div>'
  ) : '';

  document.getElementById("pedido-content").innerHTML =
    '<h2>Tu Pedido</h2>' +
    bannerTerminadoHtml +
    '<div class="recuadro" style="text-align:center;">' +
      '<p style="font-size:2.5em;color:#007bff;margin:0;font-weight:800;font-variant-numeric:tabular-nums;">' +
        tiempoFormateado +
      '</p>' +
    '</div>' +
    '<p><strong>¿Qué significan esos números de arriba? </strong>Los números de arriba son el tiempo que va tardando el personal en hacer el pedido; no cuánto tiempo desde que lo pediste, sino el tiempo que le estuvo dedicando al pedido.</p>' +
    '<hr>' +
    '<p><strong>Personal que está atendiendo tu pedido: </strong>' + escapeHtml(data.personal || "-") + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Titular del Pedido (Número de teléfono): </strong>' + escapeHtml(data.titular || "-") + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Detalles del pedido: </strong></p>' +
    '<ul class="lista-detalles">' + cosasHtml + '</ul>' +
    '<hr class="mini">' +
    '<p><strong>Estado del pedido: </strong><span style="color:' + estadoColor + ';font-weight:bold;">' + escapeHtml(estado || "-") + '</span></p>' +
    '<hr class="mini">' +
    '<p><strong>Fecha y Hora cuando se registró el pedido: </strong>' + formatDate(data.registro) + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Precio del Pedido: </strong>$' + formatMoney(data.precio) + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Descuentos aplicados en total: </strong>' + escapeHtml(String(data["descuento-total"] != null ? data["descuento-total"] : "-")) + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Total a pagar: </strong>$' + formatMoney(data["precio-total"]) + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Estado del pago: </strong><span style="color:' + estadoPagoColor + ';font-weight:bold;">' + escapeHtml(estadoPago || "-") + '</span></p>' +
    '<hr class="mini">' +
    '<p><strong>NUT del Pedido: </strong>' + escapeHtml(data.NUT || "-") + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Modelo del Pedido: </strong>' + escapeHtml(data.mod || "-") + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Notas extras: </strong>' + escapeHtml(data.notas || "-") + '</p>' +
    '<hr class="mini">' +
    '<p><strong>Imágenes de cómo quedó el pedido:</strong></p>' +
    '<div class="recuadro">' + imagenesHtml + '</div>' +
    '<hr class="mini">' +
    '<p><strong>Fotos de referencia:</strong></p>' +
    '<div class="recuadro">' + imagenesRefHtml + '</div>' +
    '<hr class="mini">' +
    '<p><strong>Fotos del pedido terminado:</strong></p>' +
    '<div class="recuadro">' + imagenesTermHtml + '</div>';
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