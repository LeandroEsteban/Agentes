const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..', '..');
const qaEnvFile = path.join(projectRoot, 'infra', 'qa', '.env.qa.local');
if (!process.env.PERSISTENCE_MODE && fs.existsSync(qaEnvFile)) {
    for (const line of fs.readFileSync(qaEnvFile, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    }
}
const testsRoot = path.join(projectRoot, 'backend', 'tests');
const runsRoot = path.join(projectRoot, 'runs', 'phase5b');
const group = process.argv[2];
const groups = group === 'all' ? ['unit', 'api', 'integration', 'smoke'] : [group];
const reportNames = { unit: 'unit-test-report.json', api: 'api-test-report.json', integration: 'integration-test-report.json', smoke: 'smoke-test-report.json' };
const phase5b2dFiles = {
    api: [path.join(testsRoot, 'phase5b2d', 'phase5b2d-security.api.test.js')],
    integration: [path.join(testsRoot, 'phase5b2d', 'phase5b2d-lifecycle.integration.test.js')],
};

function filesFor(name) {
    const directory = path.join(testsRoot, name);
    const files = !fs.existsSync(directory) ? [] : fs.readdirSync(directory)
        .filter((file) => file.endsWith('.test.js'))
        .sort()
        .map((file) => path.join(directory, file));
    return [...files, ...(phase5b2dFiles[name] || [])].filter((file) => fs.existsSync(file));
}

function run(name) {
    const files = filesFor(name);
    if (files.length === 0) throw new Error(`No test files found for suite ${name}`);
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: projectRoot, encoding: 'utf8' });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const read = (label) => Number((output.match(new RegExp(`(?:#|ℹ) ${label} (\\d+)`)) || [])[1] || 0);
    const report = {
        suite: name,
        runner: 'node:test',
        sequential: true,
        files,
        passed: read('pass'),
        failed: read('fail'),
        skipped: read('skipped'),
        duration_ms: Number((output.match(/# duration_ms ([0-9.]+)/) || [])[1] || 0),
        exit_code: result.status === null ? 1 : result.status,
        generated_at: new Date().toISOString(),
    };
    fs.mkdirSync(runsRoot, { recursive: true });
    fs.writeFileSync(path.join(runsRoot, reportNames[name]), `${JSON.stringify(report, null, 2)}\n`);
    if (result.status !== 0) process.exitCode = result.status || 1;
}

if (group === 'coverage') {
    const coverageRoot = path.join(projectRoot, 'coverage');
    fs.mkdirSync(coverageRoot, { recursive: true });
    const c8 = path.join(projectRoot, 'node_modules', 'c8', 'bin', 'c8.js');
    const testFiles = ['unit', 'api', 'integration', 'smoke'].flatMap(filesFor);
    const result = spawnSync(process.execPath, [c8, '--all', '--include=backend/src/**/*.js', '--exclude=backend/tests/**', '--exclude=backend/scripts/**', '--exclude=database/**', '--reporter=json-summary', '--reporter=lcov', '--reporter=html', '--reports-dir=coverage', '--temp-directory=coverage/v8', process.execPath, '--test', '--test-concurrency=1', ...testFiles], { cwd: projectRoot, encoding: 'utf8' });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (!fs.existsSync(path.join(coverageRoot, 'coverage-summary.json'))) throw new Error('c8 did not create coverage-summary.json');
    const c8Html = path.join(coverageRoot, 'lcov-report');
    const requiredHtml = path.join(coverageRoot, 'html');
    if (fs.existsSync(c8Html)) fs.cpSync(c8Html, requiredHtml, { recursive: true, force: true });
    process.exit(result.status || 0);
}

if (!groups.every((name) => reportNames[name])) throw new Error(`Unknown test suite: ${group}`);
for (const name of groups) run(name);
