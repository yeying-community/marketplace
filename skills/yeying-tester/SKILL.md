---
name: yeying-tester
description: Analyze YeYing Tester quality, project E2E coverage and configuration, run failures, and test stability. Use when assessing release evidence, diagnosing an E2E batch, or designing and reviewing Tester end-to-end cases.
---

Use the bundled `scripts/tester.py` with the Tester origin and read-only token in `~/.config/yeying/tester.json`. A wallet-authenticated Tester administrator issues the expiring read-only token from **Skill 分析 Token**. Refer to [configuration](README_CN.md) when credentials or the server release need setup. Keep tokens out of analysis output.

| Request | Command |
| --- | --- |
| Overall release quality and project status | `python3 scripts/tester.py overview` |
| Project case catalog and current configuration | `python3 scripts/tester.py project <project>` |
| Recent project and attributable full-suite runs | `python3 scripts/tester.py runs <project> --limit 10` |
| Batch configuration, outcomes, and attempts | `python3 scripts/tester.py run <project> <scope> <run>` |
| Historical stability by run mode and evidence type | `python3 scripts/tester.py stability <project> --limit 30` |

Use paths relative to this skill directory. Copy `scope` and `run` from the run list. Use `--case-id` on `run` or `stability` to focus on a documented case. Follow `next_cursor` with `--before` when the requested sample spans pages. See [analysis guidance](references/analysis.md) for interpreting the evidence and [E2E case standard](references/e2e-case-standard.md) when designing or reviewing cases.

Connect findings to a project, case ID or spec location, run ID, mode, and available commits. Cite links to the reports when present. Keep missing evidence visible. Classify an unexpected result as a candidate product regression, test defect, environment/dependency problem, or unresolved, and explain the evidence for the classification. The token supports the analysis API's read operations. Report links open in a Tester browser session.
