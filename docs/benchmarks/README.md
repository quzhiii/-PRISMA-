# Benchmark Package

This directory is the current repo-local benchmark package entry for PRISMA Workbench.

Current scope:

- reproducible dedup benchmark commands
- manifest-driven benchmark fixtures
- benchmark reports that record the current evidence-backed results
- import benchmark: parser correctness across Chinese sources
- screening benchmark: screening correctness on demo data
- audit replay benchmark: PRISMA count deterministic replay

This is not yet a polished external benchmark suite. It is the current reproducible package entry inside the repository.

## Current Entry Points

- runner: `scripts/dedup/run-benchmark.mjs`
- manifest: `tests/fixtures/dedup/benchmark-manifest.csv`
- current report: `docs/benchmarks/dedup/post-implementation-benchmark-report.md`
- package coverage: `tests/benchmarks/package-coverage.test.mjs`

## How To Run

### Existing Dedup Benchmarks

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

### Package Coverage Benchmark (import + screening + audit replay)

```powershell
node --test tests/benchmarks/package-coverage.test.mjs
```

This suite covers:

- **Import benchmark**: CNKI RDF, Wanfang CSV, VIP CSV, SinoMed NBIB parser correctness
- **Screening benchmark**: demo dataset year filtering, source distribution, dedup signals
- **Audit replay benchmark**: PRISMA count replay consistency, determinism, defense pack stability

### Full Regression (all tests including benchmarks)

```powershell
node tests/run-all-regressions.js
```

## Outputs

- JSON benchmark results printed by the runner
- manifest-driven dataset summaries
- Markdown reports under `docs/benchmarks/`
- Package coverage test results (TAP format)

## Current Boundaries

- The package currently starts from dedup benchmark assets plus package coverage.
- It does not yet cover every product module.
- It is intended to be reproducible and repo-local, not publication-ready by itself.
