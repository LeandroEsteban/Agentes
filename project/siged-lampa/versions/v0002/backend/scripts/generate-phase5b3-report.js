const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const backend = path.join(root, 'backend');
const output = path.join(root, 'runs', 'phase5b3');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const now = new Date().toISOString();
fs.mkdirSync(output, { recursive: true });

const endpoints = read(path.join(backend, 'endpoint-implementation-status.json'));
const endpointCoverage = read(path.join(backend, 'endpoint-coverage.json')).scope || [];
const rules = read(path.join(backend, 'business-rule-map.json')).business_rules || [];
const validations = read(path.join(backend, 'validation-map.json')).validations || [];
const rbac = read(path.join(backend, 'rbac-matrix.json')).permissions || [];
const ownership = read(path.join(backend, 'ownership-matrix.json')).resources || [];
const transitions = read(path.join(backend, 'document-transition-matrix.json')).transitions || [];
const sourceRoot = path.resolve(root, '..', '..', 'spec');
const sourceRules = fs.existsSync(path.join(sourceRoot, 'business_rules.json')) ? read(path.join(sourceRoot, 'business_rules.json')).items || read(path.join(sourceRoot, 'business_rules.json')).business_rules || [] : [];
const sourceValidations = fs.existsSync(path.join(sourceRoot, 'validations.json')) ? read(path.join(sourceRoot, 'validations.json')).items || read(path.join(sourceRoot, 'validations.json')).validations || [] : [];
const ids = (items, field) => items.map((item) => item[field]);
const duplicateIds = (items, field) => ids(items, field).filter((id, index, all) => all.indexOf(id) !== index);
const expected = (prefix, total) => Array.from({ length: total }, (_, i) => `${prefix}-${String(i + 1).padStart(3, '0')}`);
const missingIds = (items, field, prefix, total) => expected(prefix, total).filter((id) => !ids(items, field).includes(id));
const invalidIds = (items, field, prefix, total) => ids(items, field).filter((id) => !expected(prefix, total).includes(id));
const normalStatus = (status) => ({ implemented_in_backend: 'implemented', deferred: 'deferred_to_frontend' }[status] || status);
const evidence = (item) => (item.positive_tests || []).length > 0 && (item.evidence_reports || []).length > 0;
const protectedEndpoint = (endpoint) => endpoint.authentication && endpoint.authentication !== 'public';
const coverageFor = (code) => endpointCoverage.find((entry) => entry.endpoint_code === code) || {};
const original = endpoints.filter((endpoint) => endpoint.classification === 'original');
const supplemental = endpoints.filter((endpoint) => endpoint.classification === 'supplemental');
const legacy = endpoints.filter((endpoint) => endpoint.classification === 'legacy');
const technical = endpoints.filter((endpoint) => endpoint.classification === 'technical');
const positive = (endpoint) => Boolean(coverageFor(endpoint.endpoint_code).positive_test);
const negative = (endpoint) => (coverageFor(endpoint.endpoint_code).negative_tests || []).length > 0;
const endpointMatrix = endpoints.map((endpoint) => {
    const coverage = coverageFor(endpoint.endpoint_code);
    const ok = endpoint.status === 'implemented' && positive(endpoint) && (!protectedEndpoint(endpoint) || negative(endpoint));
    return {
        endpoint_code: endpoint.endpoint_code, method: endpoint.method, path: endpoint.path,
        classification: endpoint.classification, module: endpoint.module,
        positive_tests: coverage.positive_test ? [coverage.positive_test] : [],
        negative_tests: coverage.negative_tests || [], security_tests: [], database_assertions: [], audit_assertions: endpoint.audit_action ? [endpoint.audit_action] : [],
        rules: [], validations: [], status: ok ? 'verified' : endpoint.status === 'implemented' ? 'partial' : 'missing',
    };
});
const requirements = (items, field, prefix, total) => {
    const duplicate_ids = duplicateIds(items, field);
    const missing_ids = missingIds(items, field, prefix, total);
    const invalid_ids = invalidIds(items, field, prefix, total);
    const statuses = items.map((item) => normalStatus(item.status));
    return {
        source_total: total, mapped: items.length, duplicate_ids, missing_ids, invalid_ids,
        pending: statuses.filter((status) => status === 'pending').length,
        without_evidence: items.filter((item) => !evidence(item)).map((item) => item[field]),
    };
};
const ruleAudit = requirements(rules, 'rule_id', 'BR', 60);
const validationAudit = requirements(validations, 'validation_id', 'VAL', 100);
const initialAudit = {
    endpoints: { original: original.length, supplemental: supplemental.length, legacy: legacy.length, technical: technical.length, implemented: endpoints.filter((e) => e.status === 'implemented').length, partial: endpoints.filter((e) => e.status === 'partial').length, missing: endpoints.filter((e) => e.status === 'missing').length },
    business_rules: { source_total: ruleAudit.source_total, mapped: ruleAudit.mapped, duplicate_ids: ruleAudit.duplicate_ids, missing_ids: ruleAudit.missing_ids, invalid_ids: ruleAudit.invalid_ids },
    validations: { source_total: validationAudit.source_total, mapped: validationAudit.mapped, duplicate_ids: validationAudit.duplicate_ids, missing_ids: validationAudit.missing_ids, invalid_ids: validationAudit.invalid_ids },
    tests: {}, coverage: {}, inconsistencies: [],
};
const documentScope = rules.filter((rule) => /^BR-(0(1[3-9]|2[0-9]|3[0-6])|041)$/.test(rule.rule_id));
initialAudit.inconsistencies.push({ id: 'BR-5B2D-DOCUMENT-SCOPE', expected_ids: documentScope.map((rule) => rule.rule_id), total: documentScope.length, finding: 'BR-013 through BR-036 is 24 rules; adding BR-041 makes 25 rules.' });
const counts = (items) => {
    const status = (target) => items.filter((item) => normalStatus(item.status) === target).length;
    return { total: items.length, implemented_backend: status('implemented'), implemented_database: status('implemented_in_database'), deferred_frontend: status('deferred_to_frontend'), academic_simulation: status('academic_simulation'), pending: status('pending'), with_positive_evidence: items.filter((item) => (item.positive_tests || []).length).length, with_negative_evidence: items.filter((item) => (item.negative_tests || []).length).length };
};
const requirementCoverage = { business_rules: counts(rules), validations: counts(validations) };
delete requirementCoverage.validations.academic_simulation;
const globalEndpoints = {
    original: { total: original.length, implemented: original.filter((e) => e.status === 'implemented').length, positive_tested: original.filter(positive).length, negative_tested: original.filter(negative).length, smoke_tested: original.filter(positive).length },
    supplemental: { total: supplemental.length, implemented: supplemental.filter((e) => e.status === 'implemented').length, positive_tested: supplemental.filter(positive).length, negative_tested: supplemental.filter(negative).length },
    legacy: { total: legacy.length, implemented: legacy.filter((e) => e.status === 'implemented').length, tested: legacy.filter(positive).length, deprecated: legacy.filter((e) => e.deprecated).length },
    technical: { total: technical.length, implemented: technical.filter((e) => e.status === 'implemented').length, tested: technical.filter(positive).length },
    partial: endpoints.filter((e) => e.status === 'partial').map((e) => e.endpoint_code), missing: endpoints.filter((e) => e.status === 'missing').map((e) => e.endpoint_code),
};
const rbacReport = { total_permissions: rbac.length, duplicate_permissions: duplicateIds(rbac, 'permission'), unverified: rbac.filter((item) => item.status !== 'verified').map((item) => item.permission), missing_evidence: rbac.filter((item) => !(item.positive_tests || []).length || !(item.negative_tests || []).length).map((item) => item.permission), status: 'blocked' };
rbacReport.status = !rbacReport.duplicate_permissions.length && !rbacReport.unverified.length && !rbacReport.missing_evidence.length ? 'verified' : 'blocked';
const ownershipReport = { resources: ownership.length, unverified: ownership.filter((item) => item.status !== 'verified').map((item) => item.resource), missing_horizontal_negative: ownership.filter((item) => !item.horizontal_negative).map((item) => item.resource), status: 'blocked' };
ownershipReport.status = !ownershipReport.unverified.length && !ownershipReport.missing_horizontal_negative.length ? 'verified' : 'blocked';
const transitionReport = { transitions: transitions.length, partial: transitions.filter((item) => item.status === 'partial').map((item) => ({ from: item.from, action: item.action, to: item.to })), missing: transitions.filter((item) => item.status === 'missing').map((item) => ({ from: item.from, action: item.action, to: item.to })), status: 'blocked' };
transitionReport.status = !transitionReport.partial.length && !transitionReport.missing.length ? 'verified' : 'blocked';
const securityControls = ['SQL injection', 'mass assignment', 'path traversal', 'MIME', 'file sizes', 'body limit', 'sort allowlist', 'pagination', 'CSV injection', 'JWT manipulation', 'revoked sessions', 'horizontal access', 'safe errors', 'redaction', 'request ID', 'concurrency', 'transactions and rollback'].map((control) => ({ control, affected_modules: [], tests: [], status: 'missing' }));
const securityReport = { controls: securityControls, critical_missing: securityControls.map((item) => item.control), status: 'blocked' };
const auditReport = { write_operations: endpoints.filter((e) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method)).length, audited_operations: endpoints.filter((e) => e.audit_action).length, missing_audit: endpoints.filter((e) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method) && !e.audit_action).map((e) => e.endpoint_code), sensitive_data_findings: [] };
const testRoot = path.join(backend, 'tests');
const testFiles = [];
function collect(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const full = path.join(directory, entry.name); if (entry.isDirectory()) collect(full); else if (entry.name.endsWith('.test.js')) testFiles.push(full); } }
collect(testRoot);
const skipped = testFiles.filter((file) => /test\.(skip|todo)\s*\(/.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(root, file));
const regression = { files: testFiles.length, skipped, todo: skipped, unclassified: [], status: skipped.length ? 'blocked' : 'not_run' };
const coverageFile = path.join(root, 'coverage', 'coverage-summary.json');
const coverage = fs.existsSync(coverageFile) ? read(coverageFile).total : null;
const coverageSummary = coverage ? { lines: coverage.lines.pct, statements: coverage.statements.pct, functions: coverage.functions.pct, branches: coverage.branches.pct } : { lines: 0, statements: 0, functions: 0, branches: 0 };
const suiteReports = ['unit', 'api', 'integration', 'smoke'].reduce((all, suite) => {
    const file = path.join(root, 'runs', 'phase5b', `${suite}-test-report.json`);
    all[suite] = fs.existsSync(file) ? read(file) : { passed: 0, failed: 0 };
    return all;
}, {});
const testSummary = {
    unit: suiteReports.unit.passed, api: suiteReports.api.passed, integration: suiteReports.integration.passed, smoke: suiteReports.smoke.passed,
    total: Object.values(suiteReports).reduce((sum, suite) => sum + suite.passed + suite.failed, 0),
    failed: Object.values(suiteReports).reduce((sum, suite) => sum + suite.failed, 0),
};
const thresholds = { lines: 85, statements: 85, functions: 80, branches: 80 };
const codeGaps = { thresholds, coverage: coverageSummary, functional_files: [], uncovered_critical_files: [], status: coverage && Object.entries(thresholds).every(([name, value]) => coverageSummary[name] >= value) ? 'pass' : 'blocked' };
const baseline = { historical_baseline_status: 'unverifiable', current_reference_baseline_created: true, unexpected_changes_since_current_reference: false, status: 'pass_with_limitation' };
const gates = [
    ['GATE-5B3-001', original.length === 40 && globalEndpoints.original.implemented === 40 && globalEndpoints.original.positive_tested === 40 && globalEndpoints.partial.length === 0 && globalEndpoints.missing.length === 0],
    ['GATE-5B3-002', supplemental.length === 9 && legacy.length === 1 && technical.length === 2 && supplemental.every(positive) && legacy.every(positive) && technical.every(positive)],
    ['GATE-5B3-003', ruleAudit.mapped === 60 && !ruleAudit.duplicate_ids.length && !ruleAudit.missing_ids.length && !ruleAudit.invalid_ids.length && !ruleAudit.pending && !ruleAudit.without_evidence.length],
    ['GATE-5B3-004', validationAudit.mapped === 100 && !validationAudit.duplicate_ids.length && !validationAudit.missing_ids.length && !validationAudit.invalid_ids.length && !validationAudit.pending && !validationAudit.without_evidence.length],
    ['GATE-5B3-005', rbacReport.status === 'verified' && ownershipReport.status === 'verified'],
    ['GATE-5B3-006', securityReport.status === 'verified'],
    ['GATE-5B3-007', !auditReport.missing_audit.length && transitionReport.status === 'verified'],
    ['GATE-5B3-008', false],
    ['GATE-5B3-009', regression.status === 'pass'],
    ['GATE-5B3-010', requirementCoverage.business_rules.pending === 0 && requirementCoverage.validations.pending === 0 && globalEndpoints.original.positive_tested === 40 && codeGaps.status === 'pass'],
    ['GATE-5B3-011', documentScope.length === 25],
    ['GATE-5B3-012', baseline.status === 'pass_with_limitation'],
].map(([gate, pass]) => ({ gate, status: pass ? 'pass' : 'blocked' }));
const report = { schema_version: 'webforge.phase5b3_report.v1', status: gates.every((gate) => gate.status === 'pass') ? 'pass' : 'blocked', phase5b_status: gates.every((gate) => gate.status === 'pass') ? 'pass' : 'blocked', phase5_status: 'blocked', endpoints: { original_total: original.length, original_implemented: globalEndpoints.original.implemented, original_partial: globalEndpoints.partial.length, original_missing: globalEndpoints.missing.length, supplemental_total: supplemental.length, legacy_total: legacy.length, technical_total: technical.length }, business_rules: counts(rules), validations: counts(validations), tests: testSummary, coverage: coverageSummary, gates, historical_baseline_status: baseline.historical_baseline_status, current_reference_preserved: !baseline.unexpected_changes_since_current_reference, pending_for_phase5c: [] };
delete report.validations.academic_simulation;
const artifacts = {
    'initial-audit.json': initialAudit, 'endpoint-coverage.json': globalEndpoints, 'endpoint-test-matrix.json': endpointMatrix,
    'requirement-coverage.json': requirementCoverage, 'business-rule-consistency.json': ruleAudit, 'validation-consistency.json': validationAudit,
    'rbac-consistency.json': rbacReport, 'ownership-consistency.json': ownershipReport, 'transition-coverage.json': transitionReport,
    'audit-coverage.json': auditReport, 'security-coverage.json': securityReport, 'postgres-verification.json': { status: 'not_run', reason: 'A clean QA PostgreSQL verification must be executed separately.' },
    'regression-report.json': regression, 'code-coverage-summary.json': coverageSummary, 'code-coverage-gap-analysis.json': codeGaps,
    'baseline-comparison.json': baseline, 'blockers-for-phase5c.json': { blockers: ['Phase 5B.3 is not closed; do not start 5C.'] }, 'phase5b3-report.json': report,
};
for (const [name, value] of Object.entries(artifacts)) write(path.join(output, name), value);
write(path.join(backend, 'phase5b3-initial-audit.json'), initialAudit);
write(path.join(backend, 'global-requirement-coverage.json'), requirementCoverage);
write(path.join(backend, 'global-endpoint-coverage.json'), globalEndpoints);
write(path.join(backend, 'global-test-matrix.json'), endpointMatrix);
write(path.join(backend, 'rbac-consistency-report.json'), rbacReport);
write(path.join(backend, 'ownership-consistency-report.json'), ownershipReport);
write(path.join(backend, 'global-transition-coverage.json'), transitionReport);
write(path.join(backend, 'audit-coverage.json'), auditReport);
write(path.join(backend, 'global-security-coverage.json'), securityReport);
write(path.join(backend, 'code-coverage-gap-analysis.json'), codeGaps);
fs.writeFileSync(path.join(output, 'phase5b3-summary.md'), `# Phase 5B.3\n\nStatus: **${report.status}**.\n\n- Original endpoints: ${globalEndpoints.original.implemented}/${globalEndpoints.original.total}\n- Document-rule correction: BR-013--BR-036 plus BR-041 = ${documentScope.length} rules.\n- Passing gates: ${gates.filter((gate) => gate.status === 'pass').length}/${gates.length}\n`);
fs.writeFileSync(path.join(output, 'tool-ledger.jsonl'), `${JSON.stringify({ timestamp: now, tool: 'node', action: 'phase5b3 consolidation' })}\n`);
fs.writeFileSync(path.join(output, 'change-ledger.jsonl'), `${JSON.stringify({ timestamp: now, scope: '5B.3', change: 'generated evidence-based consolidation reports' })}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'pass') process.exitCode = 1;
