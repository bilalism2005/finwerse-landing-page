# Rule: Secret Hygiene

**Scope:** everywhere, always. This is the rule most likely to cause real-world harm if violated.

> **Live finding (2026-08-23):** `apps/api/services/tools.py:354` currently hardcodes a fallback Twitter API key in source (`os.getenv("TWITTER_API_KEY") or "new1_b43898c1acb6453f9ffe8946722ab2f8"`). This is exactly the violation this rule exists to prevent — rotate that key at the provider and remove the hardcoded fallback. Flagged here as a concrete example, not fixed as part of this harness port.

## What is a secret

Anything that authenticates, authorizes, or can be used to impersonate.

For code purposes, treat any field whose name matches `*_token`, `*_secret`,
`*_password`, `*_key`, or `*_credential` as a secret. In finwerse specifically:
`SUPABASE_JWT_SECRET`, `INDIANAPI_KEY`, `EODHD_API_KEY`, `ANGEL_ONE_*`, `GROQ_API_KEY`, `TWITTER_API_KEY`.

## Where secrets live

| Location | Secrets allowed? |
|---|---|
| `.env` (local) / Render env vars (`render.yaml`, `sync: false`) | ✅ Yes (primary store) |
| OS environment variables | ✅ Yes |
| Source code | ❌ Never, including tests |
| Git history | ❌ Never |
| Commit messages, PR descriptions, logs | ❌ Never |

Tests read keys from `.env` / the process environment at runtime — never hardcode a key in a test or fixture.

## Rules for code

### Never log a secret

```python
# BAD
log.info("api_call", token=access_token)

# GOOD
log.info("api_call", token_present=bool(access_token))
```

### Never include secrets in exception messages

```python
# BAD
raise ValueError(f"Auth failed with token {token}")

# GOOD
raise ValueError("Auth failed. Check your API key in .env.")
```

### Never hardcode a fallback secret value

```python
# BAD — this is a real bug in apps/api/services/tools.py today
api_key = os.getenv("TWITTER_API_KEY") or "new1_b43898c1acb6453f9ffe8946722ab2f8"

# GOOD
api_key = os.getenv("TWITTER_API_KEY")
if not api_key:
    return {"error": "Twitter API key not configured on server."}
```

## Rules for `.gitignore`

The repo's `.gitignore` is the enforcement point. If you introduce a new
secret-bearing file location, **add it to `.gitignore` before creating the file**.

## Rules for commits

Before every commit involving new or changed files:

1. Scan the diff for strings that look like tokens (length > 20, mix of alphanumerics, common prefixes like `sk-`, `gsk_`, `ghp_`, or provider-specific formats like the Twitter key above).
2. If anything matches, **stop**. Do not include in the commit. Rotate the secret if it was real.
3. `git diff --cached` is your friend.

## Rules for AI agents

- **Load keys programmatically, never echo them.** Tests load keys from `.env` / process env — that is expected. Do not echo or paste raw values into responses or logs. When you must confirm a key, confirm by presence only (a bool), never by value.
- **Never echo, print, or paste a secret value** into your response.
- **Never commit a file that contains a secret** even if the user asks. Push back, rotate, continue.
- **When a new secret is needed, instruct the user to add it to `.env` (local) and the Render service's env vars (`render.yaml`)** — never accept secrets pasted into chat or committed to source.

## If a secret leaks

1. Rotate the secret immediately at the provider.
2. Update `.env` and the Render env var with the new value.
3. Purge from git history if committed: `git filter-repo` or `bfg`. Force-push requires explicit user approval — per `harness/rules/git.md`, this repo never force-pushes without it, and never to `main`.
4. Note the incident in the commit message without repeating the leaked value.
