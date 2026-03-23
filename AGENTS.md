# Repository Instructions

For any code change in this repository:

1. Always run lint after code changes. Default command: `pnpm run lint`.
2. Lint errors must be fixed before the task is complete.
3. Always run at least one test command after code changes. Default command: `pnpm run verify`.
4. Use the smallest relevant verification:
    - normal daily changes: run `pnpm run verify` (`lint` + `test:dsl`)
    - only run `pnpm run build` when the change affects SSG, SEO, routing, SSR output, or the build pipeline itself
    - if both default regression coverage and SSG/build coverage are needed, run `pnpm run verify:build`
5. Final responses must include:
    - which lint command was run
    - which test/build command was run
    - whether each passed
6. Do not skip verification unless blocked.
