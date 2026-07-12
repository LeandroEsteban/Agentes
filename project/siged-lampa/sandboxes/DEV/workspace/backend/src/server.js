const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const BOOTSTRAP = require("./data");

const PORT = Number(process.env.PORT || 4173);
const ROOT = path.resolve(__dirname, "..", "..");
const FRONTEND_ROOT = path.join(ROOT, "frontend");

const db = {
  roles: clone(BOOTSTRAP.seed.demo.roles),
  users: clone(BOOTSTRAP.seed.demo.users).map((user, index) => ({
    id: index + 1,
    status: "ACTIVE",
    password: user.surface === "portal" ? "vecino123" : "demo123",
    ...user
  })),
  documents: [
    {id: 1, folio: "DOC-2026-0001", title: "Decreto alcaldicio", type: "Decreto", department: "Secretaria Municipal", status: "En revision", owner: "Ana Rojas", due: "2026-07-12"},
    {id: 2, folio: "DOC-2026-0002", title: "Memo Direccion de Obras", type: "Memo", department: "DOM", status: "Borrador", owner: "Luis Perez", due: "2026-07-15"},
    {id: 3, folio: "DOC-2026-0003", title: "Respuesta caso OIRS", type: "Oficio", department: "OIRS", status: "Firmado", owner: "Carolina Soto", due: "2026-07-09"}
  ],
  expedients: [
    {id: 1, code: "EXP-2026-014", subject: "Permiso obra menor", status: "Abierto", owner: "DOM"},
    {id: 2, code: "EXP-2026-021", subject: "Retiro de escombros", status: "En tramite", owner: "OIRS"}
  ],
  requests: [
    {id: 1, tracking: "TR-2026-00044", subject: "Certificado de residencia", status: "Ingresada", channel: "Portal ciudadano"},
    {id: 2, tracking: "OIRS-2026-00112", subject: "Consulta retiro de escombros", status: "Asignada", channel: "OIRS"}
  ],
  audit: [{at: new Date().toISOString(), action: "factory.bootstrap", detail: "SIGED-Lampa DEV API iniciado"}]
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/v1/")) {
      await routeApi(req, res, url);
      return;
    }
    serveFrontend(res, url.pathname);
  } catch (error) {
    json(res, 500, {ok: false, error: String(error.message || error)});
  }
});

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/v1/health") return json(res, 200, {ok: true, service: "siged-lampa", mode: process.env.SIGED_DATA_MODE || "memory"});
  if (req.method === "GET" && url.pathname === "/api/v1/bootstrap") return json(res, 200, {ok: true, data: publicBootstrap()});
  if (req.method === "GET" && url.pathname === "/api/v1/traceability") return json(res, 200, {ok: true, data: BOOTSTRAP.trace});
  if (req.method === "GET" && url.pathname === "/api/v1/endpoints") return json(res, 200, {ok: true, data: BOOTSTRAP.api.endpoints});
  if (req.method === "GET" && url.pathname === "/api/v1/users") return json(res, 200, {ok: true, data: db.users.map(safeUser)});
  if (req.method === "GET" && url.pathname === "/api/v1/roles") return json(res, 200, {ok: true, data: db.roles});
  if (req.method === "GET" && url.pathname === "/api/v1/documents") return json(res, 200, {ok: true, data: db.documents});
  if (req.method === "POST" && url.pathname === "/api/v1/documents") return createDocument(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/expedients") return json(res, 200, {ok: true, data: db.expedients});
  if (req.method === "GET" && url.pathname === "/api/v1/citizen/requests") return json(res, 200, {ok: true, data: db.requests});
  if (req.method === "POST" && url.pathname === "/api/v1/citizen/requests") return createRequest(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/reports/dashboard") return json(res, 200, {ok: true, data: dashboard()});
  if (req.method === "POST" && url.pathname === "/api/v1/auth/login") return login(req, res);
  json(res, 404, {ok: false, error: "Endpoint no implementado", path: url.pathname});
}

async function login(req, res) {
  const body = await readBody(req);
  const surface = body.surface === "portal" ? "portal" : "intranet";
  const user = db.users.find(item => item.username === body.username && item.surface === surface);
  if (!user || user.password !== (body.password || "")) {
    return json(res, 401, {ok: false, error: "Credenciales invalidas para la superficie seleccionada"});
  }
  const token = crypto.createHash("sha256").update(`${user.username}:${Date.now()}`).digest("hex");
  audit("auth.login", `${surface}:${user.username}`);
  json(res, 200, {ok: true, data: {access_token: `dev.${token}`, user: safeUser(user)}});
}

async function createDocument(req, res) {
  const body = await readBody(req);
  const item = {
    id: db.documents.length + 1,
    folio: `DOC-2026-${String(db.documents.length + 1).padStart(4, "0")}`,
    title: body.title || "Nuevo documento",
    type: body.type || "Oficio",
    department: body.department || "Secretaria Municipal",
    status: "Borrador",
    owner: body.owner || "Funcionario municipal",
    due: body.due || "2026-07-20"
  };
  db.documents.unshift(item);
  audit("documents.create", item.folio);
  json(res, 201, {ok: true, data: item});
}

async function createRequest(req, res) {
  const body = await readBody(req);
  const item = {
    id: db.requests.length + 1,
    tracking: `TR-2026-${String(db.requests.length + 45).padStart(5, "0")}`,
    subject: body.subject || "Solicitud ciudadana",
    status: "Ingresada",
    channel: "Portal ciudadano"
  };
  db.requests.unshift(item);
  audit("citizen.request.create", item.tracking);
  json(res, 201, {ok: true, data: item});
}

function publicBootstrap() {
  return {
    seed: BOOTSTRAP.seed,
    api: BOOTSTRAP.api,
    trace: BOOTSTRAP.trace,
    runtime: {
      roles: db.roles,
      users: db.users.map(safeUser),
      documents: db.documents,
      expedients: db.expedients,
      requests: db.requests,
      audit: db.audit
    }
  };
}

function dashboard() {
  return {
    documents_active: db.documents.length,
    pending_reviews: db.documents.filter(item => item.status === "En revision").length,
    expedients_open: db.expedients.length,
    citizen_cases: db.requests.length,
    audit_events: db.audit.length
  };
}

function serveFrontend(res, pathname) {
  const requested = ["/", "/login", "/intranet", "/portal"].includes(pathname) ? "/index.html" : pathname;
  const file = path.normalize(path.join(FRONTEND_ROOT, requested));
  if (!file.startsWith(FRONTEND_ROOT)) return text(res, 403, "Forbidden");
  fs.readFile(file, (error, content) => {
    if (error) return text(res, 404, "Not found");
    res.writeHead(200, {"Content-Type": mime(file), "Cache-Control": "no-store"});
    res.end(content);
  });
}

function safeUser(user) {
  const copy = {...user};
  delete copy.password;
  return copy;
}

function audit(action, detail) {
  db.audit.unshift({at: new Date().toISOString(), action, detail});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"});
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, status, payload) {
  res.writeHead(status, {"Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store"});
  res.end(payload);
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

server.listen(PORT, () => {
  console.log(`SIGED-Lampa running at http://localhost:${PORT}/login`);
});
