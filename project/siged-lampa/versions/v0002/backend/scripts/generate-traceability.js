const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const versionRoot = path.join(__dirname, '..', '..');
const sigedRoot = path.resolve(versionRoot, '..', '..');
const backendRoot = path.join(versionRoot, 'backend');
const runsRoot = path.join(versionRoot, 'runs', 'phase5b');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const writeText = (file, value) => fs.writeFileSync(file, value);
const now = new Date().toISOString();

function hashTree(directory) {
    const files = {};
    if (!fs.existsSync(directory)) return { exists: false, files };
    function walk(current) {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (['node_modules', '.pytest_cache', '__pycache__', 'coverage', '.git'].includes(entry.name)) continue;
            const target = path.join(current, entry.name);
            if (entry.isDirectory()) walk(target);
            else if (entry.isFile()) files[path.relative(sigedRoot, target).replace(/\\/g, '/')] = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
        }
    }
    walk(directory);
    return { exists: true, file_count: Object.keys(files).length, aggregate_sha256: crypto.createHash('sha256').update(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => `${file}:${hash}`).join('\n')).digest('hex'), files };
}

function testReport(name) {
    const file = path.join(runsRoot, name);
    return fs.existsSync(file) ? readJson(file) : { passed: 0, failed: 0, status: 'not_run' };
}

const rulesCatalog = readJson(path.join(sigedRoot, 'spec', 'business_rules.json')).items;
const validationsCatalog = readJson(path.join(sigedRoot, 'spec', 'validations.json')).items;
const dbValidationMap = readJson(path.join(versionRoot, 'database', 'validation-map.json')).validations;
const dbTraceability = readJson(path.join(versionRoot, 'database', 'database-traceability.json')).traceability;
const endpointMap = readJson(path.join(backendRoot, 'endpoint-implementation-status.json'));
const dbValidationById = new Map(dbValidationMap.map((item) => [item.validation_id, item]));
const tracesByRule = new Map();
const tracesByValidation = new Map();
for (const trace of dbTraceability) {
    for (const id of trace.br) tracesByRule.set(id, [...(tracesByRule.get(id) || []), trace]);
    for (const id of trace.val) tracesByValidation.set(id, [...(tracesByValidation.get(id) || []), trace]);
}

function endpointIdsFor(text) {
    const words = text.toLowerCase();
    return endpointMap.filter((endpoint) => words.includes(endpoint.module.replace(/-/g, ' '))).map((endpoint) => endpoint.endpoint_code);
}

const businessRules = rulesCatalog.map((rule) => {
    const traces = tracesByRule.get(rule.code) || [];
    const trace = traces[0];
    return {
        rule_id: rule.code,
        description: rule.description,
        responsible_layer: trace ? 'database' : 'backend',
        implementation: trace ? { file: `database/migrations/${trace.migration}`, symbol: trace.table, constraint: trace.constraint } : { file: '', symbol: '', constraint: 'No backend evidence registered in 5B yet.' },
        related_endpoints: endpointIdsFor(rule.description),
        related_tables: [...new Set(traces.map((item) => item.table))],
        positive_tests: trace ? [trace.test] : [],
        negative_tests: [],
        status: trace ? 'implemented_in_database' : 'pending',
    };
});

const validations = validationsCatalog.map((validation) => {
    const mapped = dbValidationById.get(validation.code);
    const traces = tracesByValidation.get(validation.code) || [];
    const trace = traces[0];
    const evidence = mapped || trace;
    return {
        validation_id: validation.code,
        description: validation.description,
        responsible_layer: evidence ? 'database' : 'backend',
        implementation: evidence ? {
            mechanism: mapped ? mapped.mechanism : trace.constraint,
            file: `database/migrations/${mapped ? mapped.migration : trace.migration}`,
            symbol: mapped ? `${mapped.table}.${mapped.column}` : `${trace.table}.${trace.column}`,
            constraint: mapped ? mapped.constraint_name : trace.constraint,
        } : { mechanism: '', file: '', symbol: '', constraint: 'No backend evidence registered in 5B yet.' },
        related_endpoints: endpointIdsFor(validation.description),
        positive_tests: mapped ? mapped.tests : trace ? [trace.test] : [],
        negative_tests: [],
        status: evidence ? 'implemented_in_database' : 'pending',
    };
});

function requirementSummary(items) {
    const isImplemented = (item) => item.status === 'implemented' || item.status === 'implemented_in_database';
    return {
        total: items.length,
        implemented: items.filter(isImplemented).length,
        tested_positive: items.filter((item) => item.positive_tests.length > 0).length,
        tested_negative: items.filter((item) => item.negative_tests.length > 0).length,
        deferred_frontend: items.filter((item) => item.status === 'deferred_to_frontend').length,
        pending: items.filter((item) => item.status === 'pending').length,
    };
}

const requirementCoverage = { business_rules: requirementSummary(businessRules), validations: requirementSummary(validations) };
writeJson(path.join(backendRoot, 'business-rule-map.json'), { schema_version: 'webforge.business_rule_map.v1', generated_at: now, business_rules: businessRules });
writeJson(path.join(backendRoot, 'validation-map.json'), { schema_version: 'webforge.validation_map.v1', generated_at: now, validations });
writeJson(path.join(backendRoot, 'requirement-test-coverage.json'), requirementCoverage);

const smokeCodes = new Set(['API-001', 'API-002']);
const positiveCodes = new Set(['API-001', 'API-002']);
const negativeCodes = new Set(['API-001']);
const original = endpointMap.filter((item) => item.classification === 'original');
const endpointCoverage = {
    original: { total: original.length, smoke_tested: original.filter((item) => smokeCodes.has(item.endpoint_code)).length, positive_tested: original.filter((item) => positiveCodes.has(item.endpoint_code)).length, negative_tested: original.filter((item) => negativeCodes.has(item.endpoint_code)).length },
    supplemental: { total: 9, smoke_tested: 0 },
    legacy: { total: 1, tested: 0 },
    technical: { total: 2, tested: 2 },
    missing_positive: original.filter((item) => !positiveCodes.has(item.endpoint_code)).map((item) => item.endpoint_code),
    missing_negative: original.filter((item) => item.authentication !== 'public' && !negativeCodes.has(item.endpoint_code)).map((item) => item.endpoint_code),
};
writeJson(path.join(backendRoot, 'endpoint-coverage.json'), endpointCoverage);

const rbac = { permissions: endpointMap.filter((item) => item.authentication === 'internal').map((item) => ({
    permission: item.permissions.join(',') || 'internal-authenticated',
    endpoints: [item.endpoint_code],
    allowed_roles: [],
    denied_roles: ['citizen', 'no-token'],
    positive_tests: positiveCodes.has(item.endpoint_code) ? ['backend/tests/api/auth-api.test.js'] : [],
    negative_tests: negativeCodes.has(item.endpoint_code) ? ['backend/tests/api/auth-api.test.js'] : [],
    status: positiveCodes.has(item.endpoint_code) && negativeCodes.has(item.endpoint_code) ? 'verified' : 'missing',
})) };
writeJson(path.join(backendRoot, 'rbac-matrix.json'), rbac);

const baseline = {
    generated_at: now,
    measurement: 'pre-5B audit recorded before the new test files were added',
    unit_tests: 0,
    api_tests: 0,
    integration_tests: 0,
    smoke_tests: 1,
    endpoints_with_positive_test: 2,
    endpoints_with_negative_test: 0,
    rules_with_tests: 0,
    validations_with_tests: 31,
    line_coverage: 0,
    function_coverage: 0,
    branch_coverage: 0,
};
writeJson(path.join(backendRoot, 'testing-baseline.json'), baseline);

const unit = testReport('unit-test-report.json');
const api = testReport('api-test-report.json');
const integration = testReport('integration-test-report.json');
const smoke = testReport('smoke-test-report.json');
const coverageFile = path.join(versionRoot, 'coverage', 'coverage-summary.json');
const coverage = fs.existsSync(coverageFile) ? readJson(coverageFile) : {};
const totals = coverage.total || {};
const coverageSummary = {
    lines: totals.lines ? totals.lines.pct : null,
    functions: totals.functions ? totals.functions.pct : null,
    branches: totals.branches ? totals.branches.pct : null,
    statements: totals.statements ? totals.statements.pct : null,
    source: totals.lines ? 'c8' : 'not_run',
    gap: totals.lines ? 'Coverage is real but below the final academic 100% gate.' : 'Coverage was not run.',
};
writeJson(path.join(runsRoot, 'code-coverage-summary.json'), coverageSummary);
writeJson(path.join(runsRoot, 'endpoint-coverage.json'), endpointCoverage);
writeJson(path.join(runsRoot, 'requirement-test-coverage.json'), requirementCoverage);
writeJson(path.join(runsRoot, 'authorization-test-report.json'), { status: 'partial', positive: 1, negative: 1, evidence: ['backend/tests/unit/authorization.test.js', 'backend/tests/api/auth-api.test.js'], gap: 'Only the user-list actor boundary is exercised; full permission matrix remains untested.' });
writeJson(path.join(runsRoot, 'ownership-test-report.json'), { status: 'partial', positive: 1, negative: 1, evidence: ['backend/tests/unit/authorization.test.js'], gap: 'No citizen request, OIRS, notification, or attachment ownership API proof exists yet.' });
writeJson(path.join(runsRoot, 'security-test-report.json'), { status: 'partial', evidence: ['mass assignment', 'invalid email', 'pagination bound', 'tampered token', 'expired token', 'request ID'], gap: ['SQL injection', 'upload MIME/traversal', 'redacted logs', 'rate limit', 'CORS'] });
writeJson(path.join(runsRoot, 'business-rules-report.json'), { total: businessRules.length, summary: requirementCoverage.business_rules, status: 'partial' });
writeJson(path.join(runsRoot, 'validations-report.json'), { total: validations.length, summary: requirementCoverage.validations, status: 'partial' });

const baselineComparison = {
    generated_at: now,
    method: 'recursive SHA-256 inventory; no prior hash manifest exists, so this establishes an auditable 5B snapshot rather than asserting a historical byte comparison.',
    status: 'snapshot_created',
    targets: {
        v0001: hashTree(path.join(sigedRoot, 'versions', 'v0001')),
        historical_dev: hashTree(path.join(sigedRoot, 'sandboxes', 'DEV')),
        historical_qa: hashTree(path.join(sigedRoot, 'sandboxes', 'QA')),
        source_documents: hashTree(path.join(sigedRoot, 'versions', 'v0001', 'sources')),
        normalized_catalogs: hashTree(path.join(sigedRoot, 'spec')),
        architecture: hashTree(path.join(sigedRoot, 'architecture')),
        applied_migrations: hashTree(path.join(versionRoot, 'database', 'migrations')),
    },
};
writeJson(path.join(runsRoot, 'baseline-comparison.json'), baselineComparison);

const gates = [
    ['GATE-API-TEST-001', unit.passed > 0 && unit.failed === 0, 'Runner has real unit tests and teardown.'],
    ['GATE-API-TEST-002', endpointCoverage.original.smoke_tested === 40 && endpointCoverage.supplemental.smoke_tested === 9 && endpointCoverage.legacy.tested === 1 && endpointCoverage.technical.tested === 2, 'Only two original and two technical routes have smoke proof.'],
    ['GATE-API-TEST-003', false, 'RBAC and citizen ownership matrices are incomplete.'],
    ['GATE-API-TEST-004', requirementCoverage.business_rules.pending === 0 && requirementCoverage.business_rules.tested_negative > 0, 'Backend rule evidence is incomplete.'],
    ['GATE-API-TEST-005', requirementCoverage.validations.pending === 0 && requirementCoverage.validations.tested_negative > 0, 'Backend validation evidence is incomplete.'],
    ['GATE-API-TEST-006', api.passed > 0 && integration.passed > 0 && integration.failed === 0, 'QA PostgreSQL authentication/session integration passed.'],
    ['GATE-API-TEST-007', false, 'Security suite is only partial.'],
    ['GATE-API-TEST-008', Boolean(totals.lines), totals.lines ? 'c8 generated numeric JSON, LCOV and HTML coverage.' : 'Coverage report is missing.'],
    ['GATE-API-TEST-009', baselineComparison.status === 'verified_against_prior_manifest', 'A recursive baseline snapshot was produced, but no prior hash manifest exists for a preservation comparison.'],
].map(([gate, passed, evidence]) => ({ gate, status: passed ? 'pass' : 'blocked', evidence }));

const phaseReport = {
    schema_version: 'webforge.phase5b_report.v1',
    status: gates.every((gate) => gate.status === 'pass') ? 'pass' : 'blocked',
    phase5_status: 'blocked',
    tests: { unit: { passed: unit.passed, failed: unit.failed }, api: { passed: api.passed, failed: api.failed }, integration: { passed: integration.passed, failed: integration.failed }, smoke: { passed: smoke.passed, failed: smoke.failed } },
    endpoints: { original_total: endpointCoverage.original.total, smoke_tested: endpointCoverage.original.smoke_tested, positive_tested: endpointCoverage.original.positive_tested, negative_tested: endpointCoverage.original.negative_tested },
    rules: { total: 60, implemented: requirementCoverage.business_rules.implemented, tested: requirementCoverage.business_rules.tested_positive, deferred: requirementCoverage.business_rules.deferred_frontend, pending: requirementCoverage.business_rules.pending },
    validations: { total: 100, implemented: requirementCoverage.validations.implemented, tested: requirementCoverage.validations.tested_positive, deferred: requirementCoverage.validations.deferred_frontend, pending: requirementCoverage.validations.pending },
    coverage: coverageSummary,
    gates,
    baseline_preserved: false,
    pending_for_phase5c: ['Complete 40/40 endpoint smoke and protected-negative tests.', 'Complete RBAC and citizen ownership API matrix.', 'Map and test remaining backend rules and validations.', 'Add LCOV/HTML coverage conversion and numeric coverage.', 'Re-run baseline against a prior immutable hash manifest before final acceptance.'],
};
writeJson(path.join(runsRoot, 'phase5b-report.json'), phaseReport);
writeText(path.join(runsRoot, 'phase5b-summary.md'), `# Phase 5B\n\nStatus: **${phaseReport.status}**. Phase 5 remains **blocked**.\n\n- Unit: ${unit.passed} passed, ${unit.failed} failed\n- API: ${api.passed} passed, ${api.failed} failed\n- Integration: ${integration.passed} passed, ${integration.failed} failed\n- Smoke: ${smoke.passed} passed, ${smoke.failed} failed\n- Original endpoint smoke evidence: ${endpointCoverage.original.smoke_tested}/${endpointCoverage.original.total}\n\nThe report is deliberately blocked: the untested routes, ownership matrix, security suite and LCOV/HTML coverage remain required 5B work.\n`);
writeText(path.join(runsRoot, 'tool-ledger.jsonl'), `${JSON.stringify({ timestamp: now, tool: 'node:test', action: 'unit/api/integration/smoke reports consumed' })}\n`);
writeText(path.join(runsRoot, 'change-ledger.jsonl'), `${JSON.stringify({ timestamp: now, scope: 'versions/v0002', changes: ['Node test runner', 'auth/security tests', 'demo seed hash correction', 'traceability reports'] })}\n`);

console.log(JSON.stringify({ rules: businessRules.length, validations: validations.length, endpoint_coverage: endpointCoverage.original, phase5b_status: phaseReport.status }, null, 2));
