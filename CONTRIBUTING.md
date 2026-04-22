# Contributing to Project Flow

Thanks for your interest. Project Flow is an indie, beta-stage tool — contributions are welcome, but please keep things practical and focused.

## Before You Start

- Check [existing issues](https://github.com/adriangarcia/projectflow/issues) to avoid duplicating effort
- For significant changes, open an issue first to discuss the idea
- This is not a full-time maintained project — response time may vary

## How to Contribute

### Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- OS and version
- Steps to reproduce
- What you expected vs what happened
- Console errors if available (Ctrl+Shift+I in the app)

### Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Keep it focused on VFX workflow needs.

### Submitting code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/short-description`
3. Make your changes
4. Test in dev mode: `npm run dev`
5. Keep the diff minimal — one concern per PR
6. Open a pull request with a clear title and description

## Development Setup

```bash
git clone https://github.com/adriangarcia/projectflow.git
cd projectflow
npm install
npm run dev
```

## Code Style

- TypeScript everywhere in `src/`
- Functional React components with hooks
- Keep component files focused — one component per file
- CSS via Tailwind utilities + `globals.css` design tokens
- No new external dependencies without discussion

## What's in Scope

- Bug fixes
- Performance improvements
- Accessibility improvements
- Media pipeline stability
- Documentation improvements

## What's Out of Scope (for now)

- Full redesigns
- Cloud sync / accounts
- Mobile / web versions
- Switching to a different tech stack

---

*Created by Adrián García, 3D Artist*
