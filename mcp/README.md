# MCP Packages

这里用于维护 Chat 可发现、可安装、可配置的 MCP 服务器包。

## 目录

```txt
mcp/
  servers/        MCP 服务器 marketplace 声明
  packages/       社区维护的 MCP 服务器源码包
  index.json      自动生成的 MCP 轻量索引
  packages.json   自动生成的 MCP 服务器包列表，供 Chat 加载
```

## 添加 MCP

1. 复制 `templates/mcp-server.json` 到 `mcp/servers/<mcp-id>.json`。
2. 填写名称、描述、仓库地址、启动命令、参数和配置项。
3. 如果 MCP 由社区维护，把源码放到 `mcp/packages/<mcp-id>-mcp/`。
4. 运行 `npm run check`。
5. 提交 MCP 声明、源码包以及生成后的 `mcp/index.json`、`mcp/packages.json`。

## 本地验证社区 MCP

发布前先在源码包目录验证：

```bash
cd mcp/packages/<mcp-id>-mcp
npm install
npm run check
npm pack --dry-run
```

如果 `mcp/servers/<mcp-id>.json` 使用 `npx -y <npm-package>` 启动，Chat 用户只有在 npm 包发布后才能直接启用。开发阶段不要把本地绝对路径写进 marketplace 声明；需要本地联调时，在 Chat 的本地 MCP 配置里临时覆盖启动命令。

Chat 当前加载地址：

```txt
https://raw.githubusercontent.com/yeying-community/marketplace/main/mcp/packages.json
```

每个 MCP 包应说明：

- 解决什么工具能力
- 运行方式：`stdio`、`http` 或 `sse`
- 需要哪些环境变量或本地命令
- 是否需要用户密钥
- 可被哪些技能依赖
- 安全边界和权限说明

MCP 包不应该包含用户密钥、私有地址或本地绝对路径。

## 真实交易 MCP

真实交易 MCP 不能通过模拟 MCP 改配置来实现，必须独立实现并连接真实券商或交易柜台。生产级交易 MCP 至少要做到：

- 默认禁止真实下单，只允许查询和 `dry_run_order`。
- 真实下单必须有显式配置开关，例如 `enableLiveTrading=true`。
- 每次 `place_order` 必须要求用户确认参数，例如 `confirmed=true`。
- 必须支持查资金、查持仓、查订单、撤单。
- 必须把券商账号、密钥、路径等敏感配置放在运行时配置里，不能写入 marketplace。
- 必须清楚标注交易范围，例如 A 股 QMT、港美股 Futu、全球市场 IBKR。

当前第一条真实交易通道是 `qmt-broker`，用于本地 MiniQMT / xtquant 环境。

## 数据源 MCP

数据源 MCP 只负责行情、基本面、公告、选股等数据，不能承担下单职责。当前第一条数据源通道是 `ifind-data`，用于接入同花顺 iFinD / QuantAPI HTTP API。

`ifind-data` 需要运行时配置：

- `IFIND_REFRESH_TOKEN`：用于换取 `access_token`。
- `IFIND_ACCESS_TOKEN`：可选，已有短期 token 时可直接使用。
- `IFIND_BASE_URL`：可选，默认 `https://quantapi.51ifind.com/api/v1`。

常用工具：

- `get_access_token`
- `query_history_quotes`
- `query_realtime_quotes`
- `query_high_frequency`
- `query_snapshot`
- `query_basic_data`
- `query_date_sequence`
- `query_data_pool`
- `query_reports`
- `smart_stock_picking`
- `get_trade_dates`
- `call_ifind_endpoint`
