# Chat Marketplace

这是 Chat 应用使用的社区市场仓库。

本仓库当前主要发布面向任务的技能包，后续也可以维护 MCP、模型服务商、工具适配包等市场内容。Chat 应用可以从这里发现社区能力，用户可以安装技能，并按需要配置模型服务、内置工具和 MCP。

## 产品模型

市场不是单一技能列表。市场应该承载 Chat 可发现、可安装、可配置的能力包。

当前第一类能力包是技能。技能不是工具运行时。技能是一个任务入口，它声明：

- 这个技能解决什么任务
- 使用什么提示词或系统指令
- 需要什么模型能力
- 可以使用哪些内置工具或 MCP 服务
- 运行前需要用户配置什么

工具能力单独配置：

- 内置工具是模型服务商提供的能力，例如 OpenAI Web Search。
- MCP 是外部工具运行时，例如 Brave Search、Fetch、Git、Filesystem。
- OpenAPI 导入是 HTTP API 描述，后续可以适配成 MCP 工具。

后续市场可以继续扩展：

- MCP：外部工具运行时或连接器
- Model Provider：模型服务商接入说明和能力声明
- Tool Adapter：由 OpenAPI 或其他协议适配出来的工具包
- Finance / Trading：策略交易、模拟执行和券商连接器

## 仓库结构

```txt
skills/
  cn/                  中文技能包
  en/                  英文技能包
mcp/
  servers/             MCP 服务器包
  index.json           由脚本生成的 MCP 轻量索引
  packages.json        由脚本生成的 MCP 服务器包列表
providers/             预留：模型服务商发布包
tools/                 预留：工具适配包
schemas/
  skill.schema.json    单个技能包的 JSON Schema
  mcp-server.schema.json 单个 MCP 服务器包的 JSON Schema
templates/
  skill.json           技能包起始模板
  mcp-server.json      MCP 服务器包起始模板
docs/
  SKILL_SPEC.md        技能编写与审核规则
  PUBLISH_FLOW.md      技能发布、上线、配置与使用流程
index.json             由脚本生成的技能轻量索引，作为发布清单提交
packages.json          由脚本生成的技能包列表，供 Chat 当前版本加载
scripts/
  build.mjs            校验并生成技能和 MCP 发布清单
```

当前 `scripts/build.mjs` 处理 `skills/` 下的技能包和 `mcp/servers/` 下的 MCP 服务器包。`providers/`、`tools/` 是市场扩展入口，后续应分别增加对应 schema 和发布清单生成逻辑。

## 添加技能

1. 复制 `templates/skill.json` 到 `skills/<lang>/<skill-id>.json`。
2. 填写任务定义、模型偏好、工具、MCP 需求和开场白。
3. 运行：

```bash
node scripts/build.mjs
```

4. 提交 Pull Request。

## 发布流程

技能作者通过 Pull Request 发布技能包。

维护者重点审核：

- 技能名称是否清晰、聚焦
- 描述是否能让用户判断使用场景
- 是否包含隐藏密钥或私有接口
- 是否存在不安全的提示词注入
- 模型和工具需求是否明确
- MCP 依赖是否显式声明，而不是隐式假设

合并后，Chat 应用当前加载技能包地址：

```txt
https://raw.githubusercontent.com/yeying-community/marketplace/main/packages.json
```

Chat 应用当前加载 MCP 服务器包地址：

```txt
https://raw.githubusercontent.com/yeying-community/marketplace/main/mcp/packages.json
```

社区维护的 MCP 源码包位于 `mcp/packages/`。如果 MCP 声明通过 `npx -y @yeying-community/<package>` 启动，需要通过 GitHub Actions 发布到 npm。仓库 secret 使用 `npm_token`，workflow 是 `Publish MCP Packages`。

## Chat 集成

Chat 应用当前应该加载：

- 本地内置技能包列表：`/skill-packages.json`
- 远程社区技能包列表：本仓库的 raw `packages.json`
- 远程 MCP 服务器包列表：本仓库的 raw `mcp/packages.json`

加载后，Chat 可以在发现页展示远程技能。用户点击安装时，应用通过 `skillPackageToSkill()` 把技能包转换成本地技能，并保存到用户的技能库。

完整流程见：`docs/PUBLISH_FLOW.md`。
