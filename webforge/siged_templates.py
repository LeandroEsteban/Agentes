from __future__ import annotations

import json
from typing import Any


def _package_json() -> str:
    return json.dumps(
        {
            "name": "siged-lampa-dev-prototype",
            "version": "0.1.0",
            "private": True,
            "scripts": {
                "start": "node backend/server.js",
                "dev": "node backend/server.js",
                "start:static": "python -m http.server 4173 -d frontend",
                "verify": "python scripts/verify_siged_bundle.py",
                "check:backend": "node --check backend/server.js",
                "check:frontend": "node --check frontend/assets/app.js",
            },
            "dependencies": {},
            "engines": {"node": ">=18"},
        },
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )


def _env_example() -> str:
    return "\n".join(
        [
            "NODE_ENV=development",
            "PORT=4173",
            "DATABASE_URL=postgres://siged:siged_dev_password@localhost:5432/siged_lampa",
            "AUTH_SIGNING_KEY=replace-before-production",
            "SIGED_DATA_MODE=memory",
        ]
    )


def _dockerfile() -> str:
    return "\n".join(
        [
            "FROM node:20-slim",
            "WORKDIR /app",
            "COPY package.json ./",
            "COPY backend ./backend",
            "COPY frontend ./frontend",
            "COPY data ./data",
            "COPY db ./db",
            "ENV NODE_ENV=production",
            "ENV PORT=4173",
            "EXPOSE 4173",
            "CMD [\"node\", \"backend/server.js\"]",
        ]
    )


def _backend_server_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    payload = json.dumps(
        {"seed": seed, "api": api_catalog, "trace": traceability},
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )
    return _backend_server_template().replace("__SIGED_SERVER_PAYLOAD__", payload)


def _backend_server_template() -> str:
    return r"""
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const BOOTSTRAP = __SIGED_SERVER_PAYLOAD__;
const PORT = Number(process.env.PORT || 4173);
const ROOT = path.resolve(__dirname, "..");
const FRONTEND_ROOT = path.join(ROOT, "frontend");

const db = {
  roles: structuredClone(BOOTSTRAP.seed.demo.roles),
  users: structuredClone(BOOTSTRAP.seed.demo.users),
  documents: [
    {folio:"DOC-2026-0001", title:"Decreto alcaldicio", type:"Decreto", department:"Secretaria Municipal", status:"En revision", owner:"Ana Rojas", due:"2026-07-12"},
    {folio:"DOC-2026-0002", title:"Memo Direccion Obras", type:"Memo", department:"DOM", status:"Borrador", owner:"Luis Perez", due:"2026-07-15"},
    {folio:"DOC-2026-0003", title:"Respuesta OIRS", type:"Oficio", department:"OIRS", status:"Firmado", owner:"Carolina Soto", due:"2026-07-09"}
  ],
  expedients: [
    {code:"EXP-2026-014", subject:"Permiso obra menor", status:"Abierto", owner:"DOM", documents:["DOC-2026-0002"]},
    {code:"EXP-2026-021", subject:"Reclamo retiro de escombros", status:"En tramite", owner:"OIRS", documents:["DOC-2026-0003"]}
  ],
  correspondence: [
    {tracking:"COR-2026-0077", direction:"INBOUND", subject:"Ingreso solicitud JJVV", status:"Derivada", department:"DIDECO"},
    {tracking:"COR-2026-0081", direction:"OUTBOUND", subject:"Respuesta oficio regional", status:"Preparacion", department:"Alcaldia"}
  ],
  requests: [
    {tracking:"TR-2026-00044", subject:"Certificado de residencia", status:"Ingresada", channel:"Portal ciudadano"},
    {tracking:"TR-2026-00045", subject:"Permiso ocupacion BNUP", status:"En revision", channel:"Portal ciudadano"}
  ],
  oirs: [
    {tracking:"OIRS-2026-00112", category:"Consulta", subject:"Retiro de escombros", status:"Asignada", owner:"OIRS"},
    {tracking:"OIRS-2026-00118", category:"Reclamo", subject:"Alumbrado publico", status:"Nueva", owner:"SECPLA"}
  ],
  audit: ["Backend SIGED-Lampa iniciado en modo memoria"]
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/v1/")) {
      await routeApi(req, res, url);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (error) {
    json(res, 500, {ok:false, message:"Error interno", error:String(error.message || error)});
  }
});

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/v1/health") return json(res, 200, {ok:true, service:"SIGED-Lampa", mode:"memory"});
  if (req.method === "GET" && url.pathname === "/api/v1/bootstrap") return json(res, 200, {ok:true, data:{...BOOTSTRAP, runtime: snapshot()}});
  if (req.method === "POST" && url.pathname === "/api/v1/auth/login") return login(req, res);
  if (req.method === "POST" && url.pathname === "/api/v1/auth/citizen-login") return login(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/users") return json(res, 200, {ok:true, data:db.users});
  if (req.method === "GET" && url.pathname === "/api/v1/roles") return json(res, 200, {ok:true, data:db.roles});
  if (req.method === "GET" && url.pathname === "/api/v1/documents") return json(res, 200, {ok:true, data:db.documents});
  if (req.method === "POST" && url.pathname === "/api/v1/documents") return createDocument(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/expedients") return json(res, 200, {ok:true, data:db.expedients});
  if (req.method === "GET" && url.pathname === "/api/v1/correspondence") return json(res, 200, {ok:true, data:db.correspondence});
  if (req.method === "POST" && url.pathname === "/api/v1/correspondence") return createCorrespondence(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/citizen/requests") return json(res, 200, {ok:true, data:db.requests});
  if (req.method === "POST" && url.pathname.match(/^\/api\/v1\/public\/tramites\/[^/]+\/requests$/)) return createRequest(req, res);
  if (req.method === "POST" && url.pathname === "/api/v1/public/oirs") return createOirs(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/oirs") return json(res, 200, {ok:true, data:db.oirs});
  if (req.method === "GET" && url.pathname === "/api/v1/reports/dashboard") return json(res, 200, {ok:true, data:report()});
  if (req.method === "GET" && url.pathname === "/api/v1/notifications") return json(res, 200, {ok:true, data:[]});
  json(res, 404, {ok:false, message:"Endpoint no implementado en demo", path:url.pathname});
}

async function login(req, res) {
  const body = await readBody(req);
  const surface = body.surface || "intranet";
  const username = body.username || "";
  const user = db.users.find(item => item.username === username && item.surface === surface) || db.users.find(item => item.surface === surface);
  if (!user) return json(res, 401, {ok:false, message:"Usuario no valido para la superficie"});
  const token = crypto.createHash("sha256").update(`${user.username}:${Date.now()}`).digest("hex");
  db.audit.unshift(`Login ${surface}: ${user.username}`);
  json(res, 200, {ok:true, data:{access_token:`demo.${token}`, user}});
}

async function createDocument(req, res) {
  const body = await readBody(req);
  const folio = `DOC-2026-${String(db.documents.length + 1).padStart(4, "0")}`;
  const item = {folio, title:body.title || "Nuevo documento", type:body.type || "Oficio", department:body.department || "Secretaria Municipal", status:"Borrador", owner:body.owner || "Funcionario", due:body.due || "2026-07-20"};
  db.documents.unshift(item);
  db.audit.unshift(`Documento creado via API: ${folio}`);
  json(res, 201, {ok:true, data:item});
}

async function createCorrespondence(req, res) {
  const body = await readBody(req);
  const tracking = `COR-2026-${String(db.correspondence.length + 82).padStart(4, "0")}`;
  const item = {tracking, direction:body.direction || "INBOUND", subject:body.subject || "Nueva correspondencia", status:"Registrada", department:body.department || "Oficina de Partes"};
  db.correspondence.unshift(item);
  db.audit.unshift(`Correspondencia creada via API: ${tracking}`);
  json(res, 201, {ok:true, data:item});
}

async function createRequest(req, res) {
  const body = await readBody(req);
  const tracking = `TR-2026-${String(db.requests.length + 46).padStart(5, "0")}`;
  const item = {tracking, subject:body.subject || "Solicitud ciudadana", status:"Ingresada", channel:"Portal ciudadano"};
  db.requests.unshift(item);
  db.audit.unshift(`Solicitud ciudadana creada via API: ${tracking}`);
  json(res, 201, {ok:true, data:item});
}

async function createOirs(req, res) {
  const body = await readBody(req);
  const tracking = `OIRS-2026-${String(db.oirs.length + 119).padStart(5, "0")}`;
  const item = {tracking, category:body.category || "Consulta", subject:body.subject || "Caso OIRS", status:"Nueva", owner:"OIRS"};
  db.oirs.unshift(item);
  db.audit.unshift(`OIRS creado via API: ${tracking}`);
  json(res, 201, {ok:true, data:item});
}

function snapshot() {
  return {roles:db.roles, users:db.users, documents:db.documents, expedients:db.expedients, correspondence:db.correspondence, requests:db.requests, oirs:db.oirs, audit:db.audit};
}

function report() {
  return {
    documents_active: db.documents.length,
    pending_reviews: db.documents.filter(item => item.status === "En revision").length,
    expedients_open: db.expedients.length,
    citizen_cases: db.requests.length + db.oirs.length,
    audit_events: db.audit.length
  };
}

function serveStatic(res, pathname) {
  const requested = ["/", "/login", "/intranet", "/portal"].includes(pathname) ? "/index.html" : pathname;
  const file = path.normalize(path.join(FRONTEND_ROOT, requested));
  if (!file.startsWith(FRONTEND_ROOT)) return text(res, 403, "Forbidden");
  fs.readFile(file, (error, content) => {
    if (error) return text(res, 404, "Not found");
    res.writeHead(200, {"Content-Type": mime(file), "Cache-Control": "no-store"});
    res.end(content);
  });
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

function json(res, status, value) {
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
  res.end(JSON.stringify(value, null, 2));
}

function text(res, status, value) {
  res.writeHead(status, {"Content-Type":"text/plain; charset=utf-8"});
  res.end(value);
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

server.listen(PORT, () => {
  console.log(`SIGED-Lampa backend/frontend running at http://localhost:${PORT}`);
});
""".strip()


# ---------------------------------------------------------------------------
# SIGED real-app generator overrides.
#
# These definitions intentionally appear after the original prototype helpers.
# Python binds the later functions, so SIGED runs now materialize a fuller
# backend/frontend/DB bundle while preserving the old public function names.


def _package_json() -> str:
    return json.dumps(
        {
            "name": "siged-lampa",
            "version": "0.2.0",
            "private": True,
            "type": "commonjs",
            "scripts": {
                "start": "node backend/server.js",
                "dev": "node backend/server.js",
                "verify": "python scripts/verify_siged_bundle.py",
                "check:backend": "node --check backend/server.js && node --check backend/src/server.js",
                "check:frontend": "node --check frontend/assets/app.js",
            },
            "dependencies": {},
            "engines": {"node": ">=18"},
        },
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )


def _env_example() -> str:
    return "\n".join(
        [
            "NODE_ENV=development",
            "PORT=4173",
            "SIGED_DATA_MODE=memory",
            "DATABASE_URL=postgres://siged@postgres:5432/siged_lampa",
            "AUTH_SIGNING_KEY=replace-before-production",
        ]
    )


def _dockerfile() -> str:
    return "\n".join(
        [
            "FROM node:20-slim",
            "WORKDIR /app",
            "COPY package.json ./",
            "COPY backend ./backend",
            "COPY frontend ./frontend",
            "COPY data ./data",
            "COPY db ./db",
            "ENV NODE_ENV=production",
            "ENV PORT=4173",
            "EXPOSE 4173",
            "CMD [\"node\", \"backend/server.js\"]",
        ]
    )


def _docker_compose_yml() -> str:
    return "\n".join(
        [
            "services:",
            "  app:",
            "    build: .",
            "    ports:",
            "      - \"4173:4173\"",
            "    env_file:",
            "      - .env.example",
            "    depends_on:",
            "      - postgres",
            "  postgres:",
            "    image: postgres:16-alpine",
            "    environment:",
            "      POSTGRES_DB: siged_lampa",
            "      POSTGRES_USER: siged",
            "      POSTGRES_HOST_AUTH_METHOD: trust",
            "    ports:",
            "      - \"5432:5432\"",
            "    volumes:",
            "      - siged_pgdata:/var/lib/postgresql/data",
            "      - ./db/migrations:/docker-entrypoint-initdb.d:ro",
            "volumes:",
            "  siged_pgdata:",
        ]
    )


def _backend_server_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    return "require(\"./src/server\");\n"


def _backend_data_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    payload = json.dumps(
        {"seed": seed, "api": api_catalog, "trace": traceability},
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )
    return "module.exports = " + payload + ";\n"


def _backend_src_server_js() -> str:
    return r"""
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
""".strip()


def _styles_css() -> str:
    return r"""
:root {
  color-scheme: light;
  --ink: #172026;
  --muted: #5f6f7a;
  --line: #d9e1e6;
  --bg: #f4f7f8;
  --panel: #ffffff;
  --nav: #14313d;
  --blue: #1f6fb2;
  --green: #24745d;
  --amber: #a96800;
  --red: #b93a3a;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
}
button, input, select { font: inherit; }
button { cursor: pointer; }
.login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(360px, .9fr) minmax(420px, 1.1fr); }
.login-side { background: var(--nav); color: white; padding: 44px; display: flex; flex-direction: column; justify-content: space-between; }
.mark { width: 44px; height: 44px; border-radius: 8px; display: grid; place-items: center; background: #e8f3f2; color: var(--nav); font-weight: 800; }
.login-side h1 { font-size: 36px; line-height: 1.08; margin: 24px 0 12px; letter-spacing: 0; max-width: 560px; }
.login-side p { color: #c7d7de; line-height: 1.55; max-width: 560px; }
.source-list { display: grid; gap: 10px; margin-top: 28px; max-width: 620px; }
.source-list div { border-top: 1px solid rgba(255,255,255,.16); padding-top: 10px; display: flex; justify-content: space-between; gap: 16px; }
.login-main { display: grid; place-items: center; padding: 36px; }
.login-card { width: min(440px, 100%); background: white; border: 1px solid var(--line); border-radius: 8px; padding: 26px; box-shadow: 0 18px 48px rgba(20,49,61,.14); }
.login-card h2 { font-size: 22px; margin: 0 0 4px; letter-spacing: 0; }
.muted { color: var(--muted); }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 18px 0; }
.tabs button, .btn { border: 1px solid var(--line); background: white; border-radius: 6px; padding: 10px 12px; color: var(--ink); }
.tabs button.active { border-color: var(--blue); background: #e8f1fa; color: var(--blue); }
.field { display: grid; gap: 6px; margin: 12px 0; }
.field label { font-size: 13px; font-weight: 650; color: #2f424d; }
.field input, .field select { min-height: 42px; border: 1px solid var(--line); border-radius: 6px; padding: 9px 11px; background: white; width: 100%; }
.btn.primary { background: var(--blue); border-color: var(--blue); color: white; }
.btn.green { background: var(--green); border-color: var(--green); color: white; }
.btn.full { width: 100%; margin-top: 6px; }
.error { min-height: 20px; color: var(--red); font-size: 13px; margin-top: 8px; }
.hint { border-top: 1px solid var(--line); margin-top: 16px; padding-top: 14px; font-size: 13px; color: var(--muted); line-height: 1.45; }
.shell { min-height: 100vh; display: grid; grid-template-columns: 276px 1fr; }
.sidebar { background: var(--nav); color: #f8fbfd; padding: 18px 14px; }
.brand { font-size: 21px; font-weight: 780; margin: 8px 0 2px; letter-spacing: 0; }
.nav { display: grid; gap: 6px; margin-top: 20px; }
.nav button { text-align: left; color: inherit; background: transparent; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; padding: 9px 10px; }
.nav button.active { background: #e8f3f2; color: #14313d; border-color: #e8f3f2; }
.main { padding: 24px; max-width: 1440px; width: 100%; }
.topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
h2 { margin: 0 0 12px; font-size: 18px; letter-spacing: 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin-bottom: 14px; }
.split { display: grid; grid-template-columns: 1.2fr .8fr; gap: 14px; align-items: start; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
.kpi strong { display: block; font-size: 28px; margin: 4px 0; }
.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 8px; background: white; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { background: #eef3f5; color: #30434d; font-size: 13px; }
tr:last-child td { border-bottom: 0; }
.pill { display: inline-flex; border-radius: 999px; background: #eef3f5; padding: 3px 8px; font-size: 12px; white-space: nowrap; }
.pill.green { background: #e4f2ed; color: var(--green); }
.pill.blue { background: #e8f1fa; color: var(--blue); }
.pill.amber { background: #fff2dd; color: var(--amber); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 12px; }
.trace { display: grid; gap: 12px; }
.trace-line { border-left: 3px solid var(--blue); padding: 6px 0 6px 10px; }
@media (max-width: 900px) {
  .login-page, .shell, .split, .grid, .form-grid { grid-template-columns: 1fr; }
  .login-side { padding: 28px; }
  .login-main, .main { padding: 20px; }
  .topbar { display: grid; }
}
""".strip()


def _app_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    return _frontend_src_app_js(seed, api_catalog, traceability)


def _frontend_src_app_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    payload = json.dumps(
        {"seed": seed, "api": api_catalog, "trace": traceability},
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )
    return _real_frontend_template().replace("__SIGED_CLIENT_PAYLOAD__", payload)


def _real_frontend_template() -> str:
    return r"""
const SIGED = __SIGED_CLIENT_PAYLOAD__;

const state = {
  surface: "intranet",
  user: null,
  token: "",
  error: "",
  view: "dashboard",
  data: {
    roles: SIGED.seed.demo.roles,
    users: SIGED.seed.demo.users,
    documents: SIGED.seed.demo.documents,
    expedients: [],
    requests: SIGED.seed.demo.requests,
    audit: []
  }
};

const navigation = SIGED.seed.navigation || {
  intranet: [{id: "dashboard", label: "Inicio", kind: "dashboard", surface: "intranet"}],
  portal: [{id: "portal-home", label: "Inicio", kind: "portal-home", surface: "portal"}],
  all: []
};
const intranetViews = navigation.intranet.map(item => [item.id, item.label, item]);
const portalViews = navigation.portal.map(item => [item.id, item.label, item]);
const accessPolicy = SIGED.seed.access_policy || {surfaces: {}};

function render() {
  const route = currentRoute();
  if (route === "/login") {
    document.querySelector("#app").innerHTML = login();
  } else if (state.user) {
    if (!isAllowedView(state.view)) state.view = defaultView();
    document.querySelector("#app").innerHTML = shell();
  } else {
    navigate("/login", false);
    document.querySelector("#app").innerHTML = login();
  }
  bind();
}

function currentRoute() {
  return location.pathname === "/" ? "/login" : location.pathname;
}

function navigate(path, rerender = true) {
  if (location.pathname !== path) history.pushState({}, "", path);
  if (rerender) render();
}

function visibleViews() {
  return state.user?.surface === "portal" ? portalViews : intranetViews;
}

function defaultView() {
  const surface = state.user?.surface === "portal" ? "portal" : "intranet";
  return accessPolicy.surfaces?.[surface]?.default_view || (surface === "portal" ? "portal-home" : "dashboard");
}

function isAllowedView(view) {
  return visibleViews().some(([id]) => id === view);
}

function currentNavItem() {
  return visibleViews().find(([id]) => id === state.view)?.[2] || null;
}

function login() {
  const users = SIGED.seed.demo.users.filter(user => user.surface === state.surface);
  return `
    <main class="login-page">
      <section class="login-side">
        <div>
          <div class="mark">SL</div>
          <h1>SIGED-Lampa</h1>
          <p>Acceso municipal y portal ciudadano para gestion documental, expedientes, OIRS, correspondencia y trazabilidad operacional.</p>
          <div class="source-list">
            <div><span>Fuentes autorizadas</span><strong>${SIGED.trace.source_docs.length}</strong></div>
            <div><span>Modulos funcionales</span><strong>${SIGED.seed.modules.length}</strong></div>
            <div><span>Endpoints inventariados</span><strong>${SIGED.api.endpoints.length}</strong></div>
            <div><span>Tablas ER</span><strong>${SIGED.seed.er_tables.length}</strong></div>
          </div>
        </div>
        <p>DEV local generado por la fabrica. Sin datos productivos ni integraciones externas activas.</p>
      </section>
      <section class="login-main">
        <form class="login-card" data-form="login">
          <h2>Inicio de sesion</h2>
          <div class="muted">Seleccione superficie y usuario demo.</div>
          <div class="tabs">
            <button type="button" data-surface="intranet" class="${state.surface === "intranet" ? "active" : ""}">Intranet</button>
            <button type="button" data-surface="portal" class="${state.surface === "portal" ? "active" : ""}">Usuario normal</button>
          </div>
          <div class="field">
            <label for="username">Usuario</label>
            <select id="username">${users.map(user => `<option value="${user.username}">${user.full_name} - ${roleName(user.role)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label for="password">Clave</label>
            <input id="password" type="password" value="${state.surface === "portal" ? "vecino123" : "demo123"}">
          </div>
          <button class="btn primary full" type="submit">Ingresar</button>
          <div class="error">${state.error}</div>
          <div class="hint">Endpoint usado: <strong>POST /api/v1/auth/login</strong>. La sesion queda en memoria local para este incremento DEV.</div>
        </form>
      </section>
    </main>
  `;
}

function shell() {
  return `
    <main class="shell">
      <aside class="sidebar">
        <div class="mark">SL</div>
        <div class="brand">SIGED-Lampa</div>
        <div class="muted">${state.user.full_name}<br>${roleName(state.user.role)}</div>
        <nav class="nav">
          ${visibleViews().map(([id, label]) => `<button data-view="${id}" class="${state.view === id ? "active" : ""}">${label}</button>`).join("")}
          <button data-action="logout">Cerrar sesion</button>
        </nav>
      </aside>
      <section class="main">
        <div class="topbar">
          <div>
            <h1>${title()}</h1>
            <div class="muted">${state.user.surface === "portal" ? "Portal ciudadano" : "Intranet municipal"} conectado a backend local.</div>
          </div>
          <div class="actions">
            <button class="btn" data-action="refresh">Actualizar</button>
            <button class="btn green" data-action="health">Health API</button>
          </div>
        </div>
        ${content()}
      </section>
    </main>
  `;
}

function content() {
  if (state.user?.surface === "portal") return portalContent();
  if (state.view === "documents") return documents();
  if (state.view === "expedients") return tableCard("Expedientes activos", ["Codigo", "Materia", "Estado", "Responsable"], state.data.expedients.map(item => [item.code, item.subject, badge(item.status), item.owner]));
  if (state.view === "requests") return requests();
  if (state.view === "users") return users();
  if (state.view === "trace") return trace();
  if (state.view === "dashboard") return dashboard();
  return generatedView();
}

function portalContent() {
  if (state.view === "new-request") return requestForm("Nuevo tramite municipal");
  if (state.view === "profile") return citizenProfile();
  if (state.view === "requests") return citizenRequests();
  if (state.view === "portal-home") return portalHome();
  return generatedView();
}

function portalHome() {
  return `
    <section class="grid">
      <div class="card kpi"><span class="muted">Solicitudes activas</span><strong>${state.data.requests.length}</strong><span>Seguimiento ciudadano</span></div>
      <div class="card kpi"><span class="muted">Ultimo estado</span><strong>${escapeHtml(state.data.requests[0]?.status || "Sin casos")}</strong><span>${escapeHtml(state.data.requests[0]?.tracking || "Ingrese un tramite")}</span></div>
      <div class="card kpi"><span class="muted">Canal</span><strong>Portal</strong><span>Atencion municipal digital</span></div>
      <div class="card kpi"><span class="muted">Usuario</span><strong>${escapeHtml(state.user.full_name)}</strong><span>${escapeHtml(state.user.email)}</span></div>
    </section>
    <section class="split">
      ${citizenRequests()}
      <div class="card">
        <h2>Acciones disponibles</h2>
        <div class="actions">
          <button class="btn primary" data-view="new-request">Ingresar tramite</button>
          <button class="btn" data-view="requests">Ver seguimiento</button>
        </div>
      </div>
    </section>
  `;
}

function dashboard() {
  const kpis = [
    ["Documentos activos", state.data.documents.length],
    ["Usuarios demo", state.data.users.length],
    ["Solicitudes ciudadanas", state.data.requests.length],
    ["Eventos auditados", state.data.audit.length]
  ];
  return `
    <section class="grid">${kpis.map(([label, value]) => `<div class="card kpi"><span class="muted">${label}</span><strong>${value}</strong><span>Datos desde API local</span></div>`).join("")}</section>
    <section class="split">
      ${tableCard("Trabajo documental reciente", ["Folio", "Titulo", "Estado", "Unidad"], state.data.documents.map(item => [item.folio, item.title, badge(item.status), item.owner]))}
      <div class="card">
        <h2>Flujos criticos</h2>
        ${SIGED.seed.critical_flows.map(flow => `<div class="trace-line"><strong>${flow.name}</strong><br><span class="muted">${flow.screens.join(" -> ")}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function documents() {
  return `
    <section class="split">
      <div>
        ${tableCard("Bandeja documental", ["Folio", "Titulo", "Tipo", "Estado", "Responsable"], state.data.documents.map(item => [item.folio, item.title, item.type || "-", badge(item.status), item.owner]))}
      </div>
      <form class="card" data-form="document">
        <h2>Nuevo documento</h2>
        <div class="form-grid">
          ${field("doc-title", "Titulo", "Oficio a entidad externa")}
          ${field("doc-type", "Tipo", "Oficio")}
          ${field("doc-department", "Unidad", "Secretaria Municipal")}
          ${field("doc-owner", "Responsable", state.user.full_name)}
        </div>
        <button class="btn primary" type="submit">Crear borrador</button>
      </form>
    </section>
  `;
}

function requests() {
  return `
    <section class="split">
      ${tableCard("Solicitudes ciudadanas", ["Tracking", "Materia", "Estado", "Canal"], state.data.requests.map(item => [item.tracking, item.subject, badge(item.status), item.channel]))}
      ${requestForm("Ingreso ciudadano")}
    </section>
  `;
}

function citizenRequests() {
  return tableCard("Mis solicitudes", ["Tracking", "Materia", "Estado", "Canal"], state.data.requests.map(item => [item.tracking, item.subject, badge(item.status), item.channel]));
}

function requestForm(titleText) {
  return `
    <form class="card" data-form="request">
      <h2>${titleText}</h2>
      ${field("request-subject", "Materia", "Certificado de residencia")}
      <button class="btn primary" type="submit">Enviar solicitud</button>
    </form>
  `;
}

function citizenProfile() {
  return tableCard("Mi perfil", ["Campo", "Valor"], [
    ["Nombre", state.user.full_name],
    ["Usuario", state.user.username],
    ["Correo", state.user.email],
    ["Rol", roleName(state.user.role)]
  ]);
}

function users() {
  return `
    <section class="split">
      ${tableCard("Usuarios semilla", ["Usuario", "Nombre", "Rol", "Superficie"], state.data.users.map(item => [item.username, item.full_name, roleName(item.role), item.surface]))}
      ${tableCard("Roles", ["Codigo", "Nombre", "Superficie"], state.data.roles.map(item => [item.code, item.name, item.surface]))}
    </section>
  `;
}

function trace() {
  return `
    <section class="trace">
      ${tableCard("Fuentes autorizadas", ["Archivo", "Lineas", "SHA-256"], SIGED.trace.source_docs.map(item => [item.name, item.lines, item.sha256]))}
      ${tableCard("Modulo a pantallas y endpoints", ["Modulo", "Nombre", "Pantallas", "Endpoints"], SIGED.trace.module_trace.map(item => [item.module, item.name, item.screens.join(" "), item.endpoints.join(" ")]))}
      ${tableCard("Catalogo API", ["Codigo", "Metodo", "Ruta", "Auth"], SIGED.api.endpoints.slice(0, 20).map(item => [item.code, item.method, item.path, item.auth]))}
    </section>
  `;
}

function generatedView() {
  const item = currentNavItem();
  if (!item) return `<section class="card"><h2>Vista no disponible</h2><p class="muted">La vista solicitada no pertenece a esta superficie.</p></section>`;
  const screens = item.source_screens || [];
  const endpoints = (item.endpoint_codes || []).map(code => SIGED.api.endpoints.find(endpoint => endpoint.code === code)).filter(Boolean);
  return `
    <section class="split">
      ${tableCard(item.label, ["Pantalla", "Ruta", "Actor"], screens.map(screen => [screen.code, screen.route || "-", screen.actor || "-"]))}
      ${tableCard("Endpoints relacionados", ["Codigo", "Metodo", "Ruta"], endpoints.map(endpoint => [endpoint.code, endpoint.method, endpoint.path]))}
    </section>
  `;
}

function bind() {
  document.querySelectorAll("[data-surface]").forEach(button => button.addEventListener("click", () => {
    state.surface = button.dataset.surface;
    state.error = "";
    render();
  }));
  document.querySelector("[data-form='login']")?.addEventListener("submit", loginSubmit);
  document.querySelector("[data-form='document']")?.addEventListener("submit", documentSubmit);
  document.querySelector("[data-form='request']")?.addEventListener("submit", requestSubmit);
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    if (state.user && currentRoute() === "/login") {
      navigate(state.user.surface === "portal" ? "/portal" : "/intranet", false);
    }
    render();
  }));
  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    state.user = null;
    state.token = "";
    state.view = "dashboard";
    navigate("/login", false);
    render();
  });
  document.querySelector("[data-action='refresh']")?.addEventListener("click", loadBootstrap);
  document.querySelector("[data-action='health']")?.addEventListener("click", health);
}

async function loginSubmit(event) {
  event.preventDefault();
  const body = {
    surface: state.surface,
    username: value("username"),
    password: value("password")
  };
  try {
    const result = await api("/api/v1/auth/login", {method: "POST", body});
    state.user = result.data.user;
    state.token = result.data.access_token;
    state.error = "";
    await loadBootstrap();
    state.view = defaultView();
    navigate(state.user.surface === "portal" ? "/portal" : "/intranet", false);
    render();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function documentSubmit(event) {
  event.preventDefault();
  const result = await api("/api/v1/documents", {method: "POST", body: {title: value("doc-title"), type: value("doc-type"), department: value("doc-department"), owner: value("doc-owner")}});
  state.data.documents.unshift(result.data);
  render();
}

async function requestSubmit(event) {
  event.preventDefault();
  const result = await api("/api/v1/citizen/requests", {method: "POST", body: {subject: value("request-subject")}});
  state.data.requests.unshift(result.data);
  render();
}

async function loadBootstrap() {
  try {
    const result = await api("/api/v1/bootstrap");
    state.data = result.data.runtime;
  } catch (error) {
    state.data = {...state.data, audit: [{action: "static.fallback", detail: "Backend no disponible"}]};
  }
}

async function health() {
  const result = await api("/api/v1/health");
  alert(`${result.service || "SIGED"}: ${result.mode || "ok"}`);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {"Content-Type": "application/json"},
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.error || "Error API");
  return payload;
}

function title() {
  return visibleViews().find(([id]) => id === state.view)?.[1] || "SIGED-Lampa";
}

function tableCard(titleText, headers, rows) {
  return `<div class="card"><h2>${titleText}</h2><div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
}

function field(id, label, initial) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${escapeHtml(initial)}"></div>`;
}

function value(id) {
  return document.querySelector(`#${id}`)?.value || "";
}

function roleName(code) {
  return SIGED.seed.demo.roles.find(role => role.code === code)?.name || code;
}

function badge(value) {
  const text = String(value || "");
  const cls = text.includes("Firmado") ? "green" : text.includes("revision") || text.includes("Asignada") || text.includes("tramite") ? "amber" : "blue";
  return `<span class="pill ${cls}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[char]));
}

window.addEventListener("popstate", render);
render();
""".strip()


def _schema_sql(profile: dict[str, Any]) -> str:
    lines = [
        "-- SIGED-Lampa initial schema generated from authorized SIGED markdown sources.",
        "-- DEV migration baseline. Review constraints and indexes before production.",
        "",
        "CREATE TABLE IF NOT EXISTS roles (",
        "  code TEXT PRIMARY KEY,",
        "  name TEXT NOT NULL,",
        "  surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')),",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS users (",
        "  id BIGSERIAL PRIMARY KEY,",
        "  username TEXT NOT NULL UNIQUE,",
        "  email TEXT NOT NULL UNIQUE,",
        "  full_name TEXT NOT NULL,",
        "  password_hash TEXT NOT NULL,",
        "  role_code TEXT NOT NULL REFERENCES roles(code),",
        "  surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')),",
        "  department TEXT NOT NULL,",
        "  status TEXT NOT NULL DEFAULT 'ACTIVE',",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),",
        "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS documents (",
        "  id BIGSERIAL PRIMARY KEY,",
        "  folio TEXT NOT NULL UNIQUE,",
        "  title TEXT NOT NULL,",
        "  type TEXT NOT NULL,",
        "  department TEXT NOT NULL,",
        "  status TEXT NOT NULL,",
        "  owner_username TEXT REFERENCES users(username),",
        "  due_date DATE,",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS expedients (",
        "  id BIGSERIAL PRIMARY KEY,",
        "  code TEXT NOT NULL UNIQUE,",
        "  subject TEXT NOT NULL,",
        "  status TEXT NOT NULL,",
        "  owner_department TEXT NOT NULL,",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS citizen_requests (",
        "  id BIGSERIAL PRIMARY KEY,",
        "  tracking TEXT NOT NULL UNIQUE,",
        "  subject TEXT NOT NULL,",
        "  status TEXT NOT NULL,",
        "  channel TEXT NOT NULL,",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS audit_events (",
        "  id BIGSERIAL PRIMARY KEY,",
        "  actor_username TEXT,",
        "  action TEXT NOT NULL,",
        "  detail TEXT NOT NULL,",
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()",
        ");",
        "",
    ]
    for table in profile["er_tables"]:
        name = table["name"]
        if name in {"roles", "users", "documents", "expedients", "citizen_requests", "audit_events"}:
            continue
        lines.extend(
            [
                f"-- Source table: {name} | {table['purpose']}",
                f"CREATE TABLE IF NOT EXISTS {name} (",
                "  id BIGSERIAL PRIMARY KEY,",
                "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),",
                "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
                ");",
                "",
            ]
        )
    return "\n".join(lines + [_seed_sql()])


def _seed_sql() -> str:
    return "\n".join(
        [
            "-- Demo seed. Passwords are placeholders for DEV only.",
            "INSERT INTO roles (code, name, surface) VALUES",
            "  ('ADMIN', 'Administrador', 'intranet'),",
            "  ('FUNC', 'Funcionario municipal', 'intranet'),",
            "  ('OF_PARTES', 'Oficina de partes', 'intranet'),",
            "  ('REVISOR', 'Revisor o jefatura', 'intranet'),",
            "  ('OIRS', 'Operador OIRS', 'intranet'),",
            "  ('REPORTES', 'Analista de reportes', 'intranet'),",
            "  ('CIUDADANO', 'Usuario ciudadano', 'portal')",
            "ON CONFLICT (code) DO NOTHING;",
            "",
            "INSERT INTO users (username, email, full_name, password_hash, role_code, surface, department) VALUES",
            "  ('admin.lampa', 'admin@lampa.cl', 'Marcela Torres', 'dev_hash_demo123', 'ADMIN', 'intranet', 'Administracion Municipal'),",
            "  ('funcionario.dom', 'lperez@lampa.cl', 'Luis Perez', 'dev_hash_demo123', 'FUNC', 'intranet', 'Direccion de Obras'),",
            "  ('partes', 'partes@lampa.cl', 'Ana Rojas', 'dev_hash_demo123', 'OF_PARTES', 'intranet', 'Oficina de Partes'),",
            "  ('revisor.secmun', 'rsilva@lampa.cl', 'Roberto Silva', 'dev_hash_demo123', 'REVISOR', 'intranet', 'Secretaria Municipal'),",
            "  ('oirs.operador', 'csoto@lampa.cl', 'Carolina Soto', 'dev_hash_demo123', 'OIRS', 'intranet', 'OIRS'),",
            "  ('vecino.demo', 'vecino@correo.cl', 'Vecino Demo', 'dev_hash_vecino123', 'CIUDADANO', 'portal', 'Portal ciudadano')",
            "ON CONFLICT (username) DO NOTHING;",
            "",
            "INSERT INTO documents (folio, title, type, department, status, owner_username, due_date) VALUES",
            "  ('DOC-2026-0001', 'Decreto alcaldicio', 'Decreto', 'Secretaria Municipal', 'En revision', 'partes', '2026-07-12'),",
            "  ('DOC-2026-0002', 'Memo Direccion de Obras', 'Memo', 'DOM', 'Borrador', 'funcionario.dom', '2026-07-15')",
            "ON CONFLICT (folio) DO NOTHING;",
        ]
    )


def _implementation_plan(profile: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# SIGED-Lampa implementation plan",
            "",
            "## Incremento generado por la fabrica",
            "",
            "- Backend Node HTTP modular en `backend/src/server.js` con endpoint `POST /api/v1/auth/login`.",
            "- Frontend SPA en `frontend/` con login como primera pantalla y consumo real de API.",
            "- Copia `app/` mantenida solo para revision rapida por archivo.",
            "- Migracion y seed en `db/migrations/001_initial.sql` y `db/seeds/001_demo.sql`.",
            "- Preparacion EC2 mediante `Dockerfile`, `docker-compose.yml` y `.env.example`.",
            "- Backlog trazable por modulo, pantalla, endpoint y tabla en `tasks/`.",
            "- Fuentes SIGED copiadas en `sources/` con hashes en trazabilidad.",
            "",
            "## Pendiente antes de produccion",
            "",
            "1. Reemplazar password demo por hashing real y JWT firmado.",
            "2. Conectar el backend a PostgreSQL usando `DATABASE_URL`.",
            "3. Agregar RBAC por endpoint y pruebas E2E por flujo critico.",
            "4. Configurar Nginx/HTTPS/PM2 o Docker Compose en EC2.",
            "",
            "## Cobertura derivada",
            "",
            *[f"- {key}: {value}" for key, value in profile["counts"].items()],
        ]
    )


def _verify_script() -> str:
    return r"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> int:
    seed = read_json("data/seed.json")
    api = read_json("data/api-catalog.json")
    trace = read_json("data/traceability.json")
    portal_nav = seed.get("navigation", {}).get("portal", [])
    intranet_nav = seed.get("navigation", {}).get("intranet", [])
    portal_ids = {item.get("id") for item in portal_nav}
    portal_labels = {item.get("label") for item in portal_nav}
    checks = {
        "backend_entry": (ROOT / "backend" / "server.js").exists(),
        "backend_src": (ROOT / "backend" / "src" / "server.js").exists(),
        "frontend_entry": (ROOT / "frontend" / "index.html").exists(),
        "frontend_app": (ROOT / "frontend" / "assets" / "app.js").exists(),
        "frontend_src": (ROOT / "frontend" / "src" / "app.js").exists(),
        "login_endpoint": "/api/v1/auth/login" in (ROOT / "backend" / "src" / "server.js").read_text(encoding="utf-8"),
        "docker_compose": (ROOT / "docker-compose.yml").exists(),
        "migration": (ROOT / "db" / "migrations" / "001_initial.sql").exists(),
        "seed_sql": (ROOT / "db" / "seeds" / "001_demo.sql").exists(),
        "sources_present": (ROOT / "sources").exists() and any((ROOT / "sources").glob("*.md")),
        "backlog_present": (ROOT / "tasks" / "product-backlog.json").exists(),
        "navigation_contract": bool(portal_nav) and bool(intranet_nav),
        "access_policy_contract": "access_policy" in seed and "surfaces" in seed["access_policy"],
        "portal_blocks_internal_view_ids": not (portal_ids & {"documents", "expedients", "users", "trace", "dashboard"}),
        "portal_blocks_internal_labels": not (portal_labels & {"Documentos", "Expedientes", "Usuarios y roles", "Trazabilidad"}),
        "modules>=10": len(seed["modules"]) >= 10,
        "screens>=30": len(seed["screens"]) >= 30,
        "endpoints>=40": len(api["endpoints"]) >= 40,
        "er_tables>=40": len(seed["er_tables"]) >= 40,
        "source_docs>=4": len(trace["source_docs"]) >= 4,
    }
    failed = [name for name, ok in checks.items() if not ok]
    print(json.dumps({"status": "pass" if not failed else "error", "failed": failed, "checks": checks}, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
""".strip()

def _index_html(profile: dict[str, Any]) -> str:
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="es">',
            "<head>",
            '  <meta charset="utf-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1">',
            f"  <title>{profile['product']} | WEBFORGE DEV</title>",
            '  <link rel="stylesheet" href="assets/styles.css">',
            "</head>",
            "<body>",
            '  <div id="app"></div>',
            '  <script src="assets/app.js"></script>',
            "</body>",
            "</html>",
        ]
    )


def _styles_css() -> str:
    return """
:root {
  color-scheme: light;
  --ink: #172026;
  --muted: #64717b;
  --line: #d8e0e6;
  --bg: #f6f8f9;
  --panel: #ffffff;
  --blue: #1f6fb2;
  --green: #27745f;
  --amber: #ad6b00;
  --red: #b23939;
  --nav: #102735;
  --soft: #edf3f6;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--bg);
}
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
.layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
.sidebar { background: var(--nav); color: #f8fbfd; padding: 18px 14px; }
.brand { font-size: 22px; font-weight: 760; margin-bottom: 4px; letter-spacing: 0; }
.subtle { color: var(--muted); }
.sidebar .subtle { color: #b8c9d4; }
.nav { display: grid; gap: 6px; margin-top: 18px; }
.nav-group { margin: 16px 0 6px; color: #b8c9d4; font-size: 12px; text-transform: uppercase; }
.nav button {
  border: 1px solid rgba(255,255,255,.16);
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 9px 10px;
  border-radius: 6px;
}
.nav button.active { background: #eaf4f0; color: #14362c; border-color: #eaf4f0; }
.content { padding: 24px; max-width: 1440px; width: 100%; }
.topbar { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: 0; }
h2 { font-size: 18px; margin: 0 0 12px; letter-spacing: 0; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.search, select, input, textarea {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 9px 11px;
  background: white;
}
.search { min-width: 260px; }
textarea { width: 100%; min-height: 100px; resize: vertical; }
.btn {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  border-radius: 6px;
  padding: 9px 11px;
}
.btn.primary { background: var(--blue); border-color: var(--blue); color: white; }
.btn.green { background: var(--green); border-color: var(--green); color: white; }
.btn.warn { background: var(--amber); border-color: var(--amber); color: white; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
}
.kpi { display: grid; gap: 5px; }
.kpi strong { font-size: 26px; }
.bands { display: grid; grid-template-columns: 1.25fr .75fr; gap: 14px; align-items: start; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 12px; }
.form-row { display: grid; gap: 5px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 8px; background: white; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { background: #edf3f6; font-size: 13px; color: #31424d; }
tr:last-child td { border-bottom: 0; }
.pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  background: #edf3f6;
  color: #34424b;
  font-size: 12px;
  white-space: nowrap;
}
.pill.green { background: #e5f3ee; color: var(--green); }
.pill.blue { background: #e6f0fa; color: var(--blue); }
.pill.amber { background: #fff3df; color: var(--amber); }
.pill.red { background: #fdecec; color: var(--red); }
.flow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.flow span, .route-chip { border: 1px solid var(--line); border-radius: 6px; padding: 7px 9px; background: white; }
.trace { display: grid; gap: 10px; }
.timeline { display: grid; gap: 8px; }
.timeline div { border-left: 3px solid var(--blue); padding: 4px 0 4px 10px; }
.hero {
  background: linear-gradient(135deg, #0f3342, #1f6fb2);
  color: white;
  padding: 28px;
  border-radius: 8px;
  margin-bottom: 14px;
}
.hero h1 { font-size: 34px; }
.module-strip { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.empty { padding: 18px; color: var(--muted); }
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(420px, .95fr) minmax(420px, 1.05fr);
  background: #eef3f5;
}
.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 44px;
  background: #12313f;
  color: white;
}
.login-brand { display: grid; gap: 8px; }
.login-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eaf4f0;
  color: #12313f;
  font-weight: 800;
}
.login-panel h1 { font-size: 36px; margin: 0 0 12px; max-width: 560px; }
.login-panel p { color: #c7d8e1; max-width: 560px; line-height: 1.55; }
.login-status {
  display: grid;
  gap: 10px;
  margin-top: 28px;
  max-width: 560px;
}
.login-status div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid rgba(255,255,255,.16);
  padding-top: 10px;
}
.login-form-wrap {
  display: grid;
  place-items: center;
  padding: 40px;
}
.login-card {
  width: min(430px, 100%);
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 26px;
  box-shadow: 0 16px 40px rgba(23,32,38,.12);
}
.login-card h2 { font-size: 22px; margin-bottom: 4px; }
.login-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
.login-tabs button {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 6px;
  padding: 10px;
}
.login-tabs button.active { background: #e6f0fa; border-color: var(--blue); color: var(--blue); }
.login-card .form-row { margin-top: 12px; }
.login-card label { font-weight: 650; font-size: 13px; color: #31424d; }
.login-card input, .login-card select { width: 100%; min-height: 42px; }
.login-error {
  display: block;
  min-height: 20px;
  color: var(--red);
  margin-top: 8px;
  font-size: 13px;
}
.login-help {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--muted);
}
@media (max-width: 920px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .grid, .bands, .split, .form-grid { grid-template-columns: 1fr; }
  .topbar { display: grid; }
  .search { min-width: 0; width: 100%; }
  .login-page { grid-template-columns: 1fr; }
  .login-panel { padding: 28px; }
  .login-form-wrap { padding: 20px; }
}
""".strip()


def _app_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    payload = json.dumps(
        {"seed": seed, "api": api_catalog, "trace": traceability},
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )
    return _functional_app_js_template().replace("__SIGED_PAYLOAD__", payload)


def _functional_app_js_template() -> str:
    return r"""
const SIGED = __SIGED_PAYLOAD__;

const store = {
  role: "Sin sesion",
  screen: "P-01",
  authSurface: "intranet",
  currentUser: null,
  loginError: "",
  backend: {checked:false, online:false, mode:"static-fallback"},
  query: "",
  selectedDoc: "DOC-2026-0001",
  selectedExpedient: "EXP-2026-014",
  users: SIGED.seed.demo.users,
  roles: SIGED.seed.demo.roles,
  documents: [
    {folio:"DOC-2026-0001", title:"Decreto alcaldicio", type:"Decreto", department:"Secretaria Municipal", status:"En revision", owner:"Ana Rojas", due:"2026-07-12"},
    {folio:"DOC-2026-0002", title:"Memo Direccion Obras", type:"Memo", department:"DOM", status:"Borrador", owner:"Luis Perez", due:"2026-07-15"},
    {folio:"DOC-2026-0003", title:"Respuesta OIRS", type:"Oficio", department:"OIRS", status:"Firmado", owner:"Carolina Soto", due:"2026-07-09"}
  ],
  expedients: [
    {code:"EXP-2026-014", subject:"Permiso obra menor", status:"Abierto", owner:"DOM", documents:["DOC-2026-0002"]},
    {code:"EXP-2026-021", subject:"Reclamo retiro de escombros", status:"En tramite", owner:"OIRS", documents:["DOC-2026-0003"]}
  ],
  correspondence: [
    {tracking:"COR-2026-0077", direction:"INBOUND", subject:"Ingreso solicitud JJVV", status:"Derivada", department:"DIDECO"},
    {tracking:"COR-2026-0081", direction:"OUTBOUND", subject:"Respuesta oficio regional", status:"Preparacion", department:"Alcaldia"}
  ],
  requests: [
    {tracking:"TR-2026-00044", subject:"Certificado de residencia", status:"Ingresada", channel:"Portal ciudadano"},
    {tracking:"TR-2026-00045", subject:"Permiso ocupacion BNUP", status:"En revision", channel:"Portal ciudadano"}
  ],
  oirs: [
    {tracking:"OIRS-2026-00112", category:"Consulta", subject:"Retiro de escombros", status:"Asignada", owner:"OIRS"},
    {tracking:"OIRS-2026-00118", category:"Reclamo", subject:"Alumbrado publico", status:"Nueva", owner:"SECPLA"}
  ],
  notifications: [
    {to:"Ana Rojas", text:"Revision pendiente DOC-2026-0001", status:"No leida"},
    {to:"Ciudadano", text:"Solicitud TR-2026-00044 recibida", status:"Enviada"}
  ],
  audit: [
    "Carga inicial desde especificaciones SIGED-Lampa",
    "Contrato API y modelo ER disponibles para implementacion"
  ]
};

const menu = [
  ["Intranet", [["P-05","Dashboard"],["P-12","Bandeja documental"],["P-13","Crear documento"],["P-19","Expedientes"],["P-21","Registrar correspondencia"],["P-22","Seguimiento correspondencia"],["P-28","Gestion OIRS"],["P-29","Reportes"],["P-30","Notificaciones"]]],
  ["Administracion", [["P-06","Usuarios"],["P-07","Roles y permisos"],["P-08","Departamentos"],["P-09","Tipos documentales"],["P-10","Tipos tramites"],["P-11","Entidades externas"]]],
  ["Portal ciudadano", [["P-23","Inicio portal"],["P-24","Catalogo tramites"],["P-25","Solicitar tramite"],["P-26","Mis solicitudes"],["P-27","Ingreso OIRS"],["P-02","Login ciudadano"]]],
  ["Flujo documental", [["P-14","Detalle documento"],["P-15","Versiones y anexos"],["P-16","Revision pendiente"],["P-17","Aprobaciones"],["P-18","Firma simulada"]]],
  ["Control", [["TRACE","Trazabilidad"],["API","API"],["DATA","Modelo ER"],["P-01","Login intranet"],["P-03","Recuperacion"],["P-04","Perfil"]]]
];

function screenMeta(code) {
  return SIGED.seed.screens.find(screen => screen.code === code) || {code, name: code, route:"/", module:""};
}

function currentTitle() {
  if (store.screen === "TRACE") return "Trazabilidad WEBFORGE";
  if (store.screen === "API") return "Contrato API REST";
  if (store.screen === "DATA") return "Modelo de datos";
  return screenMeta(store.screen).name;
}

function app() {
  const root = document.getElementById("app");
  if (!store.currentUser) {
    root.innerHTML = renderLoginShell();
    bind();
    return;
  }
  root.innerHTML = `
    <main class="layout">
      <aside class="sidebar">
        <div class="brand">${SIGED.seed.product}</div>
        <div class="subtle">Aplicacion municipal DEV</div>
        <div class="card" style="margin-top:12px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:white">
          <div class="subtle">Sesion actual</div>
          <b>${store.currentUser ? store.currentUser.full_name : "Sin iniciar"}</b>
          <div class="subtle">${store.currentUser ? `${roleName(store.currentUser.role)} / ${store.currentUser.department}` : "Elige portal o intranet"}</div>
          <div class="subtle">Backend: ${store.backend.online ? "conectado" : "modo estatico"}</div>
        </div>
        <nav class="nav">
          ${menu.map(([group, items]) => `
            <div class="nav-group">${group}</div>
            ${items.map(([code, label]) => `<button class="${store.screen === code ? "active" : ""}" data-screen="${code}">${label}</button>`).join("")}
          `).join("")}
        </nav>
      </aside>
      <section class="content">
        <div class="topbar">
          <div>
            <h1>${currentTitle()}</h1>
            <div class="subtle">${breadcrumb()}</div>
          </div>
          <div class="toolbar">
            <select data-role>
              ${["Sin sesion","Administrador","Funcionario municipal","Oficina de partes","Revisor o jefatura","Operador OIRS","Analista de reportes","Usuario ciudadano"].map(role => `<option ${store.role === role ? "selected" : ""}>${role}</option>`).join("")}
            </select>
            <input class="search" data-query placeholder="Buscar en la pantalla" value="${escapeHtml(store.query)}">
          </div>
        </div>
        ${renderScreen()}
      </section>
    </main>
  `;
  bind();
}

function breadcrumb() {
  const meta = screenMeta(store.screen);
  if (store.screen.length <= 4) return `${meta.code} / ${meta.route} / ${meta.module} / rol: ${store.role}`;
  return `Sandbox DEV / fuente SIGED / rol: ${store.role}`;
}

function bind() {
  document.querySelectorAll("[data-screen]").forEach(button => button.addEventListener("click", () => {
    store.screen = button.dataset.screen;
    app();
  }));
  document.querySelectorAll("[data-auth-tab]").forEach(button => button.addEventListener("click", () => {
    store.authSurface = button.dataset.authTab;
    store.loginError = "";
    app();
  }));
  const roleSelect = document.querySelector("[data-role]");
  if (roleSelect) roleSelect.addEventListener("change", event => {
    store.role = event.target.value;
    store.audit.unshift(`Cambio de rol simulado a ${store.role}`);
    app();
  });
  const queryInput = document.querySelector("[data-query]");
  if (queryInput) queryInput.addEventListener("input", event => {
    store.query = event.target.value;
    app();
  });
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", handleAction));
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const value = event.currentTarget.dataset.value;
  if (action === "login") {
    await login();
    app();
    return;
  }
  if (action === "select-doc") {
    store.selectedDoc = value;
    store.screen = "P-14";
  }
  if (action === "submit-review") updateDoc("En revision", "Documento enviado a revision");
  if (action === "approve-review") updateDoc("Revisado", "Revision aprobada con observaciones registradas");
  if (action === "request-approval") updateDoc("En aprobacion", "Flujo de visto bueno iniciado");
  if (action === "sign-doc") updateDoc("Firmado", "Firma simulada registrada");
  if (action === "create-doc") createDocument();
  if (action === "create-correspondence") createCorrespondence();
  if (action === "create-request") createRequest();
  if (action === "create-oirs") createOirs();
  if (action === "logout") logout();
  app();
}

async function login() {
  const surface = store.authSurface || valueOf("auth-surface") || "intranet";
  const username = valueOf("login-user") || usersBySurface(surface)[0]?.username;
  let user = store.users.find(item => item.username === username) || usersBySurface(surface)[0];
  store.loginError = "";
  if (location.protocol !== "file:") {
    try {
      const endpoint = surface === "portal" ? "/api/v1/auth/citizen-login" : "/api/v1/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({surface, username, password: valueOf("login-pass") || "demo123"})
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.data?.user) {
        store.loginError = result.message || "No fue posible iniciar sesion.";
        return;
      }
      user = result.data.user;
    } catch (error) {
      store.loginError = "No hay conexion con el backend de autenticacion.";
      return;
    }
  }
  store.currentUser = user;
  store.authSurface = surface;
  store.role = roleName(user.role);
  store.audit.unshift(`Inicio de sesion ${surface}: ${user.username} (${user.role})`);
  store.screen = surface === "portal" ? "P-23" : "P-05";
}

function logout() {
  store.audit.unshift(`Cierre de sesion: ${store.currentUser?.username || "sin sesion"}`);
  store.currentUser = null;
  store.role = "Sin sesion";
  store.screen = "P-01";
}

function updateDoc(status, message) {
  const doc = activeDoc();
  doc.status = status;
  store.audit.unshift(`${message}: ${doc.folio}`);
}

function createDocument() {
  const folio = `DOC-2026-${String(store.documents.length + 1).padStart(4, "0")}`;
  store.documents.unshift({folio, title:valueOf("doc-title") || "Nuevo documento municipal", type:valueOf("doc-type") || "Oficio", department:valueOf("doc-department") || "Secretaria Municipal", status:"Borrador", owner:store.role, due:valueOf("doc-due") || "2026-07-20"});
  store.selectedDoc = folio;
  store.audit.unshift(`Documento creado: ${folio}`);
  store.screen = "P-14";
}

function createCorrespondence() {
  const tracking = `COR-2026-${String(store.correspondence.length + 82).padStart(4, "0")}`;
  store.correspondence.unshift({tracking, direction:valueOf("cor-direction") || "INBOUND", subject:valueOf("cor-subject") || "Nueva correspondencia", status:"Registrada", department:valueOf("cor-department") || "Oficina de Partes"});
  store.audit.unshift(`Correspondencia registrada: ${tracking}`);
  store.screen = "P-22";
}

function createRequest() {
  const tracking = `TR-2026-${String(store.requests.length + 46).padStart(5, "0")}`;
  store.requests.unshift({tracking, subject:valueOf("req-subject") || "Solicitud ciudadana", status:"Ingresada", channel:"Portal ciudadano"});
  store.audit.unshift(`Tramite ciudadano ingresado: ${tracking}`);
  store.screen = "P-26";
}

function createOirs() {
  const tracking = `OIRS-2026-${String(store.oirs.length + 119).padStart(5, "0")}`;
  store.oirs.unshift({tracking, category:valueOf("oirs-category") || "Consulta", subject:valueOf("oirs-subject") || "Caso OIRS", status:"Nueva", owner:"OIRS"});
  store.audit.unshift(`Caso OIRS ingresado: ${tracking}`);
  store.screen = store.role === "Ciudadano" ? "P-23" : "P-28";
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim();
}

function renderScreen() {
  if (store.screen === "TRACE") return renderTrace();
  if (store.screen === "API") return renderApi();
  if (store.screen === "DATA") return renderDataModel();
  if (["P-01","P-02","P-03","P-04"].includes(store.screen)) return renderAccount();
  if (store.screen === "P-05") return renderDashboard();
  if (["P-06","P-07","P-08","P-09","P-10","P-11"].includes(store.screen)) return renderAdmin();
  if (store.screen === "P-12") return renderDocuments();
  if (store.screen === "P-13") return renderCreateDocument();
  if (["P-14","P-15","P-16","P-17","P-18"].includes(store.screen)) return renderDocumentFlow();
  if (store.screen === "P-19" || store.screen === "P-20") return renderExpedients();
  if (store.screen === "P-21") return renderCorrespondenceForm();
  if (store.screen === "P-22") return renderCorrespondence();
  if (["P-23","P-24"].includes(store.screen)) return renderPortal();
  if (store.screen === "P-25") return renderRequestForm();
  if (store.screen === "P-26") return renderCitizenRequests();
  if (store.screen === "P-27") return renderOirsForm();
  if (store.screen === "P-28") return renderOirsManagement();
  if (store.screen === "P-29") return renderReports();
  if (store.screen === "P-30") return renderNotifications();
  return renderDashboard();
}

function renderLoginShell() {
  const users = usersBySurface(store.authSurface);
  const endpoint = store.authSurface === "portal" ? "/api/v1/auth/citizen-login" : "/api/v1/auth/login";
  const title = store.authSurface === "portal" ? "Portal ciudadano" : "Intranet municipal";
  const hint = store.authSurface === "portal" ? "Ingresa para revisar tus solicitudes y casos OIRS." : "Ingresa para gestionar documentos, expedientes y correspondencia.";
  return `
    <main class="login-page">
      <section class="login-panel">
        <div class="login-brand">
          <div class="login-mark">SL</div>
          <div>
            <div class="brand">SIGED-Lampa</div>
            <div class="subtle">Municipalidad de Lampa</div>
          </div>
        </div>
        <div>
          <h1>Gestion documental y atencion ciudadana</h1>
          <p>Plataforma web para documentos, expedientes, correspondencia, OIRS y tramites ciudadanos.</p>
          <div class="login-status">
            <div><span>Documentos y expedientes</span><b>Intranet</b></div>
            <div><span>Tramites y OIRS</span><b>Portal</b></div>
            <div><span>Autenticacion</span><b>API backend</b></div>
          </div>
        </div>
      </section>
      <section class="login-form-wrap">
        <div class="login-card">
          <h2>${title}</h2>
          <div class="subtle">${hint}</div>
          <div class="login-tabs">
            <button class="${store.authSurface === "intranet" ? "active" : ""}" data-auth-tab="intranet">Intranet</button>
            <button class="${store.authSurface === "portal" ? "active" : ""}" data-auth-tab="portal">Ciudadano</button>
          </div>
          <div class="form-row">
            <label>Usuario</label>
            <select id="login-user">
              ${users.map(user => `<option value="${user.username}">${user.full_name} (${user.username})</option>`).join("")}
            </select>
          </div>
          <div class="form-row" style="margin-top:12px">
            <label>Clave</label>
            <input id="login-pass" type="password" value="demo123" autocomplete="current-password">
          </div>
          <button class="btn primary" style="width:100%;margin-top:16px" data-action="login">Entrar</button>
          <span class="login-error">${escapeHtml(store.loginError)}</span>
          <div class="login-help">Acceso demo conectado a ${endpoint}.</div>
        </div>
      </section>
    </main>
  `;
}

function renderDashboard() {
  const kpis = [
    ["Documentos activos", store.documents.length, "M03"],
    ["Revisiones pendientes", store.documents.filter(d => d.status === "En revision").length, "M04"],
    ["Expedientes abiertos", store.expedients.length, "M05"],
    ["Casos ciudadanos", store.requests.length + store.oirs.length, "M07/M08"]
  ];
  return `
    <section class="grid">${kpis.map(k => `<div class="card kpi"><span class="subtle">${k[2]}</span><strong>${k[1]}</strong><span>${k[0]}</span></div>`).join("")}</section>
    <section class="bands">
      <div class="card">
        <h2>Trabajo municipal</h2>
        ${table(["Folio","Titulo","Estado","Accion"], store.documents.map(d => [d.folio, d.title, status(d.status), `<button class="btn" data-action="select-doc" data-value="${d.folio}">Abrir</button>`]))}
      </div>
      <div class="card">
        <h2>Flujos criticos</h2>
        <div class="trace">${SIGED.seed.critical_flows.map(flow => `<div><b>${flow.name}</b><div class="flow">${flow.screens.map(code => `<span>${code}</span>`).join("")}</div></div>`).join("")}</div>
      </div>
    </section>
    <section class="card" style="margin-top:14px"><h2>Auditoria reciente</h2>${timeline(store.audit)}</section>
  `;
}

function renderAdmin() {
  const moduleCode = screenMeta(store.screen).module || "M02";
  if (store.screen === "P-06") {
    return panel("Gestion de usuarios", table(["Usuario","Nombre","Correo","Rol","Superficie","Unidad"], store.users.map(user => [user.username, user.full_name, user.email, roleName(user.role), user.surface === "portal" ? "Usuario normal" : "Intranet", user.department])), `<button class="btn primary">Crear usuario</button>`);
  }
  if (store.screen === "P-07") {
    return panel("Roles y permisos", table(["Codigo","Rol","Superficie"], store.roles.map(role => [role.code, role.name, role.surface === "portal" ? "Usuario normal" : "Intranet"])), `<button class="btn primary">Asignar permisos</button>`);
  }
  const rows = SIGED.seed.er_tables.filter(t => ["users","roles","departments","document_types","procedure_types","external_entities"].includes(t.name));
  return `
    <section class="split">
      <div class="card">
        <h2>Administracion ${moduleCode}</h2>
        ${table(["Entidad","Proposito","Campos"], rows.map(t => [t.name, t.purpose, t.key_fields]))}
      </div>
      <div class="card">
        <h2>Formulario operativo</h2>
        ${formRows([["Nombre","Nombre catalogo"],["Codigo","COD-001"],["Estado","Activo"]])}
        <div class="actions" style="margin-top:12px"><button class="btn primary">Guardar simulacion</button><button class="btn">Auditar cambio</button></div>
      </div>
    </section>
  `;
}

function renderDocuments() {
  const rows = filtered(store.documents, d => [d.folio,d.title,d.status,d.department]).map(d => [d.folio, d.title, d.type, d.department, status(d.status), `<button class="btn" data-action="select-doc" data-value="${d.folio}">Abrir</button>`]);
  return panel("Bandeja documental", table(["Folio","Titulo","Tipo","Departamento","Estado",""], rows), `<button class="btn primary" data-screen="P-13">Nuevo documento</button>`);
}

function renderCreateDocument() {
  return `
    <section class="card">
      <h2>Crear documento institucional</h2>
      <div class="form-grid">
        ${input("doc-title","Titulo","Oficio a entidad externa")}
        ${input("doc-type","Tipo documental","Oficio")}
        ${input("doc-department","Departamento","Secretaria Municipal")}
        ${input("doc-due","Fecha limite","2026-07-20")}
      </div>
      <div class="actions" style="margin-top:12px"><button class="btn primary" data-action="create-doc">Guardar borrador</button><button class="btn green" data-action="submit-review">Enviar a revision</button></div>
    </section>
  `;
}

function renderDocumentFlow() {
  const doc = activeDoc();
  return `
    <section class="bands">
      <div class="card">
        <h2>${doc.folio} ${doc.title}</h2>
        ${table(["Campo","Valor"], [["Tipo",doc.type],["Departamento",doc.department],["Responsable",doc.owner],["Estado",status(doc.status)],["Vencimiento",doc.due]])}
        <div class="actions" style="margin-top:12px">
          <button class="btn green" data-action="approve-review">Responder revision</button>
          <button class="btn primary" data-action="request-approval">Solicitar visto bueno</button>
          <button class="btn warn" data-action="sign-doc">Firmar simulado</button>
        </div>
      </div>
      <div class="card">
        <h2>Timeline y trazabilidad</h2>
        ${timeline([`Creacion de borrador ${doc.folio}`, `Revision por jefatura`, `Estado actual: ${doc.status}`, ...store.audit.slice(0,4)])}
      </div>
    </section>
    <section class="card" style="margin-top:14px"><h2>Versiones, anexos y endpoints</h2>${table(["Pantalla","Endpoint dominante"], [["P-15 Versiones y anexos","API-019 / API-020"],["P-16 Revision pendiente","API-022"],["P-17 Aprobaciones","API-023"],["P-18 Firma simulada","API-024"]])}</section>
  `;
}

function renderExpedients() {
  return `
    <section class="bands">
      <div class="card"><h2>Bandeja de expedientes</h2>${table(["Codigo","Materia","Estado","Responsable"], store.expedients.map(e => [e.code,e.subject,status(e.status),e.owner]))}</div>
      <div class="card"><h2>Detalle expediente</h2>${timeline(["Apertura expediente", "Documento vinculado", "Evento de auditoria", "Revision de responsable"])}</div>
    </section>
  `;
}

function renderCorrespondenceForm() {
  return `<section class="card"><h2>Registro de correspondencia</h2><div class="form-grid">${input("cor-subject","Materia","Ingreso de solicitud vecinal")}${input("cor-department","Derivar a","DIDECO")}<div class="form-row"><label>Direccion</label><select id="cor-direction"><option>INBOUND</option><option>OUTBOUND</option></select></div></div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="create-correspondence">Registrar y derivar</button></div></section>`;
}

function renderCorrespondence() {
  return panel("Seguimiento de correspondencia", table(["Tracking","Direccion","Materia","Estado","Departamento"], store.correspondence.map(c => [c.tracking,c.direction,c.subject,status(c.status),c.department])));
}

function renderPortal() {
  const procedures = SIGED.seed.modules.filter(m => ["M07","M08"].includes(m.code));
  return `
    <section class="hero">
      <h1>Municipalidad de Lampa</h1>
      <p>Portal ciudadano para tramites, solicitudes y OIRS integrado con SIGED-Lampa.</p>
      <div class="actions"><button class="btn primary" data-screen="P-24">Ver tramites</button><button class="btn" data-screen="P-27">Ingresar OIRS</button></div>
    </section>
    <section class="grid">${procedures.map(p => `<div class="card"><h2>${p.name}</h2><p>${p.objective}</p><button class="btn" data-screen="${p.code === "M07" ? "P-25" : "P-27"}">Iniciar</button></div>`).join("")}</section>
  `;
}

function renderRequestForm() {
  return `<section class="card"><h2>Formulario de tramite ciudadano</h2><div class="form-grid">${input("req-subject","Tramite","Certificado de residencia")}${input("req-name","Solicitante","Vecino Lampa")}</div><div class="form-row" style="margin-top:12px"><label>Observacion</label><textarea id="req-note">Solicitud ingresada desde portal ciudadano.</textarea></div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="create-request">Enviar solicitud</button></div></section>`;
}

function renderCitizenRequests() {
  return panel("Mis solicitudes", table(["Tracking","Materia","Estado","Canal"], store.requests.map(r => [r.tracking,r.subject,status(r.status),r.channel])));
}

function renderOirsForm() {
  return `<section class="card"><h2>Ingreso OIRS</h2><div class="form-grid">${input("oirs-subject","Materia","Consulta retiro de escombros")}<div class="form-row"><label>Categoria</label><select id="oirs-category"><option>Consulta</option><option>Reclamo</option><option>Sugerencia</option><option>Felicitacion</option></select></div></div><div class="form-row" style="margin-top:12px"><label>Descripcion</label><textarea>Detalle del caso ciudadano.</textarea></div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="create-oirs">Enviar OIRS</button></div></section>`;
}

function renderOirsManagement() {
  return panel("Gestion OIRS", table(["Tracking","Categoria","Materia","Estado","Responsable"], store.oirs.map(o => [o.tracking,o.category,o.subject,status(o.status),o.owner])));
}

function renderReports() {
  return `
    <section class="grid">${SIGED.seed.demo.kpis.map(k => `<div class="card kpi"><span class="subtle">${k.trend}</span><strong>${k.value}</strong><span>${k.label}</span></div>`).join("")}</section>
    <section class="card"><h2>Indicadores por modulo</h2>${table(["Modulo","Pantallas","Endpoints"], SIGED.trace.module_trace.map(t => [t.module, t.screens.length, t.endpoints.length]))}</section>
  `;
}

function renderNotifications() {
  return panel("Bandeja de notificaciones", table(["Destinatario","Mensaje","Estado"], store.notifications.map(n => [n.to,n.text,status(n.status)])));
}

function renderAccount() {
  return `<section class="card"><h2>Sesion y perfil</h2>${table(["Campo","Valor"], [["Nombre",store.currentUser.full_name],["Usuario",store.currentUser.username],["Correo",store.currentUser.email],["Rol",roleName(store.currentUser.role)],["Superficie",store.currentUser.surface === "portal" ? "Usuario normal" : "Intranet"],["Unidad",store.currentUser.department]])}<div class="actions" style="margin-top:12px"><button class="btn" data-action="logout">Cerrar sesion</button></div></section>`;
}

function renderApi() {
  const rows = filtered(SIGED.api.endpoints, e => [e.code,e.method,e.path,e.auth,e.module,e.resource]).map(e => [e.code, `<span class="pill green">${e.method}</span>`, e.path, e.auth, e.module, e.resource]);
  return panel("Endpoints implementables", table(["Codigo","Metodo","Endpoint","Auth","Modulo","Recurso"], rows));
}

function renderDataModel() {
  const rows = filtered(SIGED.seed.er_tables, t => [t.name,t.purpose,t.pk,t.fks,t.key_fields]).map(t => [t.name,t.purpose,t.pk,t.fks,t.key_fields]);
  return panel("Diccionario ER", table(["Tabla","Proposito","PK","FKs","Campos clave"], rows));
}

function renderTrace() {
  return `
    <section class="card"><h2>Fuentes autorizadas</h2>${table(["Fuente","Lineas","Hash"], SIGED.trace.source_docs.map(s => [s.name,s.lines,s.sha256]))}</section>
    <section class="card" style="margin-top:14px"><h2>Matriz modulo-pantalla-endpoint</h2>${table(["Modulo","Nombre","Pantallas","Endpoints"], SIGED.trace.module_trace.map(t => [t.module,t.name,t.screens.join(" "),t.endpoints.join(" ")]))}</section>
  `;
}

function activeDoc() {
  return store.documents.find(d => d.folio === store.selectedDoc) || store.documents[0];
}

function usersBySurface(surface) {
  return store.users.filter(user => user.surface === surface);
}

function roleName(code) {
  return store.roles.find(role => role.code === code)?.name || code;
}

function filtered(items, reader) {
  const query = store.query.toLowerCase();
  if (!query) return items;
  return items.filter(item => reader(item).join(" ").toLowerCase().includes(query));
}

function input(id, label, value) {
  return `<div class="form-row"><label for="${id}">${label}</label><input id="${id}" value="${escapeHtml(value)}"></div>`;
}

function formRows(rows) {
  return `<div class="form-grid">${rows.map(row => input(row[0].toLowerCase().replaceAll(" ","-"), row[0], row[1])).join("")}</div>`;
}

function panel(title, content, extra = "") {
  return `<section class="card"><div class="topbar" style="margin-bottom:10px"><h2>${title}</h2><div class="actions">${extra}</div></div>${content}</section>`;
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function timeline(items) {
  return `<div class="timeline">${items.map(item => `<div>${item}</div>`).join("")}</div>`;
}

function status(value) {
  const text = String(value);
  const cls = text.includes("Firmado") || text.includes("Revisado") || text.includes("Enviada") ? "green" : text.includes("revision") || text.includes("Asignada") || text.includes("Derivada") ? "amber" : text.includes("Nueva") || text.includes("Borrador") ? "blue" : "";
  return `<span class="pill ${cls}">${text}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-screen]");
  if (!button) return;
  store.screen = button.dataset.screen;
  app();
});

app();
syncBackend();

async function syncBackend() {
  if (location.protocol === "file:") {
    store.backend.checked = true;
    return;
  }
  try {
    const response = await fetch("/api/v1/bootstrap");
    const result = await response.json();
    if (!result.ok) return;
    const runtime = result.data.runtime;
    store.backend = {checked:true, online:true, mode:"api"};
    store.users = runtime.users || store.users;
    store.roles = runtime.roles || store.roles;
    store.documents = runtime.documents || store.documents;
    store.expedients = runtime.expedients || store.expedients;
    store.correspondence = runtime.correspondence || store.correspondence;
    store.requests = runtime.requests || store.requests;
    store.oirs = runtime.oirs || store.oirs;
    store.audit = runtime.audit || store.audit;
    app();
  } catch (error) {
    store.backend = {checked:true, online:false, mode:"static-fallback"};
  }
}
""".strip()


def _schema_sql(profile: dict[str, Any]) -> str:
    lines = [
        "-- SIGED-Lampa schema sketch generated from Modelo_ER_Detallado_SIGED_Lampa.md",
        "-- This is an implementation scaffold, not a production migration.",
        "",
    ]
    specialized_tables = {"users", "roles", "user_roles"}
    for table in profile["er_tables"]:
        if table["name"] in specialized_tables:
            continue
        lines.extend(
            [
                f"CREATE TABLE IF NOT EXISTS {table['name']} (",
                "  id BIGSERIAL PRIMARY KEY,",
                "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),",
                "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
                ");",
                "",
            ]
        )
    lines.extend(
        [
            "CREATE TABLE IF NOT EXISTS roles (",
            "  id BIGSERIAL PRIMARY KEY,",
            "  code TEXT NOT NULL UNIQUE,",
            "  name TEXT NOT NULL,",
            "  surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')),",
            "  description TEXT,",
            "  is_system BOOLEAN NOT NULL DEFAULT TRUE,",
            "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),",
            "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
            ");",
            "",
            "CREATE TABLE IF NOT EXISTS users (",
            "  id BIGSERIAL PRIMARY KEY,",
            "  username TEXT NOT NULL UNIQUE,",
            "  email TEXT NOT NULL UNIQUE,",
            "  full_name TEXT NOT NULL,",
            "  password_hash TEXT NOT NULL,",
            "  role_code TEXT NOT NULL REFERENCES roles(code),",
            "  surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')),",
            "  department TEXT NOT NULL,",
            "  status TEXT NOT NULL DEFAULT 'ACTIVE',",
            "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),",
            "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
            ");",
            "",
            "CREATE TABLE IF NOT EXISTS user_roles (",
            "  id BIGSERIAL PRIMARY KEY,",
            "  username TEXT NOT NULL REFERENCES users(username),",
            "  role_code TEXT NOT NULL REFERENCES roles(code),",
            "  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),",
            "  UNIQUE(username, role_code)",
            ");",
            "",
            "-- Demo users for local/dev environments. Replace password_hash before production.",
            "INSERT INTO roles (code, name, surface, description) VALUES",
            "  ('ADMIN', 'Administrador', 'intranet', 'Acceso completo a administracion municipal'),",
            "  ('FUNC', 'Funcionario municipal', 'intranet', 'Operacion documental interna'),",
            "  ('OF_PARTES', 'Oficina de partes', 'intranet', 'Registro y derivacion de correspondencia'),",
            "  ('REVISOR', 'Revisor o jefatura', 'intranet', 'Revision, visto bueno y aprobaciones'),",
            "  ('OIRS', 'Operador OIRS', 'intranet', 'Gestion de casos OIRS'),",
            "  ('REPORTES', 'Analista de reportes', 'intranet', 'Reportabilidad y seguimiento'),",
            "  ('CIUDADANO', 'Usuario ciudadano', 'portal', 'Acceso normal al portal ciudadano')",
            "ON CONFLICT (code) DO NOTHING;",
            "",
            "INSERT INTO users (username, email, full_name, password_hash, role_code, surface, department) VALUES",
            "  ('admin.lampa', 'admin@lampa.cl', 'Marcela Torres', 'demo_hash_replace_before_prod', 'ADMIN', 'intranet', 'Administracion Municipal'),",
            "  ('funcionario.dom', 'lperez@lampa.cl', 'Luis Perez', 'demo_hash_replace_before_prod', 'FUNC', 'intranet', 'Direccion de Obras'),",
            "  ('partes', 'partes@lampa.cl', 'Ana Rojas', 'demo_hash_replace_before_prod', 'OF_PARTES', 'intranet', 'Oficina de Partes'),",
            "  ('revisor.secmun', 'rsilva@lampa.cl', 'Roberto Silva', 'demo_hash_replace_before_prod', 'REVISOR', 'intranet', 'Secretaria Municipal'),",
            "  ('oirs.operador', 'csoto@lampa.cl', 'Carolina Soto', 'demo_hash_replace_before_prod', 'OIRS', 'intranet', 'OIRS'),",
            "  ('vecino.demo', 'vecino@correo.cl', 'Vecino Demo', 'demo_hash_replace_before_prod', 'CIUDADANO', 'portal', 'Portal ciudadano')",
            "ON CONFLICT (username) DO NOTHING;",
            "",
            "INSERT INTO user_roles (username, role_code)",
            "SELECT username, role_code FROM users",
            "ON CONFLICT (username, role_code) DO NOTHING;",
            "",
        ]
    )
    return "\n".join(lines)


def _implementation_plan(profile: dict[str, Any]) -> str:
    lines = [
        "# SIGED-Lampa implementation plan",
        "",
        "## Incremento DEV materializado",
        "",
        "- Prototipo full-stack ejecutable con `npm start`.",
        "- Backend API sin dependencias externas en `backend/server.js`.",
        "- Frontend web en `frontend/` servido por el backend.",
        "- Copia estatica compatible en `app/` para revision rapida por archivo.",
        "- Catalogos de modulos, pantallas, endpoints y tablas derivados de fuentes autorizadas.",
        "- Datos semilla y matriz de trazabilidad en `data/` y `app/data/`.",
        "- Backlog y tareas derivadas en `tasks/product-backlog.json` y `tasks/implementation-tasks.md`.",
        "- Verificador local en `scripts/verify_siged_bundle.py`.",
        "- Preparacion de despliegue con `.env.example` y `Dockerfile`.",
        "",
        "## Siguientes incrementos",
        "",
        "1. Sustituir modo memoria por PostgreSQL usando `DATABASE_URL`.",
        "2. Agregar hashing real de passwords, JWT firmado y RBAC por endpoint.",
        "3. Separar frontend en framework productivo si el proyecto lo requiere.",
        "4. Agregar pruebas E2E por flujo antes de promover DEV a QA.",
        "5. Preparar despliegue EC2 con Nginx, PM2 o Docker Compose.",
        "",
        "## Cobertura",
        "",
    ]
    for key, value in profile["counts"].items():
        lines.append(f"- {key}: {value}")
    return "\n".join(lines)


def _verify_script() -> str:
    return """
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(name: str) -> dict:
    return json.loads((ROOT / "app" / "data" / name).read_text(encoding="utf-8"))


def main() -> int:
    seed = load("seed.json")
    api = load("api-catalog.json")
    trace = load("traceability.json")
    checks = {
        "backend/server.js": (ROOT / "backend" / "server.js").exists(),
        "frontend/index.html": (ROOT / "frontend" / "index.html").exists(),
        "frontend/assets/app.js": (ROOT / "frontend" / "assets" / "app.js").exists(),
        "sources_present": (ROOT / "sources").exists() and any((ROOT / "sources").glob("*.md")),
        "tasks/product-backlog.json": (ROOT / "tasks" / "product-backlog.json").exists(),
        "tasks/implementation-tasks.md": (ROOT / "tasks" / "implementation-tasks.md").exists(),
        "package_start_backend": "node backend/server.js" in (ROOT / "package.json").read_text(encoding="utf-8"),
        "db_schema_users": "CREATE TABLE IF NOT EXISTS users" in (ROOT / "db" / "schema.sql").read_text(encoding="utf-8"),
        "modules>=10": len(seed["modules"]) >= 10,
        "screens>=30": len(seed["screens"]) >= 30,
        "endpoints>=40": len(api["endpoints"]) >= 40,
        "er_tables>=40": len(seed["er_tables"]) >= 40,
        "source_docs>=4": len(trace["source_docs"]) >= 4,
    }
    failed = [name for name, passed in checks.items() if not passed]
    print(json.dumps({"status": "pass" if not failed else "error", "checks": checks}, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
""".strip()


# Final SIGED real-app bindings. Keep these definitions at EOF so they are the
# imported public template functions used by the factory.


def _package_json() -> str:
    return json.dumps(
        {
            "name": "siged-lampa",
            "version": "0.2.0",
            "private": True,
            "type": "commonjs",
            "scripts": {
                "start": "node backend/server.js",
                "dev": "node backend/server.js",
                "verify": "python scripts/verify_siged_bundle.py",
                "check:backend": "node --check backend/server.js && node --check backend/src/server.js",
                "check:frontend": "node --check frontend/assets/app.js",
            },
            "dependencies": {},
            "engines": {"node": ">=18"},
        },
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )


def _env_example() -> str:
    return "\n".join(
        [
            "NODE_ENV=development",
            "PORT=4173",
            "SIGED_DATA_MODE=memory",
            "DATABASE_URL=postgres://siged@postgres:5432/siged_lampa",
            "AUTH_SIGNING_KEY=replace-before-production",
        ]
    )


def _dockerfile() -> str:
    return "\n".join(
        [
            "FROM node:20-slim",
            "WORKDIR /app",
            "COPY package.json ./",
            "COPY backend ./backend",
            "COPY frontend ./frontend",
            "COPY data ./data",
            "COPY db ./db",
            "ENV NODE_ENV=production",
            "ENV PORT=4173",
            "EXPOSE 4173",
            "CMD [\"node\", \"backend/server.js\"]",
        ]
    )


def _backend_server_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    return "require(\"./src/server\");\n"


def _app_js(seed: dict[str, Any], api_catalog: dict[str, Any], traceability: dict[str, Any]) -> str:
    return _frontend_src_app_js(seed, api_catalog, traceability)


def _styles_css() -> str:
    return r"""
:root{color-scheme:light;--ink:#172026;--muted:#5f6f7a;--line:#d9e1e6;--bg:#f4f7f8;--panel:#fff;--nav:#14313d;--blue:#1f6fb2;--green:#24745d;--amber:#a96800;--red:#b93a3a}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink)}button,input,select{font:inherit}button{cursor:pointer}.muted{color:var(--muted)}
.login-page{min-height:100vh;display:grid;grid-template-columns:minmax(360px,.9fr) minmax(420px,1.1fr)}.login-side{background:var(--nav);color:#fff;padding:44px;display:flex;flex-direction:column;justify-content:space-between}.mark{width:44px;height:44px;border-radius:8px;display:grid;place-items:center;background:#e8f3f2;color:var(--nav);font-weight:800}.login-side h1{font-size:36px;line-height:1.08;margin:24px 0 12px;letter-spacing:0;max-width:560px}.login-side p{color:#c7d7de;line-height:1.55;max-width:560px}.source-list{display:grid;gap:10px;margin-top:28px;max-width:620px}.source-list div{border-top:1px solid rgba(255,255,255,.16);padding-top:10px;display:flex;justify-content:space-between;gap:16px}.login-main{display:grid;place-items:center;padding:36px}.login-card{width:min(440px,100%);background:#fff;border:1px solid var(--line);border-radius:8px;padding:26px;box-shadow:0 18px 48px rgba(20,49,61,.14)}.login-card h2{font-size:22px;margin:0 0 4px;letter-spacing:0}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.tabs button,.btn{border:1px solid var(--line);background:#fff;border-radius:6px;padding:10px 12px;color:var(--ink)}.tabs button.active{border-color:var(--blue);background:#e8f1fa;color:var(--blue)}.field{display:grid;gap:6px;margin:12px 0}.field label{font-size:13px;font-weight:650;color:#2f424d}.field input,.field select{min-height:42px;border:1px solid var(--line);border-radius:6px;padding:9px 11px;background:#fff;width:100%}.btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}.btn.green{background:var(--green);border-color:var(--green);color:#fff}.btn.full{width:100%;margin-top:6px}.error{min-height:20px;color:var(--red);font-size:13px;margin-top:8px}.hint{border-top:1px solid var(--line);margin-top:16px;padding-top:14px;font-size:13px;color:var(--muted);line-height:1.45}
.shell{min-height:100vh;display:grid;grid-template-columns:276px 1fr}.sidebar{background:var(--nav);color:#f8fbfd;padding:18px 14px}.brand{font-size:21px;font-weight:780;margin:8px 0 2px;letter-spacing:0}.nav{display:grid;gap:6px;margin-top:20px}.nav button{text-align:left;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:9px 10px}.nav button.active{background:#e8f3f2;color:#14313d;border-color:#e8f3f2}.main{padding:24px;max-width:1440px;width:100%}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}h1{margin:0 0 6px;font-size:28px;letter-spacing:0}h2{margin:0 0 12px;font-size:18px;letter-spacing:0}.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.grid{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:12px;margin-bottom:14px}.split{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;align-items:start}.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px}.kpi strong{display:block;font-size:28px;margin:4px 0}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px;background:#fff}table{width:100%;border-collapse:collapse;min-width:720px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:#eef3f5;color:#30434d;font-size:13px}tr:last-child td{border-bottom:0}.pill{display:inline-flex;border-radius:999px;background:#eef3f5;padding:3px 8px;font-size:12px;white-space:nowrap}.pill.green{background:#e4f2ed;color:var(--green)}.pill.blue{background:#e8f1fa;color:var(--blue)}.pill.amber{background:#fff2dd;color:var(--amber)}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px}.trace{display:grid;gap:12px}.trace-line{border-left:3px solid var(--blue);padding:6px 0 6px 10px}
@media(max-width:900px){.login-page,.shell,.split,.grid,.form-grid{grid-template-columns:1fr}.login-side{padding:28px}.login-main,.main{padding:20px}.topbar{display:grid}}
""".strip()


def _schema_sql(profile: dict[str, Any]) -> str:
    lines = [
        "-- SIGED-Lampa initial schema generated from authorized SIGED markdown sources.",
        "",
        "CREATE TABLE IF NOT EXISTS roles (code TEXT PRIMARY KEY, name TEXT NOT NULL, surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')), created_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, password_hash TEXT NOT NULL, role_code TEXT NOT NULL REFERENCES roles(code), surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')), department TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS documents (id BIGSERIAL PRIMARY KEY, folio TEXT NOT NULL UNIQUE, title TEXT NOT NULL, type TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL, owner_username TEXT REFERENCES users(username), due_date DATE, created_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS expedients (id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, status TEXT NOT NULL, owner_department TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS citizen_requests (id BIGSERIAL PRIMARY KEY, tracking TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, status TEXT NOT NULL, channel TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS audit_events (id BIGSERIAL PRIMARY KEY, actor_username TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());",
        "",
    ]
    for table in profile["er_tables"]:
        name = table["name"]
        if name not in {"roles", "users", "documents", "expedients", "citizen_requests", "audit_events"}:
            lines.append(f"CREATE TABLE IF NOT EXISTS {name} (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());")
    return "\n".join(lines + ["", _seed_sql()])


def _implementation_plan(profile: dict[str, Any]) -> str:
    lines = [
        "# SIGED-Lampa implementation plan",
        "",
        "- Backend Node HTTP modular en `backend/src/server.js` con `POST /api/v1/auth/login`.",
        "- Frontend SPA en `frontend/` con login como primera pantalla y consumo real de API.",
        "- Migracion y seed en `db/migrations/001_initial.sql` y `db/seeds/001_demo.sql`.",
        "- Preparacion EC2 mediante `Dockerfile`, `docker-compose.yml` y `.env.example`.",
        "- Backlog, fuentes y trazabilidad quedan en `tasks/`, `sources/` y `data/`.",
        "",
        "## Pendiente antes de produccion",
        "",
        "1. Hashing real de passwords, JWT firmado y RBAC por endpoint.",
        "2. Persistencia PostgreSQL usando `DATABASE_URL`.",
        "3. Pruebas E2E por flujo critico antes de pasar DEV a QA.",
        "",
        "## Cobertura derivada",
        "",
    ]
    lines.extend(f"- {key}: {value}" for key, value in profile["counts"].items())
    return "\n".join(lines)


def _verify_script() -> str:
    return r"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> int:
    seed = read_json("data/seed.json")
    api = read_json("data/api-catalog.json")
    trace = read_json("data/traceability.json")
    portal_nav = seed.get("navigation", {}).get("portal", [])
    intranet_nav = seed.get("navigation", {}).get("intranet", [])
    portal_ids = {item.get("id") for item in portal_nav}
    portal_labels = {item.get("label") for item in portal_nav}
    checks = {
        "backend_entry": (ROOT / "backend" / "server.js").exists(),
        "backend_src": (ROOT / "backend" / "src" / "server.js").exists(),
        "frontend_entry": (ROOT / "frontend" / "index.html").exists(),
        "frontend_app": (ROOT / "frontend" / "assets" / "app.js").exists(),
        "frontend_src": (ROOT / "frontend" / "src" / "app.js").exists(),
        "login_endpoint": "/api/v1/auth/login" in (ROOT / "backend" / "src" / "server.js").read_text(encoding="utf-8"),
        "docker_compose": (ROOT / "docker-compose.yml").exists(),
        "migration": (ROOT / "db" / "migrations" / "001_initial.sql").exists(),
        "seed_sql": (ROOT / "db" / "seeds" / "001_demo.sql").exists(),
        "sources_present": (ROOT / "sources").exists() and any((ROOT / "sources").glob("*.md")),
        "backlog_present": (ROOT / "tasks" / "product-backlog.json").exists(),
        "navigation_contract": bool(portal_nav) and bool(intranet_nav),
        "access_policy_contract": "access_policy" in seed and "surfaces" in seed["access_policy"],
        "portal_blocks_internal_view_ids": not (portal_ids & {"documents", "expedients", "users", "trace", "dashboard"}),
        "portal_blocks_internal_labels": not (portal_labels & {"Documentos", "Expedientes", "Usuarios y roles", "Trazabilidad"}),
        "modules>=10": len(seed["modules"]) >= 10,
        "screens>=30": len(seed["screens"]) >= 30,
        "endpoints>=40": len(api["endpoints"]) >= 40,
        "er_tables>=40": len(seed["er_tables"]) >= 40,
        "source_docs>=4": len(trace["source_docs"]) >= 4,
    }
    failed = [name for name, ok in checks.items() if not ok]
    print(json.dumps({"status": "pass" if not failed else "error", "failed": failed, "checks": checks}, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
""".strip()
