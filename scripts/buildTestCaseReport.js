// Builds a test-case-wise HTML report from tests/Reports/results/results.jsonl
// (one line per scenario run, written by the After hook in tests/Hooks/hooks.ts).
//
// Output in tests/Reports/cucumber-report/:
//   index.html            -> one row per feature: Feature Name, Result, Report link
//   TC03_ShowAllProducts.html, ...  -> one page per test case: scenario x user matrix,
//                                      error messages and screenshots of every run
//
// Used by scripts/runAllUsers.js, or on its own:  node scripts/buildTestCaseReport.js

const fs = require('fs');
const path = require('path');

// Badge colors: green for passed, red for failed, amber for steps that did not really run
const STATUS_COLORS = {
    PASSED: '#1a7f37',
    FAILED: '#cf222e',
    SKIPPED: '#9a6700',
    UNDEFINED: '#9a6700',
    AMBIGUOUS: '#9a6700',
    PENDING: '#9a6700',
};

// Scenario names and error messages are put into HTML, so they must be escaped
function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function statusBadge(status) {
    const color = STATUS_COLORS[status] || '#57606a';
    return `<span class="badge" style="background:${color}">${escapeHtml(status)}</span>`;
}

function formatDuration(ms) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

// Anchor id for one scenario run, used to link from the matrix to its details
function runId(record) {
    return `run-${`${record.scenario}-${record.user}`.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Relative URL from the report folder to a file under tests/Reports
function urlFromReport(relativeToReports) {
    return '../' + relativeToReports.split(path.sep).map(encodeURIComponent).join('/');
}

// Reads results.jsonl. A broken line (e.g. from an interrupted run) is skipped instead of stopping the report.
function readRecords(resultsFile) {
    if (!fs.existsSync(resultsFile)) return [];
    return fs.readFileSync(resultsFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
}

function unique(values) {
    return [...new Set(values)];
}

// Shared page layout with inline CSS, so the report needs no extra files
function pageShell(title, body) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #1f2328; }
    h1 { margin-bottom: 4px; }
    .muted { color: #57606a; }
    table { border-collapse: collapse; margin: 16px 0 32px; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; }
    td.center { text-align: center; }
    .badge { color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    details { border: 1px solid #d0d7de; border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
    summary { cursor: pointer; font-weight: 600; }
    pre { background: #f6f8fa; padding: 12px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
    .shots { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .shots figure { margin: 0; width: 220px; }
    .shots img { width: 220px; border: 1px solid #d0d7de; border-radius: 4px; }
    .shots figcaption { font-size: 11px; color: #57606a; word-break: break-word; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// Thumbnails of all screenshots of one run. File names start with the step number, so sorting keeps the step order.
function screenshotsHtml(reportsDir, record) {
    if (!record.screenshotFolder) return '<p class="muted">No screenshots.</p>';
    const folder = path.join(reportsDir, record.screenshotFolder);
    if (!fs.existsSync(folder)) return '<p class="muted">No screenshots.</p>';

    const files = fs.readdirSync(folder).filter(f => f.endsWith('.png')).sort();
    if (files.length === 0) return '<p class="muted">No screenshots.</p>';

    const figures = files.map(file => {
        const url = urlFromReport(path.join(record.screenshotFolder, file));
        return `<figure><a href="${url}" target="_blank"><img src="${url}" loading="lazy" alt="${escapeHtml(file)}"></a>` +
               `<figcaption>${escapeHtml(file)}</figcaption></figure>`;
    }).join('\n');
    return `<div class="shots">${figures}</div>`;
}

// One page per test case (feature file)
function buildTestCasePage(reportsDir, featureFile, records) {
    const featureName = records[0]?.featureName || featureFile;
    const users = unique(records.map(r => r.user));
    const scenarios = unique(records.map(r => r.scenario));
    const passed = records.filter(r => r.status === 'PASSED').length;
    const failed = records.length - passed;

    // Matrix: one row per scenario, one column per user
    const header = `<tr><th>Scenario</th>${users.map(u => `<th>${escapeHtml(u)}</th>`).join('')}</tr>`;
    const rows = scenarios.map(scenario => {
        const cells = users.map(user => {
            const record = records.find(r => r.scenario === scenario && r.user === user);
            if (!record) return '<td class="center muted">–</td>';
            return `<td class="center"><a href="#${runId(record)}">${statusBadge(record.status)}</a></td>`;
        }).join('');
        return `<tr><td>${escapeHtml(scenario)}</td>${cells}</tr>`;
    }).join('\n');

    // Details: every run, failures first and opened
    const ordered = [...records].sort((a, b) => (a.status === 'PASSED') - (b.status === 'PASSED'));
    const details = ordered.map(record => {
        const open = record.status !== 'PASSED' ? ' open' : '';
        const error = record.error ? `<pre>${escapeHtml(record.error)}</pre>` : '';
        return `<details id="${runId(record)}"${open}>
  <summary>${statusBadge(record.status)} ${escapeHtml(record.scenario)} &middot; ${escapeHtml(record.user)} &middot; ${formatDuration(record.durationMs)}</summary>
  ${error}
  ${screenshotsHtml(reportsDir, record)}
</details>`;
    }).join('\n');

    const body = `
<p><a href="index.html">&larr; All test cases</a></p>
<h1>${escapeHtml(featureFile)}</h1>
<p class="muted">${escapeHtml(featureName)}</p>
<p>${records.length} runs: ${statusBadge('PASSED')} ${passed} &nbsp; ${failed > 0 ? `${statusBadge('FAILED')} ${failed}` : ''}</p>

<h2>Ergebnisse je Szenario und Benutzer</h2>
<table>
${header}
${rows}
</table>

<h2>Details zum Testlauf</h2>
${details}`;

    return pageShell(`${featureFile} - Test Report`, body);
}

// index.html: one row per feature. A feature is FAILED if any of its runs did not pass.
function buildIndexPage(byFeature) {
    const rows = [...byFeature.entries()].map(([featureFile, records]) => {
        const failed = records.filter(r => r.status !== 'PASSED').length;
        const result = failed === 0 ? 'PASSED' : 'FAILED';
        const featureName = records[0]?.featureName || featureFile;
        return `<tr>
  <td>${escapeHtml(featureName)}<br><span class="muted">${escapeHtml(featureFile)}</span></td>
  <td>${statusBadge(result)}</td>
  <td><a href="${encodeURIComponent(featureFile)}.html">${escapeHtml(featureFile)}.html</a></td>
</tr>`;
    }).join('\n');

    const body = `
<h1>Testbericht</h1>
<p class="muted">Run finished: ${escapeHtml(new Date().toLocaleString())}</p>
${byFeature.size === 0 ? '<p class="muted">No results found.</p>' : `<table>
<tr><th>Feature Name</th><th>Result</th><th>Report</th></tr>
${rows}
</table>`}`;

    return pageShell('Test Report', body);
}

// Builds all pages and returns the path of index.html
function buildTestCaseReport(reportsDir) {
    const resultsFile = path.join(reportsDir, 'results', 'results.jsonl');
    const outDir = path.join(reportsDir, 'cucumber-report');
    fs.mkdirSync(outDir, { recursive: true });

    // Group by feature file, sorted (TC01, TC02, ...)
    const byFeature = new Map();
    for (const record of readRecords(resultsFile)) {
        if (!byFeature.has(record.featureFile)) byFeature.set(record.featureFile, []);
        byFeature.get(record.featureFile).push(record);
    }
    const sorted = new Map([...byFeature.entries()].sort(([a], [b]) => a.localeCompare(b)));

    for (const [featureFile, records] of sorted) {
        fs.writeFileSync(path.join(outDir, `${featureFile}.html`), buildTestCasePage(reportsDir, featureFile, records));
    }

    const indexPath = path.join(outDir, 'index.html');
    fs.writeFileSync(indexPath, buildIndexPage(sorted));
    return indexPath;
}

module.exports = { buildTestCaseReport };

// Allows running it on its own: node scripts/buildTestCaseReport.js
if (require.main === module) {
    const reportsDir = path.join(__dirname, '..', 'tests', 'Reports');
    console.log(`Report: ${buildTestCaseReport(reportsDir)}`);
}