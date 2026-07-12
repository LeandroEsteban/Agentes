const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const backend = path.join(root, 'backend');
const catalog = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'spec', 'endpoints.json'), 'utf8'));

const definitions = [
  [[1, 5], 'auth', 'modules/auth', 'public'],
  [[6, 10], 'users', 'modules/users', 'internal'],
  [[11, 12], 'departments', 'modules/departments', 'internal'],
  [[13, 14], 'procedures', 'modules/procedures', 'internal'],
  [[15, 20], 'documents', 'modules/documents', 'internal'],
  [[21, 22], 'document-reviews', 'modules/document-reviews', 'internal'],
  [[23, 23], 'document-approvals', 'modules/document-approvals', 'internal'],
  [[24, 24], 'document-signatures', 'modules/document-signatures', 'internal'],
  [[25, 28], 'expedients', 'modules/expedients', 'internal'],
  [[29, 32], 'correspondence', 'modules/correspondence', 'internal'],
  [[33, 33], 'procedures', 'modules/procedures', 'public'],
  [[34, 36], 'citizen-requests', 'modules/citizen-requests', 'citizen'],
  [[37, 38], 'oirs', 'modules/oirs', 'public'],
  [[39, 39], 'reports', 'modules/reports', 'internal'],
  [[40, 40], 'notifications', 'modules/notifications', 'citizen'],
];

const findDefinition = (code) => definitions.find((item) => Number(code.slice(4)) >= item[0][0] && Number(code.slice(4)) <= item[0][1]);
const permissions = (code) => {
  const value = Number(code.slice(4));
  if (value >= 6 && value <= 10) return ['admin.access'];
  if (value >= 11 && value <= 12) return ['departments.view'];
  if (value >= 13 && value <= 14) return ['documents.view'];
  if (value >= 15 && value <= 20) return ['documents.view'];
  if (value >= 21 && value <= 23) return ['documents.review'];
  if (value === 24) return ['documents.sign'];
  if (value >= 25 && value <= 28) return ['expedients.view'];
  if (value >= 29 && value <= 32) return ['correspondence.view'];
  if (value === 38) return ['oirs.respond'];
  if (value === 39) return ['reports.view'];
  return [];
};

const items = catalog.items.map((item) => {
  const [range, module, directory, authentication] = findDefinition(item.code);
  const validator = fs.existsSync(path.join(root, 'backend', 'src', directory, 'validators.js')) ? `${directory}/validators.js` : `${directory}/validator.js`;
  return {
    endpoint_code: item.code,
    method: item.relations.method,
    path: item.relations.path,
    classification: 'original',
    module,
    router: `${directory}/router.js`,
    controller: `${directory}/controller.js`,
    validator,
    service: `${directory}/service.js`,
    repository: `${directory}/repository.js`,
    authentication,
    permissions: permissions(item.code),
    ownership_check: ['API-034', 'API-035', 'API-036', 'API-037', 'API-040'].includes(item.code) ? 'service-enforced' : '',
    audit_action: ['POST', 'PUT', 'PATCH'].includes(item.method) ? 'implemented' : '',
    status: 'partial',
    missing_components: ['endpoint-specific PostgreSQL smoke test', 'complete OpenAPI operation schema and router verification'],
  };
});

const supplemental = [
  'POST /api/v1/auth/internal-login', 'POST /api/v1/auth/logout', 'GET /api/v1/admin/procedure-types',
  'POST /api/v1/admin/procedure-types', 'PUT /api/v1/admin/procedure-types/{id}',
  'GET /api/v1/admin/public-content/{kind}', 'POST /api/v1/admin/public-content/{kind}',
  'PATCH /api/v1/admin/public-content/{kind}/{id}', 'PATCH /api/v1/notifications/{id}/read',
];
const technical = ['GET /health', 'GET /health/database'];
const byModule = Object.fromEntries([...new Set(items.map((item) => item.module))].map((module) => [module, {
  implemented: 0,
  partial: items.filter((item) => item.module === module).length,
  missing: 0,
}]));
const summary = {
  normalized_original: items.length,
  supplemental: supplemental.length,
  legacy: 1,
  technical: technical.length,
  implemented: 0,
  partial: items.length,
  missing: 0,
  by_module: byModule,
  supplemental_routes: supplemental,
  technical_routes: technical,
  missing_endpoints: [],
};

fs.writeFileSync(path.join(backend, 'endpoint-implementation-status.json'), JSON.stringify(items, null, 2) + '\n');
fs.writeFileSync(path.join(backend, 'openapi-router-map.json'), JSON.stringify(items, null, 2) + '\n');
fs.writeFileSync(path.join(backend, 'endpoint-implementation-summary.json'), JSON.stringify(summary, null, 2) + '\n');

const phaseReportDir = path.resolve(root, '..', '..', '..', '..', 'runs', 'phase5a');
if (fs.existsSync(phaseReportDir)) {
  fs.writeFileSync(path.join(phaseReportDir, 'endpoint-implementation-status.json'), JSON.stringify(items, null, 2) + '\n');
  fs.writeFileSync(path.join(phaseReportDir, 'endpoint-implementation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
