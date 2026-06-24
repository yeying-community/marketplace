# Broker Tool 契约

本文定义策略交易 skill 需要的 broker connector 最小能力。生产目标是接入真实券商；模拟券商只用于开发验证和演练，不应被包装成生产实盘能力。

## 连接器类型

- `live broker`：真实券商或交易柜台连接器，例如 QMT / miniQMT / PTrade / IBKR / Futu。可以真实下单，必须启用风控、确认和审计。
- `paper broker`：模拟交易连接器，只能验证策略、工具链路和交互流程，不能真实下单。
- `data provider`：行情、财务、公告、选股等数据源，例如同花顺 QuantAPI / iFinD。它不是 broker，不能承担下单职责。当前 marketplace 中对应 `ifind-data`。

## 工具列表

### `dry_run_order`

校验订单但不提交。

输入：

- `symbol`：标的代码
- `side`：`buy` 或 `sell`
- `quantity`：数量
- `orderType`：`market` 或 `limit`
- `limitPrice`：限价单价格，可选

输出：

- `accepted`：是否通过校验
- `reason`：拒绝原因，可选
- `estimatedCashImpact`：预计资金影响
- `estimatedPositionImpact`：预计持仓影响

### `place_order`

提交订单。实盘 connector 必须要求上游显式确认后才允许执行。

输入：

- `symbol`
- `side`
- `quantity`
- `orderType`
- `limitPrice`
- `clientOrderId`

输出：

- `orderId`
- `status`
- `submittedAt`

### `cancel_order`

撤销未完成订单。

输入：

- `orderId`

输出：

- `orderId`
- `status`

### `query_orders`

查询订单。

输入：

- `status`：可选
- `symbol`：可选

输出：

- `orders`

### `query_positions`

查询持仓。

输入：

- `symbol`：可选

输出：

- `positions`

### `query_cash`

查询资金。

输出：

- `cash`
- `currency`
- `available`

## 安全规则

- 默认只允许 `dry_run_order`，除非用户显式启用真实下单。
- 实盘 `place_order` 必须依赖用户显式确认。
- 实盘 connector 必须暴露是否启用真实下单的配置，例如 `enableLiveTrading`。
- connector 必须返回订单 ID 和状态，不能只返回成功文本。
- connector 必须暴露资金、持仓和订单查询能力，便于 skill 做执行前后校验。
- connector 不应把密钥写进 marketplace 包；密钥只能由用户运行时配置。
