## Summary

- 

## Scope

- [ ] Documentation only
- [ ] Tests / validation scripts
- [ ] n8n workflow JSON
- [ ] Provider adapter
- [ ] Safety boundary
- [ ] Other

## Validation

- [ ] `npm test`
- [ ] `npm run workflow:validate:all`
- [ ] `npm run import:check`
- [ ] Manual n8n import check, if workflow JSON changed

## Safety checklist

- [ ] No real API keys, webhook secrets, or credentials are committed.
- [ ] Real provider behavior is not claimed unless implemented and verified.
- [ ] Workflow JSON execution logic changes are explained, if any.
- [ ] New external actions are bounded by approval, limits, or dry-run behavior.

## Notes for reviewers

Add any migration notes, screenshots, or open questions.
