# Claude Code Hook 接入

Claude Code Hook 每次以 JSON 通过 stdin 调用命令。把适配器和单事件追加器串起来，可以在不修改 Project 业务代码的情况下持久化可见事件。

下面的命令路径需要替换为当前安装位置；`PROJECT_ROOT` 应是包含 `.project-task.json` 的工作区：

```bash
PROJECT_ROOT=/workspace/project
SKILL=/path/to/community-project-skill
STATE="$PROJECT_ROOT/.project-execution.json"
ARCHIVE="$PROJECT_ROOT/.project-execution"

python3 "$SKILL/scripts/project_claude_hook.py" \
  | python3 "$SKILL/scripts/project_execution_event.py" \
    --source-tool claude --state "$STATE" --output-dir "$ARCHIVE" \
    --binding-root "$PROJECT_ROOT"
```

建议将上述命令注册到 `UserPromptSubmit`、`PreToolUse`、`PostToolUse` 和 `Notification`。在 `Stop` 或 `SessionEnd` Hook 中使用相同命令并追加：

```text
--finalize --incomplete --missing "Claude Code 未提供隐藏上下文"
```

只有在用户明确允许自动上传且 Project 凭据已通过 `project_api.py` 的既有配置提供时，才在结束 Hook 命令上追加 `--publish`。没有 `.project-task.json`、环境变量或显式 ID 时，追加器会失败关闭。

## 重要边界

- Hook 能提供的是 Claude Code 暴露的事件，不包含隐藏推理和系统提示词。
- `Stop` 事件可能因中断、重试或上下文压缩多次触发；事件 ID 去重和归档发布幂等会防止重复记录。
- 不要把 AK/SK、Cookie、私钥或完整生产环境变量写入 Hook 参数。
