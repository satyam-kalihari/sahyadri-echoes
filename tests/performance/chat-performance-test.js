/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

if (typeof fetch !== "function") {
  console.error("Global fetch is not available. Use Node.js 18+.");
  process.exit(1);
}

const targetUrl = process.env.PERF_URL || "http://localhost:3000/api/chat";
const concurrencyLevels = [1, 3, 5, 10];
const requestsPerLevel = Number(process.env.PERF_REQUESTS || 20);
const timeoutMs = Number(process.env.PERF_TIMEOUT_MS || 25000);
const p95SloMs = Number(process.env.PERF_SLO_P95_MS || 12000);
const maxErrorRatePct = Number(process.env.PERF_MAX_ERROR_RATE || 5);
const apdexTMs = Number(process.env.PERF_APDEX_T_MS || 4000);
const exportPng =
  (process.env.PERF_EXPORT_PNG || "true").toLowerCase() === "true";
const chartWidth = Number(process.env.PERF_PNG_WIDTH || 1200);
const chartHeight = Number(process.env.PERF_PNG_HEIGHT || 700);
const chartDevicePixelRatio = Number(process.env.PERF_PNG_DPR || 2);

const payload = {
  messages: [
    { role: "user", content: "Tell me a short history of this place." },
  ],
  location: { name: "Ajanta Caves" },
  language: "en",
};

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1),
  );
  return sortedValues[index];
}

async function makeRequest() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const elapsedMs = Date.now() - startedAt;
    let body = {};

    try {
      body = await response.json();
    } catch {
      body = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      hasContent: typeof body.content === "string" && body.content.length > 0,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    return {
      ok: false,
      status: 0,
      elapsedMs,
      hasContent: false,
      error: error && error.name ? error.name : "RequestError",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runLevel(concurrency, totalRequests) {
  const results = [];
  let launched = 0;
  let completed = 0;
  const levelStartedAt = Date.now();

  return new Promise((resolve) => {
    function launchNext() {
      while (launched - completed < concurrency && launched < totalRequests) {
        launched += 1;

        makeRequest().then((result) => {
          results.push(result);
          completed += 1;

          if (completed === totalRequests) {
            resolve({
              results,
              durationMs: Date.now() - levelStartedAt,
            });
            return;
          }

          launchNext();
        });
      }
    }

    launchNext();
  });
}

function summarizeResults(concurrency, levelData) {
  const results = levelData.results;
  const durationMs = Math.max(1, levelData.durationMs);
  const latency = results.map((r) => r.elapsedMs).sort((a, b) => a - b);
  const successCount = results.filter((r) => r.ok && r.hasContent).length;
  const errorCount = results.length - successCount;
  const successRatePct = Number(
    ((successCount / results.length) * 100).toFixed(2),
  );
  const throughputRps = Number(
    (results.length / (durationMs / 1000)).toFixed(3),
  );

  const satisfied = latency.filter((ms) => ms <= apdexTMs).length;
  const tolerating = latency.filter(
    (ms) => ms > apdexTMs && ms <= apdexTMs * 4,
  ).length;
  const apdex = Number(
    ((satisfied + tolerating / 2) / results.length).toFixed(3),
  );

  const p95Ms = percentile(latency, 95);
  const errorRatePct = Number(((errorCount / results.length) * 100).toFixed(2));

  return {
    concurrency,
    requests: results.length,
    durationMs,
    successCount,
    successRatePct,
    errorCount,
    errorRatePct,
    throughputRps,
    apdex,
    avgMs: Number(
      (latency.reduce((a, b) => a + b, 0) / latency.length).toFixed(2),
    ),
    p50Ms: percentile(latency, 50),
    p95Ms,
    maxMs: latency.length > 0 ? latency[latency.length - 1] : 0,
    p95SloPassed: p95Ms <= p95SloMs,
    errorBudgetPassed: errorRatePct <= maxErrorRatePct,
  };
}

function formatTable(rows) {
  const header =
    "| Concurrency | Requests | Success % | Error % | Avg (ms) | P50 (ms) | P95 (ms) | Max (ms) | Throughput (req/s) | Apdex | P95 SLO | Error Budget |";
  const separator =
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|";
  const lines = rows.map((row) => {
    return `| ${row.concurrency} | ${row.requests} | ${row.successRatePct} | ${row.errorRatePct} | ${row.avgMs} | ${row.p50Ms} | ${row.p95Ms} | ${row.maxMs} | ${row.throughputRps} | ${row.apdex} | ${row.p95SloPassed ? "PASS" : "FAIL"} | ${row.errorBudgetPassed ? "PASS" : "FAIL"} |`;
  });

  return [header, separator, ...lines].join("\n");
}

function buildAnalysis(rows) {
  const byP95 = [...rows].sort((a, b) => a.p95Ms - b.p95Ms);
  const byThroughput = [...rows].sort(
    (a, b) => b.throughputRps - a.throughputRps,
  );
  const byError = [...rows].sort((a, b) => a.errorRatePct - b.errorRatePct);

  const bestLatency = byP95[0];
  const bestThroughput = byThroughput[0];
  const mostReliable = byError[0];

  const stableCandidates = rows.filter(
    (row) => row.p95SloPassed && row.errorBudgetPassed,
  );
  const recommended =
    stableCandidates.sort((a, b) => b.throughputRps - a.throughputRps)[0] ||
    null;

  const warningRows = rows.filter(
    (row) => !row.p95SloPassed || !row.errorBudgetPassed,
  );

  const lines = [
    "## Performance Metrics Analysis",
    "",
    `- Best latency (lowest P95): concurrency ${bestLatency.concurrency} with ${bestLatency.p95Ms} ms`,
    `- Best throughput: concurrency ${bestThroughput.concurrency} with ${bestThroughput.throughputRps} req/s`,
    `- Most reliable (lowest error): concurrency ${mostReliable.concurrency} with ${mostReliable.errorRatePct}% error`,
  ];

  if (recommended) {
    lines.push(
      `- Recommended operating point: concurrency ${recommended.concurrency} (meets P95 and error budget with ${recommended.throughputRps} req/s)`,
    );
  } else {
    lines.push(
      "- Recommended operating point: none met both P95 SLO and error budget in this run",
    );
  }

  if (warningRows.length > 0) {
    lines.push("- Risk flags:");
    warningRows.forEach((row) => {
      const reasons = [];
      if (!row.p95SloPassed) reasons.push(`P95>${p95SloMs}ms`);
      if (!row.errorBudgetPassed) reasons.push(`error>${maxErrorRatePct}%`);
      lines.push(`  - concurrency ${row.concurrency}: ${reasons.join(", ")}`);
    });
  }

  return lines.join("\n");
}

function buildMermaidLineChart(rows) {
  const xAxis = rows.map((row) => row.concurrency).join(", ");
  const avgSeries = rows.map((row) => row.avgMs).join(", ");
  const p95Series = rows.map((row) => row.p95Ms).join(", ");

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Chat API latency vs concurrency"',
    '    x-axis "Concurrent users" [' + xAxis + "]",
    '    y-axis "Latency (ms)" 0 --> 30000',
    '    line "Average" [' + avgSeries + "]",
    '    line "P95" [' + p95Series + "]",
    "```",
  ].join("\n");
}

function buildErrorRateChart(rows) {
  const xAxis = rows.map((row) => row.concurrency).join(", ");
  const errorSeries = rows.map((row) => row.errorRatePct).join(", ");

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Error rate vs concurrency"',
    '    x-axis "Concurrent users" [' + xAxis + "]",
    '    y-axis "Error rate (%)" 0 --> 100',
    '    bar "Error %" [' + errorSeries + "]",
    "```",
  ].join("\n");
}

function buildThroughputChart(rows) {
  const xAxis = rows.map((row) => row.concurrency).join(", ");
  const throughputSeries = rows.map((row) => row.throughputRps).join(", ");
  const maxThroughput = Math.max(...rows.map((row) => row.throughputRps), 1);
  const yMax = Number((maxThroughput * 1.25).toFixed(3));

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Throughput vs concurrency"',
    '    x-axis "Concurrent users" [' + xAxis + "]",
    '    y-axis "Throughput (req/s)" 0 --> ' + yMax,
    '    bar "Throughput" [' + throughputSeries + "]",
    "```",
  ].join("\n");
}

function buildApdexChart(rows) {
  const xAxis = rows.map((row) => row.concurrency).join(", ");
  const apdexSeries = rows.map((row) => row.apdex).join(", ");

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Apdex vs concurrency"',
    '    x-axis "Concurrent users" [' + xAxis + "]",
    '    y-axis "Apdex" 0 --> 1',
    '    line "Apdex" [' + apdexSeries + "]",
    "```",
  ].join("\n");
}

function buildSloComplianceChart(rows) {
  const xAxis = rows.map((row) => row.concurrency).join(", ");
  const p95PassSeries = rows
    .map((row) => (row.p95SloPassed ? 1 : 0))
    .join(", ");
  const errorPassSeries = rows
    .map((row) => (row.errorBudgetPassed ? 1 : 0))
    .join(", ");

  return [
    "```mermaid",
    "xychart-beta",
    '    title "SLO compliance by concurrency"',
    '    x-axis "Concurrent users" [' + xAxis + "]",
    '    y-axis "Pass (1) / Fail (0)" 0 --> 1',
    '    bar "P95 SLO" [' + p95PassSeries + "]",
    '    bar "Error Budget" [' + errorPassSeries + "]",
    "```",
  ].join("\n");
}

function buildKpiSummary(rows) {
  const weightedLatency = Number(
    (
      rows.reduce((sum, row) => sum + row.avgMs * row.requests, 0) /
      Math.max(
        1,
        rows.reduce((sum, row) => sum + row.requests, 0),
      )
    ).toFixed(2),
  );

  const weightedErrorRate = Number(
    (
      rows.reduce((sum, row) => sum + row.errorRatePct * row.requests, 0) /
      Math.max(
        1,
        rows.reduce((sum, row) => sum + row.requests, 0),
      )
    ).toFixed(2),
  );

  const avgThroughput = Number(
    (
      rows.reduce((sum, row) => sum + row.throughputRps, 0) /
      Math.max(1, rows.length)
    ).toFixed(3),
  );

  const avgApdex = Number(
    (
      rows.reduce((sum, row) => sum + row.apdex, 0) / Math.max(1, rows.length)
    ).toFixed(3),
  );

  const totalChecks = rows.length * 2;
  const passedChecks =
    rows.filter((row) => row.p95SloPassed).length +
    rows.filter((row) => row.errorBudgetPassed).length;
  const compliancePct = Number(
    ((passedChecks / Math.max(1, totalChecks)) * 100).toFixed(2),
  );

  return [
    "## KPI Summary",
    "",
    "| KPI | Value |",
    "|---|---:|",
    `| Weighted average latency (ms) | ${weightedLatency} |`,
    `| Weighted average error rate (%) | ${weightedErrorRate} |`,
    `| Average throughput (req/s) | ${avgThroughput} |`,
    `| Average Apdex | ${avgApdex} |`,
    `| Overall SLO compliance (%) | ${compliancePct} |`,
    "",
  ].join("\n");
}

function buildQuickChartConfig(rows, chartType) {
  const labels = rows.map((row) => String(row.concurrency));

  if (chartType === "latency") {
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Average (ms)",
            data: rows.map((row) => row.avgMs),
            borderColor: "#1f77b4",
            backgroundColor: "rgba(31, 119, 180, 0.2)",
            fill: false,
            tension: 0.25,
          },
          {
            label: "P95 (ms)",
            data: rows.map((row) => row.p95Ms),
            borderColor: "#d62728",
            backgroundColor: "rgba(214, 39, 40, 0.2)",
            fill: false,
            tension: 0.25,
          },
        ],
      },
      options: {
        title: { display: true, text: "Chat API latency vs concurrency" },
        scales: {
          xAxes: [
            { scaleLabel: { display: true, labelString: "Concurrent users" } },
          ],
          yAxes: [
            {
              scaleLabel: { display: true, labelString: "Latency (ms)" },
              ticks: { beginAtZero: true },
            },
          ],
        },
      },
    };
  }

  if (chartType === "errorRate") {
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Error rate (%)",
            data: rows.map((row) => row.errorRatePct),
            backgroundColor: "#ff7f0e",
          },
        ],
      },
      options: {
        title: { display: true, text: "Error rate vs concurrency" },
        scales: {
          xAxes: [
            { scaleLabel: { display: true, labelString: "Concurrent users" } },
          ],
          yAxes: [
            {
              scaleLabel: { display: true, labelString: "Error rate (%)" },
              ticks: { beginAtZero: true, max: 100 },
            },
          ],
        },
      },
    };
  }

  if (chartType === "throughput") {
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Throughput (req/s)",
            data: rows.map((row) => row.throughputRps),
            backgroundColor: "#2ca02c",
          },
        ],
      },
      options: {
        title: { display: true, text: "Throughput vs concurrency" },
        scales: {
          xAxes: [
            { scaleLabel: { display: true, labelString: "Concurrent users" } },
          ],
          yAxes: [
            {
              scaleLabel: { display: true, labelString: "Throughput (req/s)" },
              ticks: { beginAtZero: true },
            },
          ],
        },
      },
    };
  }

  if (chartType === "apdex") {
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Apdex",
            data: rows.map((row) => row.apdex),
            borderColor: "#9467bd",
            backgroundColor: "rgba(148, 103, 189, 0.2)",
            fill: false,
            tension: 0.25,
          },
        ],
      },
      options: {
        title: { display: true, text: "Apdex vs concurrency" },
        scales: {
          xAxes: [
            { scaleLabel: { display: true, labelString: "Concurrent users" } },
          ],
          yAxes: [
            {
              scaleLabel: { display: true, labelString: "Apdex" },
              ticks: { beginAtZero: true, max: 1 },
            },
          ],
        },
      },
    };
  }

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "P95 SLO Pass",
          data: rows.map((row) => (row.p95SloPassed ? 1 : 0)),
          backgroundColor: "#17becf",
        },
        {
          label: "Error Budget Pass",
          data: rows.map((row) => (row.errorBudgetPassed ? 1 : 0)),
          backgroundColor: "#bcbd22",
        },
      ],
    },
    options: {
      title: { display: true, text: "SLO compliance by concurrency" },
      scales: {
        xAxes: [
          { scaleLabel: { display: true, labelString: "Concurrent users" } },
        ],
        yAxes: [
          {
            scaleLabel: { display: true, labelString: "Pass (1) / Fail (0)" },
            ticks: { beginAtZero: true, max: 1 },
          },
        ],
      },
    },
  };
}

async function exportChartPng(chartConfig, outputFilePath) {
  const response = await fetch("https://quickchart.io/chart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "2.9.4",
      width: chartWidth,
      height: chartHeight,
      devicePixelRatio: chartDevicePixelRatio,
      format: "png",
      backgroundColor: "white",
      chart: chartConfig,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`QuickChart error: ${response.status} ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputFilePath, Buffer.from(arrayBuffer));
}

async function exportAllCharts(rows, outputDir) {
  if (!exportPng) {
    return [];
  }

  const pngDir = path.join(outputDir, "performance-png");
  fs.mkdirSync(pngDir, { recursive: true });

  const chartSpecs = [
    { key: "latency", filename: "latency-vs-concurrency.png" },
    { key: "errorRate", filename: "error-rate-vs-concurrency.png" },
    { key: "throughput", filename: "throughput-vs-concurrency.png" },
    { key: "apdex", filename: "apdex-vs-concurrency.png" },
    { key: "slo", filename: "slo-compliance-vs-concurrency.png" },
  ];

  const outputs = [];

  for (const spec of chartSpecs) {
    const config = buildQuickChartConfig(rows, spec.key);
    const outputFile = path.join(pngDir, spec.filename);
    await exportChartPng(config, outputFile);
    outputs.push(outputFile);
  }

  return outputs;
}

function buildMarkdownReport(rows, startedAtIso) {
  const table = formatTable(rows);
  const chart = buildMermaidLineChart(rows);
  const errorRateChart = buildErrorRateChart(rows);
  const throughputChart = buildThroughputChart(rows);
  const apdexChart = buildApdexChart(rows);
  const sloChart = buildSloComplianceChart(rows);
  const kpiSummary = buildKpiSummary(rows);
  const analysis = buildAnalysis(rows);

  return [
    "# Chat API Performance Report",
    "",
    "- Target: " + targetUrl,
    "- Started: " + startedAtIso,
    "- Requests per level: " + requestsPerLevel,
    "- Timeout per request (ms): " + timeoutMs,
    "- P95 SLO (ms): " + p95SloMs,
    "- Max error rate (%): " + maxErrorRatePct,
    "- Apdex T (ms): " + apdexTMs,
    "",
    "## Latency Graph",
    "",
    chart,
    "",
    "## Error Rate Graph",
    "",
    errorRateChart,
    "",
    "## Throughput Graph",
    "",
    throughputChart,
    "",
    "## Apdex Graph",
    "",
    apdexChart,
    "",
    "## SLO Compliance Graph",
    "",
    sloChart,
    "",
    "## Results",
    "",
    table,
    "",
    kpiSummary,
    "",
    analysis,
    "",
  ].join("\n");
}

async function main() {
  const startedAtIso = new Date().toISOString();
  console.log("Running chat performance test against " + targetUrl);

  const summaries = [];

  for (const concurrency of concurrencyLevels) {
    console.log(
      `- Testing concurrency ${concurrency} with ${requestsPerLevel} requests`,
    );
    const levelData = await runLevel(concurrency, requestsPerLevel);
    const summary = summarizeResults(concurrency, levelData);
    summaries.push(summary);
  }

  console.log("\nSummary:\n");
  console.log(formatTable(summaries));

  const report = buildMarkdownReport(summaries, startedAtIso);
  const outputDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, "chat-performance-report.md");
  fs.writeFileSync(outputFile, report, "utf8");

  try {
    const pngFiles = await exportAllCharts(summaries, outputDir);
    if (pngFiles.length > 0) {
      console.log("\nPNG charts exported:");
      pngFiles.forEach((filePath) => console.log("- " + filePath));
    } else {
      console.log("\nPNG export disabled (PERF_EXPORT_PNG=false)");
    }
  } catch (error) {
    console.warn(
      "\nPNG export failed:",
      error && error.message ? error.message : error,
    );
  }

  console.log("\nReport written to: " + outputFile);
}

main().catch((error) => {
  console.error("Performance test failed:", error);
  process.exit(1);
});
