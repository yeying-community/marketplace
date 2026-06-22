# 策略交易 Skill 方案

## 目标

把交易想法沉淀成一个可安装、可配置、可持续迭代的 skill。目标不是只做模拟盘，而是形成“数据源 + 策略 + 风控 + 真实券商 MCP”的生产闭环。模拟券商只用于开发验证和演练，不能作为最终生产能力。

## 角色分工

- `skill`：负责把用户输入变成策略定义、风控参数、执行计划和结果汇总。
- `marketplace`：负责发布 skill 包、真实 broker MCP 包、模拟测试 MCP 包和数据源包。
- `Chat`：负责安装、启用、配置、状态展示和会话入口。

## 第一版范围

- 支持策略描述、仓位约束、止损止盈、频率、标的范围、执行模式。
- 支持连接真实券商 MCP 后进行受控实盘执行。
- 支持连接同花顺 iFinD / QuantAPI 数据 MCP，获取行情、基本面、公告、选股等数据。
- 默认先做执行前检查和 `dry_run_order`，再由用户确认是否实盘下单。
- 不伪造实盘结果；没有真实 broker connector 时，只给出待执行计划和缺失项。
- `ifind-data` 是必需数据源连接器，不负责下单。
- `qmt-broker` 是 A 股/ETF/可转债实盘连接器入口，需要用户开通券商 QMT/miniQMT 和 xtquant 环境。
- `paper-broker` 只是可选测试 MCP，用于开发验证和模拟演练，不能代表生产实盘。

## 后续扩展

### 1. Broker MCP

真实 broker connector 至少要支持：

- `place_order`
- `cancel_order`
- `query_orders`
- `query_positions`
- `query_cash`
- `dry_run_order`

最小工具契约见：`docs/BROKER_MCP_CONTRACT.md`。

第一条数据通道先落 `ifind-data`：

- 用户在同花顺 QuantAPI / iFinD 获取 `refresh_token`。
- Chat 启用 `ifind-data` MCP，并配置 `IFIND_REFRESH_TOKEN`。
- MCP 自动换取 `access_token`，并调用 `high_frequency`、`real_time_quotation`、`cmd_history_quotation`、`basic_data_service` 等 HTTP API。
- 数据 MCP 只能用于研究、信号和执行前校验，不能下单。

第一条生产交易通道先按 A 股常见路径落 `qmt-broker`：

- 用户本地安装并登录 MiniQMT。
- Python 环境安装并验证 `xtquant`。
- Chat 启用 `qmt-broker` MCP，并配置 `QMT_USERDATA_PATH`、`QMT_ACCOUNT_ID`、`QMT_ENABLE_LIVE_TRADING`。
- 实盘 `place_order` 必须同时满足 `enableLiveTrading=true` 和工具调用 `confirmed=true`。

### 2. 策略模板

把常用策略沉淀成 starter：

- 趋势跟随
- 均值回归
- 网格 / 分批
- 事件驱动
- 风控止损

### 3. 安全约束

实盘必须显式确认，并满足：

- 最大仓位
- 单笔上限
- 日亏损上限
- 频率限制
- kill switch

## Chat 侧建议

- 技能页突出 `策略交易`，避免和普通聊天混淆。
- 进入技能后默认展示策略配置和风险约束，而不是让用户先猜应该怎么说。
- broker connector 未配置时，界面必须显示“仅可生成计划，不能实盘执行”。
- 如果只配置了 `paper-broker`，界面必须显示“模拟演练，不会真实下单”。
- 如果配置了 `qmt-broker`，界面必须显示实盘风险提示、当前账户、下单确认要求和连接状态。
