# Benchmark Package

This directory is the current repo-local benchmark package entry for PRISMA Workbench.

Current scope:

- reproducible dedup benchmark commands
- manifest-driven benchmark fixtures
- benchmark reports that record the current evidence-backed results

This is not yet a polished external benchmark suite. It is the current reproducible package entry inside the repository.

## Current Entry Points

- runner: `scripts/dedup/run-benchmark.mjs`
- manifest: `tests/fixtures/dedup/benchmark-manifest.csv`
- current report: `docs/benchmarks/dedup/post-implementation-benchmark-report.md`

## How To Run

Show the current benchmark package usage:

```powershell
node scripts/dedup/run-benchmark.mjs --help
```

Run the frozen baseline target across the current manifest:

```powershell
node scripts/dedup/run-benchmark.mjs --target root-app
```

Run the current dedup engine target across the current manifest:

```powershell
node scripts/dedup/run-benchmark.mjs --target dedup-vnext
```

Run one dataset only:

```powershell
node scripts/dedup/run-benchmark.mjs --target dedup-vnext --dataset real-rdf-001
```

Run the benchmark guard tests:

```powershell
node --test tests/dedup/benchmark-smoke.test.mjs tests/dedup/benchmark-regression.test.mjs
```

## Outputs

- JSON benchmark results printed by the runner
- manifest-driven dataset summaries
- Markdown reports under `docs/benchmarks/`

## Current Boundaries

- The package currently starts from dedup benchmark assets.
- It does not yet cover every product module.
- It is intended to be reproducible and repo-local, not publication-ready by itself.
