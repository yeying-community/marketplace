# YeYing Tester Skill

[简体中文](README_CN.md)

Use `$yeying-tester` to assess YeYing Tester release evidence, review E2E coverage and configuration, investigate test batches, measure stability, and design cases using the included E2E standard.

### Configuration

Use a Tester release that supports `/api/v1/analysis/`. Sign in with the administrator's wallet and issue an expiring credential in **Skill 分析 Token**. Set the following variables in the agent environment or secret store.

| Environment variable | Value |
| --- | --- |
| `YEYING_TESTER_URL` | Tester HTTPS origin. Loopback supports HTTP for local testing. |
| `YEYING_TESTER_TOKEN` | Read-only token shown when the administrator issues it. |

Both values are required. The Python 3 standard library is sufficient. The script reads these variables directly and uses no independent configuration file.

From the skill directory, verify access with `python3 scripts/tester.py overview`. The administrator can revoke the token in the same console panel. Report links are accessible through an authorized wallet session.
