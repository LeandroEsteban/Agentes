const STORAGE_KEY = "proyecto-uno-v0002-state";

const DEFAULT_STATE = {
  session: false,
  dduConfigured: false,
  twoFactor: false,
  activeScreen: "publico",
  privateTab: "configuracion",
  authFilter: "todos",
  phone: "+56 9 5555 0000",
  email: "persona@claveunica.gob.cl",
  anomaly: false,
  notifications: [
    {
      id: "not-001",
      date: "2026-06-20",
      institution: "Servicio de Registro Civil",
      title: "Actualizacion de datos personales",
      pending: true,
      detail: "Detalle disponible en CasillaUnica para la notificacion seleccionada."
    },
    {
      id: "not-002",
      date: "2026-06-23",
      institution: "Ministerio de Desarrollo Social",
      title: "Resultado de solicitud social",
      pending: true,
      detail: "La institucion informa un nuevo antecedente del procedimiento administrativo."
    }
  ],
  authorizations: [
    {
      id: "auth-001",
      status: "pendiente",
      procedure: "Beneficio social",
      requester: "Ministerio de Desarrollo Social",
      providers: "Registro Civil, Fonasa",
      data: "Identidad, tramo de salud",
      requestedAt: "2026-06-10",
      approvedAt: "",
      rejectedAt: "",
      revokedAt: ""
    },
    {
      id: "auth-002",
      status: "pendiente",
      procedure: "Subsidio habitacional",
      requester: "Ministerio de Vivienda",
      providers: "Registro Civil",
      data: "Identidad y domicilio",
      requestedAt: "2026-06-12",
      approvedAt: "",
      rejectedAt: "",
      revokedAt: ""
    },
    {
      id: "auth-003",
      status: "aprobada",
      procedure: "Atencion de salud",
      requester: "Fonasa",
      providers: "Registro Civil",
      data: "Identidad",
      requestedAt: "2026-05-21",
      approvedAt: "2026-05-22",
      rejectedAt: "",
      revokedAt: ""
    },
    {
      id: "auth-004",
      status: "rechazada",
      procedure: "Consulta tributaria",
      requester: "Servicio de Impuestos Internos",
      providers: "Tesoreria",
      data: "Antecedentes tributarios",
      requestedAt: "2026-05-02",
      approvedAt: "",
      rejectedAt: "2026-05-04",
      revokedAt: ""
    },
    {
      id: "auth-005",
      status: "revocada",
      procedure: "Beca educacional",
      requester: "Ministerio de Educacion",
      providers: "Registro Civil, Ministerio de Desarrollo Social",
      data: "Identidad, situacion socioeconomica",
      requestedAt: "2026-04-11",
      approvedAt: "2026-04-12",
      rejectedAt: "",
      revokedAt: "2026-05-01"
    }
  ]
};

const TITLES = {
  publico: "Portal publico",
  acceso: "Ingreso seguro",
  privado: "Mi portal",
  notificaciones: "DDU y notificaciones",
  autorizaciones: "Datos sensibles",
  servicios: "Expedientes y poderes",
  instituciones: "Instituciones",
  calidad: "Calidad"
};

const HELP_COPY = {
  faq: ["Preguntas frecuentes", "Respuestas para activar, recuperar, ingresar y resolver problemas comunes de ClaveUnica."],
  contacto: ["Contacto", "Canales de atencion, formularios y derivacion a soporte segun tipo de consulta."],
  emergencia: ["Atencion de emergencia", "Orientacion para casos urgentes de bloqueo, perdida de acceso o uso indebido."],
  tramites: ["Informacion de tramites", "Contenido publico para entender servicios asociados, transparencia y participacion ciudadana."]
};

let state = loadState();
let traceability = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...structuredClone(DEFAULT_STATE), ...saved };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function setText(selector, text) {
  const node = $(selector);
  if (node) node.textContent = text;
}

function navTo(screen) {
  state.activeScreen = screen;
  saveState();
  $$(".screen").forEach((section) => section.classList.toggle("is-active", section.id === screen));
  $$(".nav-list button").forEach((button) => button.classList.toggle("is-active", button.dataset.nav === screen));
  setText("#screen-title", TITLES[screen] || "Portal");
  $("#app").classList.remove("menu-open");
}

function message(selector, text, ok = true) {
  const node = $(selector);
  node.textContent = text;
  node.classList.toggle("ok", ok);
  node.classList.toggle("error", !ok);
}

function openModal(kicker, title, body, actions) {
  const dialog = $("#flow-modal");
  setText("#modal-kicker", kicker);
  setText("#modal-title", title);
  setText("#modal-body", body);
  const actionHost = $("#modal-actions");
  actionHost.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.id = action.id;
    button.type = "button";
    button.className = action.kind || "secondary";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      dialog.close();
      action.onClick?.();
    });
    actionHost.appendChild(button);
  });
  if (!dialog.open) dialog.showModal();
}

function openInformationalFlow(kind) {
  if (kind === "activate") {
    openModal("Activacion", "Activacion de ClaveUnica", "El flujo informa requisitos, confirma identidad y deja la activacion preparada para continuar con soporte presencial o digital.", [
      { id: "close-activate", label: "Entendido", kind: "primary" }
    ]);
    return;
  }
  if (kind === "recover") {
    openModal("Recuperacion", "Recuperar acceso", "Se orienta al usuario con opciones de recuperacion, contacto y ayuda segun su situacion.", [
      { id: "close-recover", label: "Entendido", kind: "primary" }
    ]);
  }
}

function openDduLoginModal() {
  openModal("DDU pendiente", "Configurar Domicilio Digital Unico", "No tienes DDU configurado. Puedes continuar a la pasarela o cancelar y permanecer en ClaveUnica con alerta pendiente.", [
    { id: "continue-ddu-login", label: "Continuar a pasarela", kind: "primary", onClick: () => openDduGateway("login") },
    { id: "cancel-ddu-login", label: "Cancelar", onClick: () => setState({ dduConfigured: false, activeScreen: "notificaciones" }) }
  ]);
}

function openDduGateway(source) {
  navTo("notificaciones");
  openModal("Pasarela DDU", "Activacion en Plataforma de Notificaciones", "La pasarela permite completar la configuracion o cancelar con confirmacion antes de volver a ClaveUnica.", [
    { id: "complete-ddu", label: "Completar configuracion", kind: "primary", onClick: () => completeDdu(source) },
    { id: "cancel-ddu-gateway", label: "Cancelar activacion", onClick: confirmCancelDdu }
  ]);
}

function completeDdu() {
  setState({ dduConfigured: true, activeScreen: "notificaciones" });
  openModal("Retorno", "DDU configurado", "La pasarela devuelve el control al portal ClaveUnica y el usuario queda habilitado para consultar notificaciones pendientes.", [
    { id: "return-cu-after-ddu", label: "Volver a ClaveUnica", kind: "primary", onClick: () => navTo("notificaciones") }
  ]);
}

function confirmCancelDdu() {
  openModal("Confirmacion", "Cancelar activacion DDU", "Puedes continuar el proceso o confirmar la cancelacion. Si cancelas, DDU queda sin configurar.", [
    { id: "continue-ddu-after-cancel", label: "Continuar proceso", kind: "primary", onClick: () => openDduGateway("cancel-confirmation") },
    { id: "confirm-cancel-ddu", label: "Confirmar cancelacion", onClick: () => setState({ dduConfigured: false, activeScreen: "notificaciones" }) }
  ]);
}

function handleLogin(event) {
  event.preventDefault();
  const secondFactorBox = $("#second-factor-login");
  if (state.twoFactor) {
    secondFactorBox.classList.remove("hidden");
    const otp = $("#otp-input").value.trim();
    if (otp !== "123456") {
      message("#login-message", "Segundo factor requerido: ingresa el codigo correcto para completar el acceso.", false);
      return;
    }
  }
  message("#login-message", "Autenticacion correcta.", true);
  setState({ session: true, activeScreen: "privado" });
  if (!state.dduConfigured) {
    openDduLoginModal();
  }
}

function saveContact() {
  const answer = $("#personal-answer").value.trim().toLowerCase();
  if (answer !== "valdivia") {
    $("#phone-input").value = state.phone;
    $("#email-input").value = state.email;
    message("#contact-message", "Validacion rechazada: telefono y correo no fueron modificados.", false);
    return;
  }
  state.phone = $("#phone-input").value.trim();
  state.email = $("#email-input").value.trim();
  saveState();
  message("#contact-message", "Datos actualizados despues de validar la pregunta personal.", true);
}

function renderPrivateTab() {
  const panel = $("#private-tab-panel");
  const tab = state.privateTab;
  $$(".tab").forEach((button) => button.classList.toggle("is-active", button.dataset.privateTab === tab));
  if (tab === "configuracion") {
    panel.innerHTML = `
      <div class="info-grid">
        <article><h3>Preferencias</h3><p>2FA ${state.twoFactor ? "activo" : "inactivo"} y datos de contacto administrables con validacion.</p></article>
        <article><h3>Datos de contacto</h3><p>${state.phone}<br>${state.email}</p></article>
      </div>`;
  } else if (tab === "historial") {
    panel.innerHTML = `
      <ul class="stack-list">
        <li>2026-06-23 - Inicio de sesion seguro.</li>
        <li>2026-06-22 - Consulta de notificaciones.</li>
        <li>2026-06-21 - Revision de autorizaciones.</li>
      </ul>`;
  } else if (tab === "estado") {
    panel.innerHTML = `
      <div class="info-grid">
        <article><h3>Identidad</h3><p>Informacion personal disponible desde Registro Civil.</p></article>
        <article><h3>Salud</h3><p>Categoria disponible; detalle sujeto a autorizacion.</p></article>
        <article><h3>Educacion</h3><p>Sin registros disponibles para mostrar.</p></article>
      </div>`;
  } else {
    panel.innerHTML = `
      <div class="edge-grid">
        <article class="empty-state">Estado vacio: se informa sin mostrar datos incorrectos.</article>
        <article class="empty-state">Falta de informacion: se indica fuente no disponible.</article>
        <article class="empty-state">Error de ingreso/carga: alerta y reintento sin estados inconsistentes.</article>
      </div>`;
  }
}

function renderNotifications() {
  const configured = state.dduConfigured;
  $("#ddu-status").textContent = configured ? "DDU configurado" : "DDU pendiente";
  $("#ddu-status").classList.toggle("warn", !configured);
  $("#ddu-status").classList.toggle("danger", !configured);
  $("#ddu-alert").classList.toggle("hidden", configured);
  $("#start-ddu-from-section").classList.toggle("hidden", configured);
  const tbody = $("#notifications-table tbody");
  tbody.innerHTML = "";
  const pending = state.notifications.filter((item) => item.pending);
  $("#notifications-table").classList.toggle("hidden", !configured || pending.length === 0);
  $("#notification-empty").classList.toggle("hidden", !configured || pending.length > 0);
  if (!configured) return;
  pending.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.date}</td>
      <td>${item.institution}</td>
      <td>${item.title}</td>
      <td><button class="secondary" data-open-notification="${item.id}">Ver detalle</button></td>`;
    tbody.appendChild(row);
  });
}

function openNotificationDetail(id) {
  const item = state.notifications.find((entry) => entry.id === id);
  if (!item) return;
  $("#casilla-detail").classList.remove("hidden");
  setText("#notification-detail-text", `${item.title}: ${item.detail}`);
}

function renderAuthorizations() {
  const filters = ["todos", "pendiente", "aprobada", "rechazada", "revocada"];
  const filterHost = $("#authorization-filters");
  filterHost.innerHTML = "";
  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.className = `secondary ${state.authFilter === filter ? "is-active" : ""}`;
    button.textContent = filter;
    button.dataset.authFilter = filter;
    filterHost.appendChild(button);
  });

  const rows = state.authFilter === "todos" ? state.authorizations : state.authorizations.filter((item) => item.status === state.authFilter);
  const tbody = $("#authorizations-table tbody");
  tbody.innerHTML = "";
  rows.forEach((item) => {
    const actions = [];
    if (item.status === "pendiente") {
      actions.push(`<button class="primary" data-auth-action="approve" data-auth-id="${item.id}">Aprobar</button>`);
      actions.push(`<button class="secondary" data-auth-action="reject" data-auth-id="${item.id}">Rechazar</button>`);
    }
    if (item.status === "aprobada") {
      actions.push(`<button class="secondary" data-auth-action="revoke" data-auth-id="${item.id}">Revocar</button>`);
    }
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="pill">${item.status}</span></td>
      <td><strong>${item.procedure}</strong><br>${item.data}</td>
      <td>${item.requester}<br><small>Proveedores: ${item.providers}</small></td>
      <td>Solicitud: ${item.requestedAt}<br>Aprobacion: ${item.approvedAt || "No aplica"}<br>Rechazo: ${item.rejectedAt || "No aplica"}<br>Revocacion: ${item.revokedAt || "No aplica"}</td>
      <td><div class="action-row">${actions.join("") || "Sin acciones disponibles"}</div></td>`;
    tbody.appendChild(row);
  });
  renderSharedData();
}

function updateAuthorization(id, action) {
  const today = "2026-06-30";
  state.authorizations = state.authorizations.map((item) => {
    if (item.id !== id) return item;
    if (action === "approve" && item.status === "pendiente") return { ...item, status: "aprobada", approvedAt: today };
    if (action === "reject" && item.status === "pendiente") return { ...item, status: "rechazada", rejectedAt: today };
    if (action === "revoke" && item.status === "aprobada") return { ...item, status: "revocada", revokedAt: today };
    return item;
  });
  saveState();
  renderAuthorizations();
}

function renderSharedData() {
  const tbody = $("#shared-data-table tbody");
  tbody.innerHTML = "";
  state.authorizations
    .filter((item) => item.status === "aprobada" || item.status === "revocada")
    .forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.providers}</td>
        <td>${item.requester}</td>
        <td>${item.approvedAt || item.requestedAt} 10:30</td>
        <td>${item.procedure}</td>`;
      tbody.appendChild(row);
    });
}

function renderServices() {
  $("#files-list").innerHTML = `
    <div><strong>EXP-2026-001</strong><br>Expediente electronico disponible con estado En revision.</div>
    <div><strong>Estado vacio</strong><br>Si no hay expedientes, se informa sin inventar registros.</div>`;
  $("#powers-list").innerHTML = `
    <div><strong>Representacion vigente</strong><br>Juan Perez representa a Maria Soto hasta 2026-12-31.</div>
    <div><strong>Crear poder</strong><br>Flujo prototipado con validaciones de identidad y caso de borde sin representantes.</div>`;
}

function renderInstitutional() {
  $("#integration-list").innerHTML = `
    <article><h3>Solicitud INT-001</h3><p>En revision tecnica, responsable institucional asignado.</p></article>
    <article><h3>Solicitud INT-002</h3><p>Aprobada, credenciales disponibles para mesa privada.</p></article>
    <article><h3>Solicitud INT-003</h3><p>Pendiente de antecedentes, ayuda privada disponible.</p></article>`;
}

function renderSessionState() {
  $("#session-status").textContent = state.session ? "Sesion autenticada" : "Sesion publica";
  $("#logout-button").classList.toggle("hidden", !state.session);
  $("#twofactor-toggle").checked = state.twoFactor;
  $("#twofactor-state").textContent = state.twoFactor ? "2FA activo" : "2FA inactivo";
  $("#second-factor-login").classList.toggle("hidden", !state.twoFactor);
  $("#session-alert").classList.toggle("hidden", !state.anomaly);
  if (state.anomaly) {
    $("#session-alert").textContent = "Actividad anomala detectada: hay una sesion secundaria en observacion. Puedes cerrarla desde este control.";
  }
}

function render() {
  navTo(state.activeScreen);
  $("#phone-input").value = state.phone;
  $("#email-input").value = state.email;
  renderSessionState();
  renderPrivateTab();
  renderNotifications();
  renderAuthorizations();
  renderServices();
  renderInstitutional();
}

function bindEvents() {
  $$(".nav-list button").forEach((button) => button.addEventListener("click", () => navTo(button.dataset.nav)));
  $$("[data-nav-target]").forEach((button) => button.addEventListener("click", () => navTo(button.dataset.navTarget)));
  $("#mobile-menu").addEventListener("click", () => $("#app").classList.toggle("menu-open"));
  $("#activate-button").addEventListener("click", () => openInformationalFlow("activate"));
  $("#recover-button").addEventListener("click", () => openInformationalFlow("recover"));
  $$("[data-open-help]").forEach((button) => {
    button.addEventListener("click", () => {
      const [title, body] = HELP_COPY[button.dataset.openHelp];
      openModal("Ayuda", title, body, [{ id: `close-help-${button.dataset.openHelp}`, label: "Cerrar", kind: "primary" }]);
    });
  });
  $("#login-form").addEventListener("submit", handleLogin);
  $("#logout-button").addEventListener("click", () => setState({ session: false, activeScreen: "publico" }));
  $("#twofactor-toggle").addEventListener("change", (event) => setState({ twoFactor: event.target.checked }));
  $("#simulate-anomaly").addEventListener("click", () => setState({ anomaly: true }));
  $("#close-secondary-sessions").addEventListener("click", () => setState({ anomaly: false }));
  $("#save-contact").addEventListener("click", saveContact);
  $$(".tab").forEach((button) => button.addEventListener("click", () => setState({ privateTab: button.dataset.privateTab })));
  $("#start-ddu-from-section").addEventListener("click", () => openDduGateway("section"));
  $("#reset-ddu").addEventListener("click", () => setState({ dduConfigured: false }));
  $("#notifications-table").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-notification]");
    if (button) openNotificationDetail(button.dataset.openNotification);
  });
  $("#back-notifications").addEventListener("click", () => $("#casilla-detail").classList.add("hidden"));
  $("#authorization-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-filter]");
    if (button) setState({ authFilter: button.dataset.authFilter });
  });
  $("#authorizations-table").addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (button) updateAuthorization(button.dataset.authId, button.dataset.authAction);
  });
  $("#issue-credential").addEventListener("click", () => {
    const code = $("#institution-code").value.trim();
    message("#credential-message", `Credencial institucional preparada para ${code}.`, true);
  });
}

async function loadTraceability() {
  try {
    const response = await fetch("./data/traceability.json", { cache: "no-store" });
    traceability = await response.json();
    applyTraceabilityMarkers();
  } catch (error) {
    console.warn("Traceability data unavailable", error);
  }
}

function applyTraceabilityMarkers() {
  if (!traceability?.requirements) return;
  const bySelector = new Map();
  traceability.requirements.forEach((item) => {
    if (!bySelector.has(item.selector)) bySelector.set(item.selector, []);
    bySelector.get(item.selector).push(item.id);
  });
  bySelector.forEach((ids, selector) => {
    const node = $(selector);
    if (node) node.setAttribute("data-req", ids.join(" "));
  });
  const index = $("#requirement-evidence-index");
  index.innerHTML = "";
  traceability.requirements.forEach((item) => {
    const marker = document.createElement("span");
    marker.dataset.req = item.id;
    marker.dataset.selector = item.selector;
    marker.dataset.flow = item.flow || "";
    index.appendChild(marker);
  });
}

function resetForValidation() {
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(DEFAULT_STATE);
  render();
}

bindEvents();
loadTraceability().then(() => {
  render();
  $("#app").dataset.ready = "true";
  window.UNO_APP = {
    get state() {
      return state;
    },
    get traceability() {
      return traceability;
    },
    reset: resetForValidation
  };
});
