# 夜莺 Tester 技能

[English](README.md)

使用 `$yeying-tester` 汇总 Tester 发布质量、审查 E2E 用例和配置、排查运行批次、分析稳定性，以及按随附规范设计用例。

### 配置

使用支持 `/api/v1/analysis/` 的 Tester 版本。管理员用钱包登录，在 **Skill 分析 Token** 生成有有效期的凭据。将以下变量配置到 Agent 的运行环境或凭据存储。

| 环境变量 | 值 |
| --- | --- |
| `YEYING_TESTER_URL` | Tester 的 HTTPS 站点地址。本地回环地址支持 HTTP。 |
| `YEYING_TESTER_TOKEN` | 管理员生成时显示的只读 Token。 |

两个变量都需要配置，脚本直接读取环境变量。运行依赖为 Python 3 标准库。此技能无独立配置文件。

在技能目录执行 `python3 scripts/tester.py overview` 验证访问。管理员可在相同面板撤销 Token。报告链接使用已授权的钱包会话打开。
