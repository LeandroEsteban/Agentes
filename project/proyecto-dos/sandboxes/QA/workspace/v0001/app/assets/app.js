const state = {
  ready: false,
  activeScreen: "P-03",
  filter: "",
  session: null,
  traceability: null,
  endpoints: [],
  data: null,
  lastApiResult: null,
  auditCounter: 2
};

const moduleOrder = [
  "Seguridad",
  "Dashboard",
  "Clientes",
  "Inventario",
  "Ventas",
  "Devoluciones",
  "Compras",
  "Produccion",
  "Facturacion",
  "Reportes",
  "Alertas",
  "Auditoria"
];

const moduleEntities = {
  Seguridad: ["users"],
  Dashboard: ["sales_orders", "purchase_orders", "production_orders", "invoices", "alerts"],
  Clientes: ["customers", "contacts"],
  Inventario: ["products", "warehouses", "stocks", "inventory_movements"],
  Ventas: ["quotations", "sales_orders", "invoices", "payments"],
  Devoluciones: ["sales_returns"],
  Compras: ["suppliers", "purchase_orders", "goods_receipts", "supplier_invoices"],
  Produccion: ["boms", "production_orders", "inventory_movements"],
  Facturacion: ["invoices", "payments"],
  Reportes: ["sales_orders", "stocks", "purchase_orders", "production_orders", "invoices"],
  Alertas: ["alerts", "email_logs"],
  Auditoria: ["audit"]
};

const formatNumber = new Intl.NumberFormat("es-CL");
const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getScreens() {
  return state.traceability?.screens || [];
}

function visibleScreens() {
  const term = state.filter.trim().toLowerCase();
  const screens = getScreens();
  if (!term) return screens;
  return screens.filter((screen) => `${screen.code} ${screen.title} ${screen.module}`.toLowerCase().includes(term));
}

function moduleClass(status) {
  const value = String(status || "").toLowerCase();
  if (["active", "issued", "approved", "confirmed", "paid", "closed", "completed"].includes(value)) return "success";
  if (["blocked", "failed", "cancelled", "rejected", "inactive"].includes(value)) return "danger";
  if (["draft", "planned", "requested", "paused", "partially_paid", "partially_received"].includes(value)) return "warn";
  return "";
}

function renderNav() {
  const nav = document.querySelector("#nav-list");
  const byModule = new Map();
  visibleScreens().forEach((screen) => {
    if (!byModule.has(screen.module)) byModule.set(screen.module, []);
    byModule.get(screen.module).push(screen);
  });
  nav.innerHTML = moduleOrder
    .filter((module) => byModule.has(module))
    .map((module) => `
      <div class="nav-group">
        <p class="nav-group-title">${module}</p>
        ${byModule.get(module).map((screen) => `
          <button type="button" data-screen="${screen.code}" class="${state.activeScreen === screen.code ? "is-active" : ""}">
            <span class="nav-dot">${screen.module.slice(0, 1)}</span>
            <span>${screen.title}</span>
          </button>
        `).join("")}
      </div>
    `)
    .join("");
  nav.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.screen));
  });
}

function renderHeader() {
  const active = getScreens().find((screen) => screen.code === state.activeScreen) || getScreens()[0];
  document.querySelector("#screen-module").textContent = active?.module || "ERP";
  document.querySelector("#screen-title").textContent = active ? active.title : "ERP";
  document.querySelector("#session-status").textContent = state.session ? `Sesion ${state.session.role}` : "Sesion publica";
}

function renderScreens() {
  const root = document.querySelector("#screen-root");
  root.innerHTML = getScreens().map((screen) => renderScreen(screen)).join("");
  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.screen));
  });
}

function renderScreen(screen) {
  const active = state.activeScreen === screen.code;
  if (screen.code === "P-01") return renderLogin(screen, active);
  if (screen.code === "P-03") return renderDashboard(screen, active);
  if (screen.code === "P-36") return renderReports(screen, active);
  if (screen.code === "P-40") return renderAudit(screen, active);
  return `
    <section id="${screen.selector.slice(1)}" class="screen" ${active ? "" : "hidden"} data-req="${screen.requirements.join(" ")}" aria-labelledby="${screen.selector.slice(1)}-title">
      <div class="screen-layout">
        <div class="panel">
          <p class="kicker">${screen.module}</p>
          <h2 id="${screen.selector.slice(1)}-title">${screen.title}</h2>
          <p class="lead">${screen.summary}</p>
          ${renderFields(screen)}
          ${renderActions(screen)}
        </div>
        <div class="panel">
          <p class="kicker">Estado operativo</p>
          ${renderModuleSnapshot(screen.module)}
        </div>
        <div class="panel wide">
          <p class="kicker">Registros</p>
          ${renderModuleTables(screen.module)}
        </div>
        <div class="panel wide">
          <p class="kicker">Flujos del modulo</p>
          ${renderUseCases(screen.module)}
        </div>
      </div>
    </section>
  `;
}

function renderLogin(screen, active) {
  return `
    <section id="${screen.selector.slice(1)}" class="screen" ${active ? "" : "hidden"} data-req="${screen.requirements.join(" ")}">
      <div class="screen-layout">
        <form class="panel" id="login-form">
          <p class="kicker">Seguridad</p>
          <h2>Ingreso al ERP</h2>
          <label>Correo
            <input id="login-email" value="admin@aurora.cl" autocomplete="username" />
          </label>
          <label>Contrasena
            <input id="login-password" value="clave-segura" type="password" autocomplete="current-password" />
          </label>
          <div class="action-row">
            <button type="button" class="primary" data-action="login" data-screen="${screen.code}">Ingresar</button>
            <button type="button" class="secondary" data-action="recover-password" data-screen="${screen.code}">Recuperar contrasena</button>
          </div>
          <p id="login-message" class="lead">${state.session ? "Usuario autenticado con rol y permisos activos." : "Ingresa con tu usuario corporativo para operar el ERP."}</p>
        </form>
        <div class="panel">
          <p class="kicker">Permisos</p>
          <h2>RBAC operativo</h2>
          <div class="flow-grid">
            ${["customers.read", "sales.confirm", "inventory.adjust", "billing.issue", "reports.export", "audit.read"].map((permission) => `
              <div class="flow-card"><strong>${permission}</strong><span>Asignado a Administrador</span></div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDashboard(screen, active) {
  const data = state.data;
  const salesTotal = data.sales_orders.reduce((sum, item) => sum + item.total, 0);
  const invoiceDebt = data.invoices.reduce((sum, item) => sum + item.balance, 0);
  const criticalStock = data.stocks.filter((stock) => {
    const product = data.products.find((item) => item.id === stock.product_id);
    return product && stock.physical_qty - stock.reserved_qty <= product.stock_min;
  }).length;
  const delayedProduction = data.production_orders.filter((item) => !["closed", "completed"].includes(item.status)).length;
  return `
    <section id="${screen.selector.slice(1)}" class="screen" ${active ? "" : "hidden"} data-req="${screen.requirements.join(" ")}">
      <div class="panel">
        <p class="kicker">Dashboard</p>
        <h2>Resumen general</h2>
        <div class="metric-grid">
          <div class="metric"><strong>${currency.format(salesTotal)}</strong><span>Ventas abiertas</span></div>
          <div class="metric"><strong>${criticalStock}</strong><span>Stocks criticos</span></div>
          <div class="metric"><strong>${currency.format(invoiceDebt)}</strong><span>Facturas pendientes</span></div>
          <div class="metric"><strong>${delayedProduction}</strong><span>Produccion por cerrar</span></div>
        </div>
      </div>
      <div class="screen-layout">
        <div class="panel">
          <p class="kicker">Actividad</p>
          ${renderEntityCards(data.audit.slice(-5).reverse())}
        </div>
        <div class="panel">
          <p class="kicker">Alertas</p>
          ${renderEntityCards(data.alerts.concat(data.email_logs))}
        </div>
      </div>
    </section>
  `;
}

function renderReports(screen, active) {
  return `
    <section id="${screen.selector.slice(1)}" class="screen" ${active ? "" : "hidden"} data-req="${screen.requirements.join(" ")}">
      <div class="screen-layout">
        <div class="panel">
          <p class="kicker">Reportes</p>
          <h2>Ventas, compras, inventario, produccion y facturacion</h2>
          <div class="metric-grid">
            <div class="metric"><strong>${state.data.sales_orders.length}</strong><span>Ventas</span></div>
            <div class="metric"><strong>${state.data.purchase_orders.length}</strong><span>Compras</span></div>
            <div class="metric"><strong>${state.data.stocks.length}</strong><span>Saldos stock</span></div>
            <div class="metric"><strong>${state.data.invoices.length}</strong><span>Documentos</span></div>
          </div>
          <div class="action-row">
            <button class="primary" data-action="export-report" data-screen="${screen.code}">Exportar XLSX</button>
            <button class="secondary" data-action="export-pdf" data-screen="${screen.code}">Exportar PDF</button>
          </div>
        </div>
        <div class="panel">
          <p class="kicker">Control</p>
          <h2>Preferencias y exportaciones</h2>
          <p class="lead">Los reportes respetan permisos financieros, filtros guardados y registro de auditoría.</p>
          <div class="flow-grid">
            <div class="flow-card"><strong>Permisos</strong><span>Costos y deuda solo para perfiles autorizados</span></div>
            <div class="flow-card"><strong>Exportación</strong><span>XLSX y PDF con registro de usuario</span></div>
            <div class="flow-card"><strong>Filtros</strong><span>Fecha, bodega, sucursal y responsable</span></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAudit(screen, active) {
  return `
    <section id="${screen.selector.slice(1)}" class="screen" ${active ? "" : "hidden"} data-req="${screen.requirements.join(" ")}">
      <div class="panel">
        <p class="kicker">Auditoria</p>
        <h2>Bitacora funcional</h2>
        ${renderTable(state.data.audit)}
      </div>
    </section>
  `;
}

function renderFields(screen) {
  const fields = screen.fields?.length ? screen.fields : ["busqueda", "estado", "fecha"];
  return `
    <div class="form-grid">
      ${fields.slice(0, 7).map((field, index) => `
        <label>${field}
          <input id="${slug(screen.code)}-field-${index}" value="${sampleValue(field, screen.module)}" />
        </label>
      `).join("")}
    </div>
  `;
}

function renderActions(screen) {
  const actions = screen.actions?.length ? screen.actions : ["guardar", "consultar"];
  return `
    <div class="action-row">
      ${actions.slice(0, 7).map((action) => `
        <button type="button" class="${action.match(/guardar|crear|confirmar|aprobar|emitir|registrar|transferir|cerrar|cobrar/i) ? "primary" : "secondary"}" data-action="${slug(action)}" data-screen="${screen.code}">${action}</button>
      `).join("")}
    </div>
  `;
}

function sampleValue(field, module) {
  const lower = String(field).toLowerCase();
  if (lower.includes("correo")) return "contacto@aurora.cl";
  if (lower.includes("documento")) return "77.555.666-7";
  if (lower.includes("sku")) return "NEW-001";
  if (lower.includes("cantidad")) return "5";
  if (lower.includes("monto") || lower.includes("precio") || lower.includes("total") || lower.includes("limite")) return "100000";
  if (lower.includes("fecha")) return "2026-07-01";
  if (lower.includes("estado")) return "active";
  if (module === "Clientes") return "Cliente Nuevo";
  return "Dato de trabajo";
}

function renderModuleSnapshot(module) {
  const keys = moduleEntities[module] || [];
  return `
    <div class="flow-grid">
      ${keys.map((key) => `
        <div class="flow-card"><strong>${state.data[key]?.length || 0}</strong><span>${key.replaceAll("_", " ")}</span></div>
      `).join("")}
    </div>
  `;
}

function renderModuleTables(module) {
  const keys = moduleEntities[module] || ["audit"];
  return keys.map((key) => `
    <h3>${key.replaceAll("_", " ")}</h3>
    ${renderTable((state.data[key] || []).slice(0, 6))}
  `).join("");
}

function renderUseCases(module) {
  const cases = (state.traceability?.use_cases || []).filter((item) => item.module === module);
  if (!cases.length) return `<div class="empty">Sin casos especificos para este modulo.</div>`;
  return `
    <div class="flow-grid">
      ${cases.map((item) => `
        <div class="flow-card"><strong>${item.title}</strong><span>Flujo operativo del módulo</span></div>
      `).join("")}
    </div>
  `;
}

function renderEntityCards(items) {
  if (!items.length) return `<div class="empty">Sin registros.</div>`;
  return `
    <div class="entity-grid">
      ${items.map((item) => `
        <article class="entity-card">
          <strong>${item.name || item.legal_name || item.id || item.number || item.type || item.action}</strong>
          <div class="entity-meta">${Object.entries(item).slice(0, 5).map(([key, value]) => `${prettyKey(key)}: ${String(value)}`).join("<br />")}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTable(rows) {
  if (!rows || !rows.length) return `<div class="empty">Sin registros.</div>`;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 7);
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${columns.map((column) => `<th>${column.replaceAll("_", " ")}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${columns.map((column) => `<td>${formatCell(row[column])}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatCell(value) {
  if (typeof value === "number") return value > 999 ? formatNumber.format(value) : String(value);
  if (typeof value === "boolean") return value ? "si" : "no";
  const text = String(value ?? "");
  if (["active", "issued", "approved", "confirmed", "paid", "closed", "completed", "blocked", "failed", "cancelled", "rejected", "draft", "planned", "requested", "paused", "partially_paid"].includes(text)) {
    return `<span class="pill ${moduleClass(text)}">${text}</span>`;
  }
  return text;
}

function prettyKey(key) {
  const labels = {
    id: "Código",
    customer_id: "Cliente",
    product_id: "Producto",
    warehouse_id: "Bodega",
    alert_id: "Alerta",
    user: "Usuario",
    module: "Módulo",
    action: "Acción",
    entity: "Registro",
    type: "Tipo",
    condition: "Condición",
    frequency: "Frecuencia",
    recipients: "Destinatarios",
    recipient: "Destinatario",
    status: "Estado",
    attempts: "Intentos"
  };
  return labels[key] || key.replaceAll("_", " ");
}

function renderTraceMarkers() {
  const target = document.querySelector("#coverage-markers");
  const groups = state.traceability?.marker_groups || [];
  target.innerHTML = groups.map((group) => `<div id="${group.selector.slice(1)}" hidden data-req="${group.requirements.join(" ")}"></div>`).join("");
}

function navigate(screenCode) {
  state.activeScreen = screenCode;
  document.querySelector("#app").classList.remove("menu-open");
  render();
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2200);
}

function addAudit(module, action, entity) {
  state.data.audit.push({
    id: `aud-${String(state.auditCounter++).padStart(3, "0")}`,
    user: state.session?.name || "Sistema local",
    module,
    action,
    entity,
    created_at: new Date().toISOString()
  });
}

function handleAction(rawAction, screenCode) {
  const screen = getScreens().find((item) => item.code === screenCode);
  const action = rawAction || "";
  const module = screen?.module || "ERP";
  if (action === "login") {
    state.session = { name: "Admin ERP", role: "Administrador" };
    addAudit("Seguridad", "login", "users");
    toast("Sesion iniciada.");
    render();
    return;
  }
  if (action === "recover-password") {
    toast("Enlace de recuperacion registrado en auditoria.");
    addAudit("Seguridad", "recover-password", "users");
    return;
  }

  if (action === "emitir-factura") {
    issueInvoice();
    render();
    return;
  }
  if (action === "registrar-produccion") {
    const order = state.data.production_orders[0];
    order.produced_qty = 48;
    order.waste_qty = 2;
    addAudit("Produccion", "report_output", "production_orders");
    toast("Produccion reportada.");
    render();
    return;
  }

  const handlers = [
    [/guardar|crear|agregar|actualizar|editar/, () => createOrUpdate(module)],
    [/inactivar|bloquear|pausar/, () => changeStatus(module, "inactive")],
    [/desbloquear|activar/, () => changeStatus(module, "active")],
    [/confirmar|aprobar|emitir/, () => changeStatus(module, "approved")],
    [/rechazar|anular/, () => changeStatus(module, "cancelled")],
    [/transferir/, () => transferStock()],
    [/calcular|ajuste|confirmar/, () => adjustStock()],
    [/despachar/, () => dispatchSale()],
    [/facturar/, () => issueInvoice()],
    [/cobrar|pago|registrar-pago/, () => registerPayment()],
    [/recibir|recepcion/, () => receiveGoods(module)],
    [/liberar/, () => releaseProduction()],
    [/cerrar/, () => closeProduction()],
    [/exportar/, () => exportReport(action)],
    [/reintentar/, () => retryEmail()],
    [/convertir/, () => convertQuotation()]
  ];
  const match = handlers.find(([pattern]) => pattern.test(action));
  if (match) {
    match[1]();
  } else {
    addAudit(module, action, screen?.title || "screen");
    toast(`Accion ${action} ejecutada.`);
  }
  render();
}

function createOrUpdate(module) {
  if (module === "Clientes" && !state.data.customers.some((item) => item.id === "cus-003")) {
    state.data.customers.push({ id: "cus-003", legal_name: "Cliente Nuevo", tax_id: "77.555.666-7", email: "nuevo@aurora.cl", status: "active", credit_status: "normal", credit_limit: 100000, debt: 0 });
  }
  if (module === "Inventario" && !state.data.products.some((item) => item.id === "prd-004")) {
    state.data.products.push({ id: "prd-004", sku: "NEW-001", name: "Producto Nuevo", category: "Retail", unit: "UN", track_stock: true, sale_price: 100000, cost: 60000, stock_min: 5, status: "active" });
  }
  if (module === "Compras" && !state.data.suppliers.some((item) => item.id === "sup-002")) {
    state.data.suppliers.push({ id: "sup-002", legal_name: "Proveedor Nuevo", tax_id: "80.555.666-7", email: "proveedor@aurora.cl", status: "active", payment_term_days: 30 });
  }
  if (module === "Alertas" && !state.data.alerts.some((item) => item.id === "alt-002")) {
    state.data.alerts.push({ id: "alt-002", type: "facturas_vencidas", condition: "balance > 0", frequency: "weekly", recipients: "finanzas@aurora.cl", status: "active" });
  }
  addAudit(module, "create_or_update", module);
  toast(`${module}: registro guardado.`);
}

function changeStatus(module, status) {
  const firstKey = moduleEntities[module]?.[0];
  const row = firstKey ? state.data[firstKey]?.[0] : null;
  if (row) row.status = status;
  addAudit(module, `status_${status}`, firstKey || module);
  toast(`${module}: estado actualizado a ${status}.`);
}

function adjustStock() {
  const stock = state.data.stocks[0];
  stock.physical_qty += 5;
  state.data.inventory_movements.push({ id: `mov-${state.data.inventory_movements.length + 1}`, product: "TER-001", warehouse: "BOD-CEN", type: "ajuste", quantity: 5, reason: "ajuste local" });
  addAudit("Inventario", "adjust_stock", "inventory_movements");
  toast("Ajuste de inventario aplicado.");
}

function transferStock() {
  const origin = state.data.stocks.find((item) => item.product_id === "prd-001" && item.warehouse_id === "wh-001");
  const dest = state.data.stocks.find((item) => item.product_id === "prd-001" && item.warehouse_id === "wh-002");
  origin.physical_qty -= 3;
  dest.physical_qty += 3;
  state.data.inventory_movements.push({ id: `mov-${state.data.inventory_movements.length + 1}`, product: "TER-001", warehouse: "BOD-VTA", type: "transferencia", quantity: 3, reason: "reposicion sala" });
  addAudit("Inventario", "transfer_stock", "inventory_transfers");
  toast("Transferencia entre bodegas registrada.");
}

function convertQuotation() {
  if (!state.data.sales_orders.some((item) => item.id === "so-002")) {
    state.data.sales_orders.push({ id: "so-002", customer: "Cliente Andes Ltda", status: "draft", total: 239800, stock_policy: "reserve", dispatched_qty: 0 });
  }
  state.data.quotations[0].status = "converted";
  addAudit("Ventas", "convert_quotation", "sales_orders");
  toast("Cotizacion convertida en orden de venta.");
}

function dispatchSale() {
  const order = state.data.sales_orders[0];
  order.status = "dispatched";
  order.dispatched_qty = 2;
  addAudit("Ventas", "dispatch_sale", "sales_dispatches");
  toast("Despacho de venta registrado.");
}

function issueInvoice() {
  if (!state.data.invoices.some((item) => item.id === "inv-002")) {
    state.data.invoices.push({ id: "inv-002", customer: "Cliente Andes Ltda", number: "F-1002", status: "issued", total: 119900, balance: 119900 });
  }
  addAudit("Facturacion", "issue_invoice", "invoices");
  toast("Factura emitida.");
}

function registerPayment() {
  const invoice = state.data.invoices[0];
  const amount = Math.min(invoice.balance, 50000);
  invoice.balance -= amount;
  invoice.status = invoice.balance === 0 ? "paid" : "partially_paid";
  state.data.payments.push({ id: `pay-${state.data.payments.length + 1}`, invoice_id: invoice.id, amount, method: "transferencia", status: "issued" });
  addAudit("Facturacion", "register_payment", "payments");
  toast("Pago registrado.");
}

function receiveGoods(module) {
  if (module === "Devoluciones") {
    state.data.sales_returns[0].status = "received";
    toast("Devolucion recibida.");
  } else {
    state.data.purchase_orders[0].status = "received";
    state.data.goods_receipts.push({ id: `gr-${state.data.goods_receipts.length + 1}`, purchase_order_id: "po-001", warehouse: "BOD-CEN", status: "received", received_qty: 10 });
    toast("Recepcion registrada.");
  }
  addAudit(module, "receive", module);
}

function releaseProduction() {
  state.data.production_orders[0].status = "in_process";
  addAudit("Produccion", "release_materials", "production_orders");
  toast("Insumos liberados.");
}

function closeProduction() {
  const order = state.data.production_orders[0];
  order.status = "closed";
  order.produced_qty = order.produced_qty || 48;
  order.waste_qty = order.waste_qty || 2;
  addAudit("Produccion", "close_order", "production_orders");
  toast("Orden de produccion cerrada.");
}

function exportReport(action) {
  addAudit("Reportes", action, "report_exports");
  toast(`Reporte ${action.includes("pdf") ? "PDF" : "XLSX"} preparado localmente.`);
}

function retryEmail() {
  const failed = state.data.email_logs.find((item) => item.status === "failed");
  if (failed) {
    failed.status = "sent";
    failed.attempts += 1;
  }
  addAudit("Alertas", "retry_email", "email_logs");
  toast("Correo reintentado.");
}

function endpointToRegex(path) {
  return new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{[^}]+\\\}/g, "[^/]+")}$`);
}

function apiRequest(method, path, body = {}) {
  const route = state.endpoints.find((endpoint) => endpoint.method === method && endpointToRegex(endpoint.path).test(path));
  const meta = { request_id: `REQ-${Date.now()}`, timestamp: new Date().toISOString() };
  if (!route) return { error: { code: "not_found", message: "Endpoint no registrado" }, meta };
  return {
    data: {
      route: `${route.method} ${route.path}`,
      description: route.description,
      accepted: true,
      body,
      sample: sampleForRoute(route)
    },
    meta
  };
}

function sampleForRoute(route) {
  const resource = route.path.split("/")[3] || "root";
  const key = resource.replaceAll("-", "_");
  return state.data[key]?.[0] || { status: "ok" };
}

function samplePath(path) {
  return path.replace(/\{[^}]+\}/g, "registro-1");
}

function validateApiCatalog() {
  const errors = [];
  if (state.endpoints.length !== 130) errors.push(`endpoint_count:${state.endpoints.length}`);
  state.endpoints.forEach((endpoint, index) => {
    if (!endpoint.path.startsWith("/api/v1")) errors.push(`base_path:${index + 1}`);
    if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(endpoint.method)) errors.push(`method:${index + 1}`);
    const response = apiRequest(endpoint.method, samplePath(endpoint.path));
    if (response.error) errors.push(`route_unmatched:${endpoint.method} ${endpoint.path}`);
  });
  return {
    status: errors.length ? "fail" : "pass",
    endpoint_count: state.endpoints.length,
    errors
  };
}

function runEndpoint(mode) {
  state.lastApiResult = mode === "all" ? validateApiCatalog() : apiRequest("GET", "/api/v1/customers");
  toast(state.lastApiResult.status === "pass" ? "Catalogo API validado." : "API con observaciones.");
  render();
}

function reset() {
  state.data = clone(window.DOS_SEED);
  state.session = null;
  state.lastApiResult = null;
  state.auditCounter = 2;
  render();
}

function render() {
  renderNav();
  renderHeader();
  renderTraceMarkers();
  renderScreens();
}

async function init() {
  const [traceability, apiCatalog, seed] = await Promise.all([
    loadJson("./data/traceability.json"),
    loadJson("./data/api-catalog.json"),
    loadJson("./data/seed.json")
  ]);
  state.traceability = traceability;
  state.endpoints = apiCatalog.endpoints;
  window.DOS_SEED = clone(seed);
  state.data = clone(seed);
  document.querySelector("#screen-filter").addEventListener("input", (event) => {
    state.filter = event.target.value;
    renderNav();
  });
  document.querySelector("#mobile-menu").addEventListener("click", () => {
    document.querySelector("#app").classList.toggle("menu-open");
  });
  state.ready = true;
  render();
  document.querySelector("#app").dataset.ready = "true";
}

window.DOS_APP = {
  state,
  navigate,
  handleAction,
  apiRequest,
  validateApiCatalog,
  reset: () => reset(),
  get traceability() { return state.traceability; }
};

init().catch((error) => {
  document.querySelector("#screen-root").innerHTML = `<div class="panel"><h2>Error de carga</h2><p>${error.message}</p></div>`;
  console.error(error);
});
