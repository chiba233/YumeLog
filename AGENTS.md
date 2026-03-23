# Repository Instructions

For any business code change in this repository:

1. Always run lint after business code changes. Default command: `pnpm run lint`.
2. Lint errors must be fixed before the task is complete.
3. Always run at least one test command after business code changes. Default command: `pnpm run verify`.
4. Use the smallest relevant verification:
   - normal daily changes: run `pnpm run verify` (`lint` + `test:dsl`)
   - only run `pnpm run build` when the change affects SSG, SEO, routing, SSR output, or the build pipeline itself
   - if both default regression coverage and SSG/build coverage are needed, run `pnpm run verify:build`
   - if dependency versions are updated, treat as build-impacting change and run `pnpm run verify:build`
5. Final responses must include:
   - which lint command was run
   - which test/build command was run
   - whether each passed
6. Do not skip required verification for business code changes unless blocked.

---

## Agent-specific coding rules

1. All AI agents are prohibited from using `as any` assertions in committed changes.
2. Avoid `any` unless there is a clear boundary reason and the narrower type options were exhausted first.
3. When type errors appear, prefer fixing types, narrowing unions, or adding type guards instead of bypassing the
   checker.

4. Do NOT modify unit test code by default.
5. If tests fail, always fix production code first.

6. If the agent believes a unit test is incorrect or outdated:
   - MUST explicitly explain why the test is wrong
   - MUST explain what the correct behavior should be
   - MUST request user approval BEFORE modifying the test

7. Modifying tests without explicit user approval is strictly prohibited.

---

## Verification integrity rules

1. The agent MUST NOT fabricate or simulate command results.
2. If commands (lint/test/build) are not actually executed:
   - MUST state "verification not executed"
3. If the result is uncertain:
   - MUST state "verification uncertain"
4. Claiming success without real verification is considered a violation.

---

## Failure handling rules

If lint or tests fail, the agent MUST:

1. Explain the root cause (not guesswork)
2. Identify the exact production code responsible
3. Provide a fix in production code

If the issue cannot be resolved without changing expected behavior:

→ MUST explicitly state:
"Test behavior may be outdated, confirmation required before modifying tests"

---

## Semantic safety rules

The agent MUST NOT:

1. Change logic just to make tests pass
2. Replace meaningful values with fallbacks such as:
   - ""
   - []
   - null
     to bypass failures
3. Introduce silent behavior changes

If behavior changes:

→ MUST explicitly explain what changed and why

---

## Non-business-code changes

1. If the change only touches non-business files such as `README.md`, `AGENTS.md`, or other `.md` files, skip lint and
   test/build verification unless the update depends on re-running a command and reporting its current result.
2. Pure documentation or other non-business-code changes do not require lint or test/build verification under this rule.
3. For non-business-code changes, state in the final response that verification was intentionally skipped under this
   rule.