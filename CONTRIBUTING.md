# Contributing Skills

## What To Submit

Submit task-focused skills that users can run in chat quickly.

Good examples:

- research a topic with web sources
- summarize a long article
- turn product notes into a PRD
- produce an image prompt
- review code changes
- prepare a community report

Avoid:

- vague "efficient assistant" personas
- skills that require hidden API keys
- skills that silently depend on private services
- copied prompts without license or attribution
- unsafe automation or credential collection

## Collecting Open Source Skills

When collecting skills from open source projects:

1. Verify the license permits reuse.
2. Keep attribution in `author`.
3. Rewrite vague prompts into task-focused instructions.
4. Declare required built-in tools and Tool Server services explicitly.
5. Remove secrets, private URLs, and local file paths.
6. Add at least two practical starters.
7. Run `npm run check`.

## Review Checklist

- The name is clear and focused.
- The description tells users when to use it.
- The instruction is specific enough to produce reliable output.
- Required tools are explicit.
- Optional tools are marked `required: false`.
- No secrets or private data are included.
- The skill can still work when optional Tool Server dependencies are not configured.

## Build Skill Package List

Run:

```bash
npm run build
```

This generates:

- `index.json`
- `packages.json`
- `tools/index.json`
- `tools/packages.json`

The chat app should consume `packages.json` and `tools/packages.json`.
