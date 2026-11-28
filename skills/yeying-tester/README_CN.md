# 夜莺 Tester 技能

[English](README.md)

使用 `$yeying-tester` 汇总 Tester 发布质量、审查 E2E 用例和配置、排查运行批次、分析稳定性，以及按随附规范设计用例。

### 配置

使用支持 `/api/v1/analysis/` 的 Tester 版本。用管理员钱包登录 Tester，在 **Skill 分析 Token** 中生成只读 Token。创建 `~/.config/yeying/tester.json`，填入 Tester 站点和生成的 Token，并用 `chmod 600 ~/.config/yeying/tester.json` 限制文件权限。

```json
{
  "url": "https://tester.tidukongjian.com",
  "token": "<管理员生成的只读 Token>"
}
```

每次运行命令都会重新读取配置。本机回环地址支持 HTTP。已有脚本和 CI 可继续同时设置 `YEYING_TESTER_URL` 和 `YEYING_TESTER_TOKEN`。两个变量都有值时优先使用这对环境变量，否则从文件读取站点和 Token。

在技能目录执行 `python3 scripts/tester.py overview` 验证访问。管理员可在相同面板撤销 Token。报告链接使用已授权的钱包会话打开。
