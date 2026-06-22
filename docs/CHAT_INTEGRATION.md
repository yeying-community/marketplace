# Chat 集成

本仓库是 Chat Marketplace。它当前发布技能包，后续可以扩展 MCP、模型服务商和工具适配包。

## 远程技能包列表地址

正式环境当前使用：

```txt
https://raw.githubusercontent.com/yeying-community/marketplace/main/packages.json
```

本地开发可以在仓库根目录启动静态服务：

```bash
python3 -m http.server 3090
```

然后在 Chat 本地开发时覆盖市场地址：

```bash
MARKETPLACE_SKILL_PACKAGES_URL=http://localhost:3090/packages.json \
MARKETPLACE_MCP_PACKAGES_URL=http://localhost:3090/mcp/packages.json \
npm run dev
```

不建议在文档中使用本地绝对路径。开发者应该从社区仓库 clone 后，在自己的本地目录启动服务。

## 加载策略

Chat 应用应该加载三类技能：

1. 本地内置技能：`/skill-packages.json`
2. 远程社区技能：本仓库的 `packages.json`
3. 用户已安装技能：本地 skill store

合并时按 `id + lang` 去重。

## 安装策略

用户点击 `Install` 后：

1. 读取 `SkillPackage`
2. 使用 `skillPackageToSkill()` 转换成本地技能
3. 保存到 skill store
4. 解析运行状态

如果依赖缺失，应该显示 `needs_config`，不要让安装失败。

## 依赖映射

内置工具：

```json
{
  "id": "web_search",
  "required": false
}
```

MCP：

```json
{
  "id": "fetch",
  "required": false
}
```

模型：

```json
{
  "model": {
    "candidates": []
  }
}
```
