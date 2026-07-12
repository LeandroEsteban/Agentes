const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const versionRoot = path.join(__dirname, '..', '..');
const sigedRoot = path.resolve(versionRoot, '..', '..');
const backendRoot = path.join(versionRoot, 'backend');
const outputRoot = path.join(versionRoot, 'runs', 'phase5b2a');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const now = new Date().toISOString();
fs.mkdirSync(outputRoot, { recursive: true });

const targetModules = new Set(['auth', 'users', 'departments', 'procedures', 'citizen-requests', 'oirs', 'notifications']);
const endpoints = read(path.join(backendRoot, 'endpoint-implementation-status.json')).filter((endpoint) => targetModules.has(endpoint.module));
const verificationPlan = read(path.join(backendRoot, 'phase5b2a-verification-plan.json')).items;
const endpointStatus = read(path.join(backendRoot, 'endpoint-implementation-status.json'));
for (const item of verificationPlan) {
    const current = endpointStatus.find((endpoint) => endpoint.endpoint_code === item.endpoint_code);
    if (current && item.status === 'verified') { current.status = 'implemented'; current.missing_components = []; }
}
write(path.join(backendRoot, 'endpoint-implementation-status.json'), endpointStatus);
const rules = read(path.join(sigedRoot, 'spec', 'business_rules.json')).items;
const validations = read(path.join(sigedRoot, 'spec', 'validations.json')).items;
const businessMap = read(path.join(backendRoot, 'business-rule-map.json')).business_rules;
const validationMap = read(path.join(backendRoot, 'validation-map.json')).validations;
const coverage = read(path.join(versionRoot, 'coverage', 'coverage-summary.json')).total;
const phase5b = read(path.join(versionRoot, 'runs', 'phase5b', 'phase5b-report.json'));
const targetSections = /M01|M02|M07|M08/;
const ruleIds = new Set(rules.filter((item) => targetSections.test(item.source.section)).map((item) => item.code));
const validationIds = new Set(validations.filter((item) => targetSections.test(item.source.section)).map((item) => item.code));
const scopedRules = businessMap.filter((item) => ruleIds.has(item.rule_id));
const scopedValidations = validationMap.filter((item) => validationIds.has(item.validation_id));
const scope = verificationPlan.map((item) => ({ ...item, current_status: item.status === 'verified' ? 'implemented' : 'partial', target_status: 'verified' }));
write(path.join(backendRoot, 'phase5b2a-endpoints.json'), { generated_at: now, scope, excluded_reason: 'Only the 21 original catalog endpoints are coded scope; supplemental administration routes have separate API evidence.' });
write(path.join(backendRoot, 'endpoint-implementation-summary.json'), { generated_at: now, scope: 'phase5b2a', total: scope.length, implemented: scope.filter((item) => item.current_status === 'implemented').length, partial: scope.filter((item) => item.current_status === 'partial').length });
write(path.join(backendRoot, 'endpoint-coverage.json'), { generated_at: now, scope: scope.map((item) => ({ endpoint_code: item.endpoint_code, positive_test: item.positive_test, negative_tests: item.negative_tests, status: item.current_status })) });

const tested = scope.filter((item) => item.positive_test);
const negative = scope.filter((item) => item.negative_tests.length);
const requirementSummary = (items) => ({ total: items.length, tested: items.filter((item) => item.positive_tests.length && item.negative_tests.length).length, pending: items.filter((item) => item.status === 'pending' || !item.negative_tests.length).length });
const baseline = {
    historical_baseline_status: 'unverifiable',
    current_reference_baseline_created: true,
    unexpected_changes_since_current_reference: false,
    reason: 'No existe manifiesto histórico o copia anterior disponible',
    reference_snapshot: {
        generated_at: now,
        phase5b_baseline_report_sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(versionRoot, 'runs', 'phase5b', 'baseline-comparison.json'))).digest('hex'),
    },
};
write(path.join(outputRoot, 'baseline-comparison.json'), baseline);
const gates = [
    { gate: 'GATE-5B2A-001', status: scope.filter((item) => ['API-001', 'API-002'].includes(item.endpoint_code)).every((item) => item.positive_test && item.negative_tests.length) ? 'pass' : 'blocked', evidence: 'Citizen authentication has no endpoint-specific negative test.' },
    { gate: 'GATE-5B2A-002', status: scope.filter((item) => item.module === 'users' || item.module === 'departments').every((item) => item.positive_test && item.negative_tests.length) ? 'pass' : 'blocked', evidence: 'Administrative RBAC routes lack complete evidence.' },
    { gate: 'GATE-5B2A-003', status: scope.filter((item) => ['citizen-requests', 'oirs', 'notifications'].includes(item.module)).every((item) => item.positive_test && item.negative_tests.length) ? 'pass' : 'blocked', evidence: 'Citizen ownership routes have no API evidence.' },
    { gate: 'GATE-5B2A-004', status: phase5b.tests.api.passed > 0 && phase5b.tests.integration.passed > 0 ? 'pass' : 'blocked', evidence: 'Current API and integration evidence uses QA PostgreSQL.' },
    { gate: 'GATE-5B2A-005', status: scope.every((item) => item.positive_test && (item.path.includes('/public/') || item.negative_tests.length)) ? 'pass' : 'blocked', evidence: 'Only two target endpoints have positive evidence.' },
    { gate: 'GATE-5B2A-006', status: scopedRules.every((item) => item.positive_tests.length && item.negative_tests.length) && scopedValidations.every((item) => item.positive_tests.length && item.negative_tests.length) ? 'pass' : 'blocked', evidence: 'Scope rules and validations lack negative test evidence.' },
    { gate: 'GATE-5B2A-007', status: 'blocked', evidence: 'Security cases for all target modules are not implemented.' },
    { gate: 'GATE-5B2A-008', status: 'pass_with_limitation', evidence: baseline.reason },
];
const report = {
    status: gates.every((gate) => gate.status === 'pass') ? 'pass' : 'blocked',
    phase5b_status: 'blocked',
    phase5_status: 'blocked',
    scope_endpoints: { total: scope.length, implemented: scope.filter((item) => item.current_status === 'implemented').length, partial: scope.filter((item) => item.current_status === 'partial').length, smoke_tested: tested.length, negative_tested: negative.length },
    authentication: { internal: 'partial', citizen: 'partial', sessions: 'partial' },
    rbac: { verified_permissions: 0, partial_permissions: new Set(endpoints.filter((item) => item.authentication === 'internal').flatMap((item) => item.permissions)).size },
    ownership: { verified_resources: 0, partial_resources: 4 },
    rules_in_scope: requirementSummary(scopedRules),
    validations_in_scope: requirementSummary(scopedValidations),
    coverage: { lines: coverage.lines.pct, functions: coverage.functions.pct, branches: coverage.branches.pct, statements: coverage.statements.pct },
    gates,
    historical_baseline_status: baseline.historical_baseline_status,
};
write(path.join(outputRoot, 'phase5b2a-report.json'), report);
write(path.join(outputRoot, 'endpoint-test-report.json'), { status: 'partial', tested: tested.map((item) => item.endpoint_code), missing: scope.filter((item) => !item.positive_test).map((item) => item.endpoint_code) });
write(path.join(outputRoot, 'authentication-test-report.json'), { status: 'partial', internal: ['login', 'invalid password', 'profile', 'logout revocation'], citizen: ['login', 'internal endpoint blocked'], missing: ['inactive actors', 'citizen logout/profile endpoint-specific evidence'] });
write(path.join(outputRoot, 'rbac-test-report.json'), { status: 'missing', verified_permissions: [], gap: 'No target administrative permission has both positive and negative endpoint tests.' });
write(path.join(outputRoot, 'ownership-test-report.json'), { status: 'missing', resources: ['citizen requests', 'OIRS authenticated', 'OIRS anonymous', 'OIRS messages', 'notifications'] });
write(path.join(outputRoot, 'oirs-test-report.json'), { status: 'missing', reason: 'No OIRS API test exists.' });
write(path.join(outputRoot, 'notification-test-report.json'), { status: 'missing', reason: 'No notification API test exists.' });
write(path.join(outputRoot, 'security-test-report.json'), { status: 'partial', covered: ['tampered token', 'mass assignment', 'invalid email', 'pagination limit'], missing: ['SQL injection endpoint evidence', 'body limit', 'redacted logs', 'attachment traversal'] });
write(path.join(outputRoot, 'requirement-coverage.json'), { rules: requirementSummary(scopedRules), validations: requirementSummary(scopedValidations) });
write(path.join(outputRoot, 'code-coverage-summary.json'), report.coverage);
fs.writeFileSync(path.join(outputRoot, 'phase5b2a-summary.md'), `# Phase 5B.2A\n\nStatus: **${report.status}**. 5B and Phase 5 remain **blocked**.\n\nScope: ${scope.length} original catalog endpoints; ${tested.length} with positive evidence; ${negative.length} with negative evidence.\n`);
fs.writeFileSync(path.join(outputRoot, 'tool-ledger.jsonl'), `${JSON.stringify({ timestamp: now, tool: 'node', action: 'generated evidence-based 5B.2A report' })}\n`);
fs.writeFileSync(path.join(outputRoot, 'change-ledger.jsonl'), `${JSON.stringify({ timestamp: now, scope: '5B.2A', change: 'initial audited scope and blocker reports' })}\n`);
console.log(JSON.stringify(report, null, 2));
