# MCP Packages

这里用于维护 Chat 可发现、可安装、可配置的 MCP 服务器包。

## 目录

```txt
mcp/
  servers/        MCP 服务器源码包
  index.json      自动生成的 MCP 轻量索引
  packages.json   自动生成的 MCP 服务器包列表，供 Chat 加载
```

## 添加 MCP

1. 复制 `templates/mcp-server.json` 到 `mcp/servers/<mcp-id>.json`。
2. 填写名称、描述、仓库地址、启动命令、参数和配置项。
3. 运行 `npm run check`。
4. 提交 MCP 源码包以及生成后的 `mcp/index.json`、`mcp/packages.json`。

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
