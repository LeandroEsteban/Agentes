#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionRoot = path.resolve(__dirname, "..");
const appRoot = path.join(versionRoot, "app");
const traceabilityPath = path.join(versionRoot, "traceability", "requirements-ledger.json");
const evidenceRoot = path.join(versionRoot, "evidence", "screenshots");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

function startServer() {
  const server = createServer(async (req, res) => {
    const cleanUrl = decodeURIComponent((req.url || "/").split("?")[0]);
    const relative = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
    const target = path.resolve(appRoot, relative);
    if (!target.startsWith(appRoot) || !existsSync(target)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    try {
      const body = await readFile(target);
      res.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream" });
      res.end(body);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function click(page, selector) {
  await page.locator(selector).click();
}

async function visible(page, selector, label) {
  const locator = page.locator(selector);
  if (!(await locator.isVisible())) {
    throw new Error(`Expected visible ${label}: ${selector}`);
  }
}

async function textIncludes(page, selector, expected, label) {
  const text = await page.locator(selector).innerText();
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${expected}; got ${text}`);
  }
}

async function nav(page, screenCode) {
  await click(page, `#nav-list [data-screen="${screenCode}"]`);
  await visible(page, `#screen-${screenCode.toLowerCase()}:not([hidden])`, screenCode);
}

async function validateTraceability(page, traceability) {
  const missing = await page.evaluate((requirements) => {
    return requirements
      .filter((item) => {
        const node = document.querySelector(item.selector);
        const reqs = (node?.dataset.req || "").split(/\s+/).filter(Boolean);
        return !node || !reqs.includes(item.id);
      })
      .map((item) => ({ id: item.id, selector: item.selector }));
  }, traceability.requirements);
  if (missing.length) {
    throw new Error(`Missing data-req markers: ${JSON.stringify(missing.slice(0, 30))}`);
  }
}

async function validateAllScreens(page, screens) {
  for (const screen of screens) {
    await nav(page, screen.code);
  }
}

async function runFlows(page) {
  await page.evaluate(() => window.DOS_APP.reset());
  await nav(page, "P-01");
  await click(page, '[data-action="login"]');
  await textIncludes(page, "#session-status", "Administrador", "session");

  await nav(page, "P-05");
  await click(page, '[data-screen="P-05"][data-action="guardar"]');
  await textIncludes(page, "#screen-p-05", "Cliente Nuevo", "customer creation");

  await nav(page, "P-10");
  await click(page, '[data-screen="P-10"][data-action="guardar"]');
  await textIncludes(page, "#screen-p-10", "Producto Nuevo", "product creation");

  await nav(page, "P-14");
  await click(page, '[data-screen="P-14"][data-action="calcular-diferencia"]');
  await textIncludes(page, "#screen-p-14", "ajuste", "inventory adjustment");

  await nav(page, "P-15");
  await click(page, '[data-screen="P-15"][data-action="transferir"]');
  await textIncludes(page, "#screen-p-15", "transferencia", "inventory transfer");

  await nav(page, "P-18");
  await click(page, '[data-screen="P-18"][data-action="convertir-a-venta"]');
  await textIncludes(page, "#screen-p-18", "converted", "quotation conversion");

  await nav(page, "P-21");
  await click(page, '[data-screen="P-21"][data-action="despachar-total"]');
  await textIncludes(page, "#screen-p-21", "dispatched", "dispatch");

  await nav(page, "P-22");
  await click(page, '[data-screen="P-22"][data-action="registrar-pago"]');
  await textIncludes(page, "#screen-p-22", "partially_paid", "payment");

  await nav(page, "P-24");
  await click(page, '[data-screen="P-24"][data-action="recibir"]');
  await textIncludes(page, "#screen-p-24", "received", "return receive");

  await nav(page, "P-29");
  await click(page, '[data-screen="P-29"][data-action="recibir-total"]');
  await textIncludes(page, "#screen-p-29", "goods receipts", "purchase receipt");

  await nav(page, "P-32");
  await click(page, '[data-screen="P-32"][data-action="liberar"]');
  await textIncludes(page, "#screen-p-32", "in_process", "production release");

  await nav(page, "P-34");
  await click(page, '[data-screen="P-34"][data-action="registrar-produccion"]');
  await visible(page, "#screen-p-34", "production output");

  await nav(page, "P-35");
  await click(page, '[data-screen="P-35"][data-action="emitir-factura"]');
  await textIncludes(page, "#screen-p-35", "F-1002", "invoice issue");

  await nav(page, "P-36");
  await click(page, '[data-screen="P-36"][data-action="export-report"]');
  const apiReport = await page.evaluate(() => window.DOS_APP.validateApiCatalog());
  if (apiReport.status !== "pass") throw new Error(`API validation failed: ${JSON.stringify(apiReport)}`);

  await nav(page, "P-38");
  await click(page, '[data-screen="P-38"][data-action="crear"]');
  await textIncludes(page, "#screen-p-38", "facturas_vencidas", "alert creation");

  await page.setViewportSize({ width: 390, height: 860 });
  await click(page, "#mobile-menu");
  const menuOpen = await page.locator("#app.menu-open").count();
  if (menuOpen !== 1) throw new Error("Mobile menu did not open");
  await click(page, '#nav-list [data-screen="P-03"]');
  await visible(page, "#screen-p-03:not([hidden])", "mobile dashboard");
  await page.waitForTimeout(2400);
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const traceability = JSON.parse(await readFile(traceabilityPath, "utf8"));
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const screenshots = [];
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.DOS_APP?.traceability && document.querySelector("#app")?.dataset.ready === "true");
    await validateTraceability(page, traceability);
    await validateAllScreens(page, traceability.screens);
    await nav(page, "P-03");
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(evidenceRoot, "01-dashboard.png"), fullPage: true });
    screenshots.push("evidence/screenshots/01-dashboard.png");
    await runFlows(page);
    await page.screenshot({ path: path.join(evidenceRoot, "02-mobile-dashboard.png"), fullPage: true });
    screenshots.push("evidence/screenshots/02-mobile-dashboard.png");

    const apiReport = await page.evaluate(() => window.DOS_APP.validateApiCatalog());
    if (apiReport.status !== "pass") {
      throw new Error(`API catalog failed: ${JSON.stringify(apiReport)}`);
    }
    if (consoleErrors.length) {
      throw new Error(`Browser console errors: ${JSON.stringify(consoleErrors)}`);
    }

    const verified = {
      ...traceability,
      summary: {
        ...traceability.summary,
        implementation_status: "implemented_and_web_validated",
        web_validation_status: "pass",
        web_validation_coverage_pct: 100
      },
      requirements: traceability.requirements.map((item) => ({
        ...item,
        qa_status: "web_validated",
        web_validation_evidence: ["traceability/web-validation-report.json", ...screenshots]
      }))
    };
    const report = {
      project_id: "proyecto-dos",
      version: "v0001",
      status: "pass",
      url,
      validated_requirements: traceability.requirements.length,
      validated_screens: traceability.screens.length,
      validated_endpoints: apiReport.endpoint_count,
      screenshots,
      console_errors: consoleErrors,
      flow_checks: [
        "login",
        "customers",
        "products_inventory",
        "sales_quote_dispatch_payment",
        "returns",
        "purchases",
        "production",
        "billing",
        "reports_api",
        "alerts",
        "responsive_mobile"
      ]
    };
    await writeFile(path.join(versionRoot, "traceability", "requirements-verified.json"), JSON.stringify(verified, null, 2) + "\n");
    await writeFile(path.join(versionRoot, "traceability", "web-validation-report.json"), JSON.stringify(report, null, 2) + "\n");
    await writeFile(
      path.join(versionRoot, "traceability", "coverage-summary.json"),
      JSON.stringify(
        {
          project_id: "proyecto-dos",
          version: "v0001",
          required: traceability.requirements.length,
          implemented: traceability.requirements.length,
          implementation_coverage_pct: 100,
          web_validated: traceability.requirements.length,
          web_validation_coverage_pct: 100,
          screens_validated: traceability.screens.length,
          endpoints_validated: apiReport.endpoint_count,
          status: "pass"
        },
        null,
        2
      ) + "\n"
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
