# YeYing Tester Skill

[简体中文](README_CN.md)

Use `$yeying-tester` to assess YeYing Tester release evidence, review E2E coverage and configuration, investigate test batches, measure stability, and design cases using the included E2E standard.

### Configuration

Use a Tester release that supports `/api/v1/analysis/`. Sign in with the administrator's wallet and issue a read-only token in **Skill 分析 Token**. Create `~/.config/yeying/tester.json` with the Tester origin and issued token. Set its permissions with `chmod 600 ~/.config/yeying/tester.json`.

```json
{
  "url": "https://tester.tidukongjian.com",
  "token": "<issued read-only token>"
}
```

Each invocation reads the current settings. Loopback origins support HTTP. Existing scripts and CI can supply both `YEYING_TESTER_URL` and `YEYING_TESTER_TOKEN`. When both variables are nonempty they take precedence. Otherwise the script reads both settings from the file.

From the skill directory, verify access with `python3 scripts/tester.py overview`. The administrator can revoke the token in the same console panel. Report links are accessible through an authorized wallet session.
