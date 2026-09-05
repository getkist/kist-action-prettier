# AGENTS.md — kist-action-prettier

`@getkist/action-prettier` is a **kist action plugin**: an npm package whose
default export is an `ActionPlugin` descriptor that kist core loads to register
actions usable from a `kist.yml` pipeline. Prettier code formatting action for
kist.

It peer-depends on `kist` (`>=0.1.58`) — kist core is the host, never a
bundled dependency.

## Actions contributed

| Action (the `action:` key in `kist.yml`) | What it does |
| --- | --- |
| `PrettierAction` | Formats files with Prettier as a pipeline step. |

Runtime dependencies: `prettier`.

## Layout

| Path | What lives there |
| --- | --- |
| `src/index.ts` | Package entry: re-exports the action(s) and `default`-exports the `ActionPlugin` descriptor |
| `src/types/Action.ts` | Local copy of the abstract `Action` base class and `ActionPlugin` interface, mirroring kist core's contract |
| `src/actions/<Name>/` | One directory per action: `<Name>.ts` implementation, `index.ts` re-export |
| `tst/unit`, `tst/integration` | Jest tests, split by kind and by npm script |

`dist/` and `coverage/` are build output.

## Commands

```bash
npm run build          # tsup → dist/{index.mjs,index.cjs,index.d.ts}
npm run build:watch
npm test               # jest (needs NODE_OPTIONS='--experimental-vm-modules')
npm run test:unit
npm run test:integration
npm run test:coverage
npm run lint           # eslint 'src/**/*.ts'
npm run lint:fix
npm run format         # prettier --write 'src/**/*.ts'
npm run clean
```

Every test script sets `NODE_OPTIONS='--experimental-vm-modules'`. Running
`npx jest` directly without it fails on ESM module mocking — use the npm
scripts.

## Drift from the shared template

Plugin repos are created by copying `kist-action-master` and have since
diverged. Relative to that template, this repo has:

- no `doc/` directory — the README is the only prose documentation
- no `example.yml` beside the action(s) — usage examples live in the README
  only

That is the current state, not a bug list — but do not assume a file exists
here because a sibling plugin has it.

## Conventions

- **ESM-first, dual-published.** Source is ESM; `tsup` emits both `.mjs` and
  `.cjs` with types. Relative imports carry an explicit `.js` extension in
  `.ts` source; Jest maps them back via `moduleNameMapper`.
- **Adding an action:** create `src/actions/<Name>/` with the implementation
  and
  an `index.ts`, export it from `src/index.ts`, add it to the map returned by
  `plugin.registerActions()`, write tests, and document it in `README.md`. The
  registry key is the class name.
- **Mock `kist` inline per test file** with
  `jest.unstable_mockModule("kist", () => {...})`. Do not add a static
  `__mocks__/kist.ts` — the shared template deliberately avoids it.
- **Coverage thresholds are enforced:** 70% global, 80% under `src/actions/`.
- `plugin.version` in `src/index.ts` is a *hand-maintained duplicate* of
  `package.json`'s version — kist surfaces it in plugin listings independently
  of npm metadata. Bump both together.
- Prettier (4-space, double quotes, `printWidth: 79`) and ESLint flat config;
  run the scripts rather than matching style by hand. Section banner comments
  (`// ===== Export =====`) are the house style.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`,
  `refactor:`) — see `CONTRIBUTING.md`.

## Repo-specific notes

- `prettier` is a runtime dependency, so the formatting version is pinned by
  this package rather than by the host project.

## Verifying against a real pipeline

The plugin contract is only really exercised by kist core loading the built
package. After a behaviour change:

```bash
npm run build
# then, from a project with a kist.yml that uses PrettierAction:
npx kist --config kist.yml --dry-run   # confirms the action resolves
npx kist --config kist.yml
```

`kist-action-test` (`@getkist/action-test`) depends on every plugin in the set
and is the cross-plugin integration surface.

## Related repos (siblings in this workspace)

`kist` (core engine + built-in actions), `kist-action-master` (scaffolding
template for a new plugin repo), `www-getkist-com` (docs — each plugin has a
page under `src/plugins/`).
