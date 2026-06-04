# AGENTS.md

## Project overview

`mobile-app-comparison` is a placeholder repository (README only) for a future project comparing mobile app frameworks. There is no application source, package manifests, Docker setup, or CI configuration yet.

## Cursor Cloud specific instructions

### Current repository state

- **Tracked files:** `README.md` only
- **No install step:** There is no `package.json`, lockfile, `Makefile`, `requirements.txt`, or `.devcontainer` config. The VM update script is a no-op until dependencies are added.
- **No services to start:** Nothing listens on a port; no database or Docker Compose stack exists.

### When code is added

After the first framework sample or tooling lands in the repo, update this section with:

1. **Dependency install** — document the real command (e.g. `pnpm install`, `flutter pub get`) and add it to the VM update script via `SetupVmEnvironment`.
2. **Dev server** — how to run each sample app in development mode (not production build).
3. **Lint / test** — exact commands from `package.json` scripts, `Makefile`, or CI config.
4. **Gotchas** — emulator requirements, env vars, monorepo roots, or non-obvious startup order.

### Standard commands (not applicable yet)

| Task | Command |
|------|---------|
| Install | N/A |
| Lint | N/A |
| Test | N/A |
| Run | N/A |

### Git

- Default branch: `main`
- Cloud agent branches should use the `cursor/<name>-f46e` naming pattern per cloud task instructions.
