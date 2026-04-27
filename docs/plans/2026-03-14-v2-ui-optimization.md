# PRISMA v2.0 UI Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the gap between the previous redesign direction and the current `literature-screening-v2.0` state by turning the landing experience into a complete, professional, bilingual entry flow without changing any screening logic.

**Architecture:** Keep `workspace.html` as the actual tool surface, keep `login.html` as the collaborative entry, and treat `index.html` plus `landing.html` as branded entry pages. Focus this iteration on information architecture, navigation clarity, and presentation polish rather than any JavaScript workflow changes.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, localStorage/sessionStorage, existing workers and app logic.

---

## Context Summary

- The previous session established four constraints: light background, sans-serif typography, bilingual zh/en content, and zero workflow changes.
- `literature-screening-v2.0/index.html` is already a real landing page.
- `literature-screening-v2.0/workspace.html` is the actual screening workspace and preserves the existing IDs/hooks.
- `literature-screening-v2.0/login.html` is a redesigned collaboration entry.
- `literature-screening-v2.0/landing.html` is still only a redirect shell, so the dedicated landing-page deliverable is incomplete.

## Task 1: Document the current v2.0 direction

**Files:**
- Create: `docs/plans/2026-03-14-v2-ui-optimization.md`

**Step 1: Capture inherited direction**

- Record the previous conversation goals: professional visual refresh, bilingual support, homepage emphasis, preserve tool logic.

**Step 2: Record current repo reality**

- Note that `index.html` is acting as the homepage.
- Note that `workspace.html` is acting as the functional app.
- Note that `landing.html` is still incomplete.

**Step 3: Set this iteration scope**

- Prioritize route clarity, landing completeness, and stronger conversion into single-review and dual-review flows.

## Task 2: Complete the landing experience

**Files:**
- Modify: `literature-screening-v2.0/landing.html`
- Modify: `literature-screening-v2.0/index.html`
- Modify: `literature-screening-v2.0/style.css`

**Step 1: Replace redirect-only landing page**

- Turn `landing.html` into a real bilingual landing page instead of a meta refresh stub.

**Step 2: Improve homepage information scent**

- Add an explicit entry-path section that separates single-review, dual-review, and workflow overview.

**Step 3: Keep navigation consistent**

- Ensure language toggle, CTA links, and branding all point clearly to `workspace.html` and `login.html`.

## Task 3: Verify without changing logic

**Files:**
- Inspect: `literature-screening-v2.0/*.html`
- Inspect: `literature-screening-v2.0/style.css`

**Step 1: Diagnostics**

- Run diagnostics on modified HTML/CSS files.

**Step 2: Static verification**

- Confirm there is no build system or automated test suite.
- Confirm all modified routes and language-toggle code are internally consistent.

**Step 3: Manual serving check**

- Start a lightweight local server command where possible to confirm the static site can be served.

## Immediate Outcome for This Round

- Deliver a real `landing.html`.
- Strengthen the current home page CTA structure.
- Preserve `workspace.html`, `app.js`, worker files, and all screening logic unchanged.
