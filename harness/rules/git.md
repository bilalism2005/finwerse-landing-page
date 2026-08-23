# Git Discipline

All git rules that apply to every Claude Code session in this repo. Adapted from `smallTechOrg/zero-shot-claude-boilerplate`'s `harness/rules/git.md` — the boilerplate's "main is boilerplate-only, branch per build" model does not apply here and has been replaced with finwerse's actual workflow below.

---

## Branch Model (finwerse-specific — standing rule, non-negotiable)

- **All commits and pushes go to `staging` — never directly to `main`.** `staging` auto-deploys to `finwerse-api-staging` / `finwerse-batch-cron-staging` per `render.yaml`; `main` deploys to production.
- **When work is ready to reach `main`, open a pull request from `staging` into `main`** for review/approval by **Sai Krishna (Small Tech)**.
- **Never merge that PR.** Approval and merge into `main` are Sai Krishna's to do, not this session's.
- If you find yourself about to commit directly to `main`, stop immediately and redirect the work to `staging`.

## Commit + Push Are One Atomic Action

**Every commit must be pushed immediately.** `git commit` and `git push` are a single atomic action — never one without the other.

```bash
git commit -m "..." && git push origin staging
```

A commit that is not pushed does not exist as far as the project is concerned. This is not optional and survives context compression — if you remember only one rule from this file: **commit then push to `staging`, every time, no exceptions, never to `main`.**

## Before Every Reply to the User

1. Run `git status`
2. If dirty: commit and push to `staging`
3. Confirm the working tree is clean **and** `staging` is pushed before replying

## Commit Message Format

Free-form is fine (finwerse doesn't use the boilerplate's `phase-N:` convention since this isn't a phased greenfield build) — but every message must answer *why* was this change needed, not just restate the diff.

## Staging Rules (git staging, not the `staging` branch — same word, different meaning, watch for the ambiguity)

- **Never `git add -A` or `git add .`** — always stage specific files or directories. `-A` sweeps in untracked leftovers (stray files, abandoned experiments) and poisons the commit.
- If a change touches many files, list them explicitly or stage directories one at a time.
- Run `git diff --staged` before every commit. You are responsible for what you push.

## Commit Quality

- **Commits are logical units.** Each commit should be a self-contained, reviewable change. "Fix bug and refactor and add feature" is three commits.
- **No commented-out code in commits.** If code is not needed, delete it. Git history preserves it.
- **Never commit secrets** — no API keys, passwords, or tokens in source files. See `harness/rules/secret-hygiene.md`. `.env` stays gitignored; `.env.example` (if present) is committed, `.env` never is.
- **Never force-push without explicit user confirmation** — and never to `main` under any circumstance.

## PR Description (for the `staging` → `main` PR)

Every PR to `main` needs:
- What changed
- Why
- How to verify
- Screenshots or test output for UI/behavioural changes

## Closing a Session

Before ending any session:
- [ ] Working tree is clean (all changes committed and pushed to `staging`)
- [ ] `staging` is up to date with `origin/staging`
- [ ] Nothing was pushed or merged to `main` directly
