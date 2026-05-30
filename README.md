# Qwen Workshop

### Interface Preview
<p align="center">
  <img src="Screenshot (216).png" width="45%" alt="Qwen Workshop Dashboard" />
  <img src="Screenshot (217).png" width="45%" alt="Model Selection" />
</p>
<p align="center">
  <img src="Screenshot (218).png" width="45%" alt="Agent Checklist" />
  <img src="Screenshot (219).png" width="45%" alt="Permission Settings" />
</p>

Qwen Workshop is a Qwen-native desktop agent workspace. It is designed as a modern dark GUI home for Qwen Code: open a folder, chat with Qwen, let it edit locally, review activity, and preview running apps in one place.

## Why This Exists

Qwen Workshop is an experimental Codex-style desktop GUI built exclusively for Alibaba's Qwen ecosystem. The goal is to give Qwen users a first-class local developer workspace: secure key setup, project-aware chat, local file editing, live previews, terminal/check tools, session restore, attachments, voice input, usage tracking, and polished diagnostics in one app.

## Quick Test Drive

```bash
npm install
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run dev
```

Then:

1. Open a local test project folder.
2. Add a DashScope or Coding Plan key inside the app.
3. Keep the default Singapore Model Studio endpoint unless your Qwen account uses another region.
4. Ask Qwen to inspect, edit, build, or create a small browser app.
5. Start the live preview to watch generated files run locally.

API keys are stored in Electron user data through `safeStorage`. They are not stored in this repository and should not be committed.

## Current MVP

- Electron + React + TypeScript desktop shell
- Qwen-only model catalog
- First-run onboarding wizard for model, endpoint, API keys, permissions, and first workspace
- Preferences dialog for model, endpoint, permissions, usage limits, preview command, backups, and setup
- Secure local API key storage through Electron safeStorage
- Local workspace picker and file explorer
- In-app file search with content snippets
- Built-in file viewer/editor with save, reload, copy, and open-external controls
- Project memory saved per workspace and injected into future Qwen runs
- Before-run file checkpoints with conservative restore
- Git changed-file summary
- Qwen Code SDK service bridge
- Permission modes: plan, default, auto-edit, yolo
- Live preview server manager
- Preview command override with auto-detect, static server, and common dev-server presets
- Chat attachments for local files, screenshots, audio, and documents
- Browser speech dictation when Chromium speech recognition is available
- Markdown-style chat rendering with headings, lists, links, inline code, fenced code blocks, and copy-code buttons
- Editable prompt library chips for common and custom Qwen tasks
- Local estimated usage meter with a configurable soft limit
- Qwen run lifecycle card with elapsed time, idle time, last activity, stalled-run warning, stop, and retry-last-prompt controls
- Friendlier Qwen error classification for API keys, quota/rate limits, CLI launch failures, permission denials, network failures, and context limits
- Session restore with recent projects, active transcripts, saved chat history, and preview state
- Versioned settings and session storage that can read older raw JSON files
- New-chat reset and Markdown transcript export
- Per-workspace chat history panel for returning to archived sessions
- Non-secret settings backup export/import
- Full session backup export/import for recent workspaces, active transcripts, chat history, command history, plans, and preview state
- Agent checklist panel for Qwen planning/todo updates
- Git-backed change review drawer
- Workspace check runner for detected test, build, lint, and typecheck scripts
- Built-in workspace terminal with command presets, detected check shortcuts, output history, and copy controls
- Command palette for quick workspace, chat, preview, settings, git, terminal, and check actions
- Model capability badges for thinking, Coding Plan, vision, file input, speed, and preview status
- Workspace dashboard for recent activity, changed files, checks, checkpoints, usage, and preview state
- Right-rail view tabs for focused Overview, Build, Runtime, Preview, and All work modes
- Activity timeline for Qwen runs, tool activity, command results, preview status, and errors
- Toast notifications for important run, preview, settings, export, and failure events
- In-app reliability diagnostics for app mode, Electron/Node versions, storage paths, persisted files, and runtime logs
- Searchable in-app owner's manual backed by `docs/OWNERS_MANUAL.md`
- Compact project diagnostics for bridge, model, endpoint, preview, keys, and usage status
- Interactive approval prompt for Qwen tool and command requests
- Focused smoke tests for backups, preview command detection, preferences rendering, and chat code-block parsing
- Dark grey, red, black, and white interface

## Requirements

- Node.js 20 or newer
- `@qwen-code/sdk` provides the bundled Qwen Code CLI used by the app
- A Model Studio API key or Alibaba Cloud Coding Plan API key

PowerShell may block npm `.ps1` shims on Windows. Use `npm.cmd` if that happens.

## Build Checks

```bash
npm run typecheck
npm test
npm run build
npm run smoke:desktop
```

For a fuller release-confidence pass, run:

```bash
npm run check:release
```

## Desktop Builds

For a local runnable Windows desktop build:

```bash
npm run pack
npm run smoke:packaged
```

The unpacked app is created at:

```text
release/win-unpacked/Qwen Workshop.exe
```

For distributable Windows artifacts:

```bash
npm run dist:win
```

This produces:

```text
release/Qwen-Workshop-0.1.0-x64-Setup.exe
release/Qwen-Workshop-0.1.0-x64-Portable.exe
```

For the full package confidence pass:

```bash
npm run check:package
```

If you change the app icon source PNG, regenerate the Windows `.ico` before packaging:

```bash
npm run icons:win
```

Current Windows builds are unsigned development artifacts, so Windows SmartScreen may warn until a trusted code-signing certificate or Microsoft Store packaging path is added.

## Notes

The first prototype defaults to `qwen3.7-max` with the Singapore Model Studio endpoint. If your Alibaba Cloud account has not enabled that model, switch to another Qwen model in the settings bar.

The owner's manual lives at `docs/OWNERS_MANUAL.md` and is also available inside the app from the help button, F1, or the command palette.


