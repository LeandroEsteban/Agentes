import { mkdirSync, writeFileSync } from 'node:fs';

const root = new URL('../runs/phase7ar5/', import.meta.url);
mkdirSync(root, { recursive: true });
const write = (name, value) => writeFileSync(new URL(name, root), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
const gaps = [
  ['E2E-03', 'e2e-03-document-version-attachment.spec.ts', ['documents', 'versions', 'attachments', 'history'], ['create document', 'create version', 'base64 attachment', 'timeline'], 'superficial'],
  ['E2E-04', 'e2e-04-review-approval.spec.ts', ['reviews', 'approvals'], ['reply review', 'approval decision'], 'superficial'],
  ['E2E-05', 'e2e-05-signature.spec.ts', ['signature'], ['sign approved document'], 'superficial'],
  ['E2E-06', 'e2e-06-expedient.spec.ts', ['expedients'], ['create', 'associate document', 'close'], 'superficial'],
  ['E2E-07', 'e2e-07-correspondence.spec.ts', ['correspondence'], ['create', 'route', 'history'], 'superficial'],
  ['E2E-08', 'e2e-08-admin.spec.ts', ['procedure-types', 'external-entities'], ['create', 'edit'], 'superficial'],
  ['E2E-09', 'e2e-09-public-content.spec.ts', ['public content'], ['draft', 'publish', 'unpublish'], 'superficial'],
  ['E2E-10', 'e2e-10-guards-permissions.spec.ts', ['guards'], ['actor guard', 'permission guard', 'expired session'], 'superficial'],
].map(([flow_id, test_file, ui_routes, required_operations, status]) => ({ flow_id, test_file: `src/e2e/flows/${test_file}`, ui_routes, required_operations, current_steps: ['navigation only'], missing_steps: required_operations, fixture_dependencies: ['QA PostgreSQL'], expected_transitions: [], negative_cases: [], status }));
write('e2e-gap-analysis.json', gaps);
writeFileSync(new URL('../frontend/phase7ar5-e2e-gap-analysis.json', import.meta.url), `${JSON.stringify(gaps, null, 2)}\n`);
write('console-network-report.json', { status: 'incomplete', critical: [], high: [{ id: 'QA-DEF-E2E-001', summary: 'Internal E2E login wait regex matches login route before authentication completes.' }], unexpected_500_503: [], cors_errors: [], note: 'Capture was not completed because the final suite timed out.' });
write('defect-register.json', [{ defect_id: 'QA-DEF-E2E-001', flow: 'E2E-03..E2E-08', classification: 'test_defect', severity: 'high', reproduction: ['Run npm.cmd run test:e2e -- --grep @E2E-03.', 'waitForURL(/\\/intranet/) matches /intranet/login and the test continues unauthenticated.'], root_cause: 'Non-specific URL assertion.', changed_files: ['frontend/src/e2e/flows/e2e-03-document-version-attachment.spec.ts'], regression_tests: [], status: 'open' }, { defect_id: 'QA-DEF-FE-002', flow: 'E2E-03', classification: 'frontend_defect', severity: 'high', reproduction: ['Create a document through the prior UI.'], root_cause: 'UI payload omitted required content and used non-contract field names.', changed_files: ['frontend/src/features/documents/DocumentCreatePage.tsx', 'frontend/src/features/documents/DocumentDetailPage.tsx', 'frontend/src/features/documents/DocumentVersionsPage.tsx'], regression_tests: ['npm.cmd run build'], status: 'resolved' }]);
write('e2e-execution-report.json', { status: 'blocked', individual: { 'E2E-01': 'pass', 'E2E-02': 'pass', 'E2E-03': 'fail', 'E2E-04': 'fail', 'E2E-05': 'fail', 'E2E-06': 'fail', 'E2E-07': 'fail', 'E2E-08': 'fail', 'E2E-09': 'pass_superficial', 'E2E-10': 'pass_superficial' }, full_suite: 'incomplete_timeout' });
write('infrastructure-test-report.json', { status: 'partial', qa_verify: { tables: 40, migrations: 17, pending: 0 }, infra_01: 'not_executed', infra_02: 'not_executed', infra_03: 'not_executed' });
write('e2e-fixture-manifest.json', { status: 'incomplete', missing: ['approved document fixture', 'signer profile fixture', 'approver fixture', 'real E2E page objects'] });
write('e2e-flow-matrix.json', gaps.map((gap) => ({ flow_id: gap.flow_id, screens: gap.ui_routes, operations: gap.required_operations, actors: [], fixtures: gap.fixture_dependencies, database_assertions: [], negative_cases: gap.negative_cases, executed: true, passed: false, attempts: 1, defects: ['QA-DEF-E2E-001'] })));
write('backend-regression.json', { status: 'not_executed', reason: 'Functional E2E gate blocked.' });
write('backend-coverage.json', { status: 'not_executed' });
write('frontend-regression.json', { status: 'partial', build: 'pass', lint: 'not_executed', tests: 'not_executed', coverage: 'not_executed' });
write('frontend-coverage.json', { status: 'not_executed' });
write('webforge-verification.json', { status: 'not_executed', reason: '7A functional gates blocked.' });
write('reproducibility-report.json', { status: 'blocked', reproducible_stack: true, blockers: ['Incomplete E2E workflows and open high-severity test defect.'] });
const gates = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`GATE-7A-FINAL-${String(index + 1).padStart(3, '0')}`, index === 11 ? 'pass_with_limitation' : 'blocked']));
write('final-gates.json', gates);
write('blockers-for-phase7b.json', { status: 'blocked', blockers: ['E2E-03 through E2E-08 fail.', 'E2E-09 and E2E-10 are superficial.', 'Infrastructure, backend/frontend regressions, coverage and WebForge were not completed.'] });
write('artifact-inventory.json', { status: 'partial', artifacts: ['e2e-gap-analysis.json', 'e2e-execution-report.json', 'defect-register.json'] });
write('tool-ledger.jsonl', '{"tool":"npm.cmd run qa:verify","result":"pass"}\n{"tool":"npm.cmd run test:e2e","result":"timeout"}\n');
write('change-ledger.jsonl', '{"change":"Contractual frontend document payload fixes","status":"build_pass"}\n');
write('phase7ar5-report.json', { schema_version: 'webforge.phase7ar5_report.v1', status: 'blocked', phase7a_status: 'blocked', phase7_status: 'blocked', tests: { python_passed: 0, backend_passed: 0, backend_failed: 0, frontend_passed: 0, frontend_failed: 0, functional_e2e_planned: 10, functional_e2e_executed: 10, functional_e2e_passed: 2, functional_e2e_failed: 6, functional_e2e_skipped: 0, infrastructure_e2e_planned: 3, infrastructure_e2e_passed: 0 }, coverage: { backend: {}, frontend: {} }, gates: { pass: 0, pass_with_limitation: 1, blocked: 11 }, critical_blockers: ['Open high-severity E2E defect and incomplete functional flows.'], blockers_for_phase7b: ['Phase 7A is blocked.'] });
write('phase7ar5-summary.md', '# Phase 7A-R5\n\nStatus: blocked. QA schema verification passed (40 tables, 17 migrations, zero pending). E2E final suite was incomplete and functional gates were not met.\n');
