# Release Notes: V0.14 GitHub Presentation Polish

V0.14 is a presentation-focused milestone. It does not add new workflow runtime capability. Its purpose is to make the repository easier to evaluate from the GitHub landing page.

## Focus

- Compress the README first screen.
- Highlight the project value and safety model earlier.
- Add an architecture snapshot.
- Add a clear local demo path.
- Add milestone and release-note entry points.
- Reduce documentation sprawl through a clearer docs index.

## Safety boundary

V0.14 does not modify workflow JSON, does not call providers, does not connect to n8n runtime, and does not enable production execution.

## Suggested validation

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run demo:local
```
