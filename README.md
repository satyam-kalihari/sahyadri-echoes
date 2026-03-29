This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Performance Testing (Chat API)

This repo includes a load test for `POST /api/chat` with a generated latency graph.

Run your app first:

```bash
npm run dev
```

In a second terminal, run the performance test:

```bash
npm run test:perf:chat
```

Optional environment variables:

- `PERF_URL` (default: `http://localhost:3000/api/chat`)
- `PERF_REQUESTS` (default: `20` per concurrency level)
- `PERF_TIMEOUT_MS` (default: `25000`)
- `PERF_SLO_P95_MS` (default: `12000`)
- `PERF_MAX_ERROR_RATE` (default: `5`)
- `PERF_APDEX_T_MS` (default: `4000`)
- `PERF_EXPORT_PNG` (default: `true`)
- `PERF_PNG_WIDTH` (default: `1200`)
- `PERF_PNG_HEIGHT` (default: `700`)
- `PERF_PNG_DPR` (default: `2`)

The test writes a report with a Mermaid line chart to:

- `reports/chat-performance-report.md`

The generated dashboard includes:

- Latency (Average and P95) vs concurrency
- Error rate vs concurrency
- Throughput vs concurrency
- Apdex vs concurrency
- SLO compliance (P95 SLO and Error Budget)
- KPI summary + automated analysis

PNG exports are generated in:

- `reports/performance-png/`
