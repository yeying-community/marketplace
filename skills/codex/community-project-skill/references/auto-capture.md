# 自动会话采集边界与事件协议

`community-project-skill` 不直接读取 Codex、Claude 或其他 Agent 的内部会话数据库。客户端必须通过 hook、事件流或 wrapper 输出可公开给宿主的 JSONL 事件，再交给本 Skill 的采集桥接器。

这不是 Project 配置，而是客户端适配层的统一输入协议。适配器只负责把原生事件转换为以下字段，不能上传 AK/SK、Cookie、私钥或隐藏推理内容。

## 事件格式

每行一个 JSON 对象：

```json
{
  "event_id": "evt-001",
  "type": "tool_result",
  "timestamp": "2026-09-29T10:00:00Z",
  "session_id": "client-session-id",
  "role": "tool",
  "content": {"exit_code": 0, "stdout": "done"},
  "metadata": {"tool": "exec_command"}
}
```

`type` 建议使用：`session_start`、`user_message`、`assistant_message`、`tool_call`、`tool_result`、`attachment`、`decision`、`session_end`、`session_error`。`role` 可省略，由桥接器按 `type` 推断。

## 桥接器

```bash
cat events.jsonl | python3 scripts/project_execution_capture.py \
  --project-id 8 --task-id 123 --source-tool claude --model claude-sonnet \
  --state /tmp/execution.json --output-dir /tmp/execution \
  --incomplete --missing "客户端未提供隐藏上下文"
```

采集桥接器会：

1. 创建或恢复本地执行状态；
2. 按 `event_id` 去重，支持进程中断后重放；
3. 递归脱敏后写入状态文件；
4. 在输入结束时生成 Markdown、JSON 和 manifest；
5. 可选使用 `--publish` 上传到目标任务。

## 完整性边界

“完整会话”只表示客户端实际提供的公开事件。系统提示词、隐藏推理、平台内部 tool trace 和未暴露的附件不得猜测或伪造。客户端不能提供这些内容时，必须使用 `--incomplete --missing` 标注原因。

## 适配器职责

- Claude：将 Claude Code hook 的 stdin 转为一行 JSONL：

  ```bash
  python3 scripts/project_claude_hook.py >> /tmp/project-events.jsonl
  ```

- Codex：将 Codex 或其他 Agent 的 JSONL 事件标准化：

  ```bash
  cat codex-events.jsonl | python3 scripts/project_codex_events.py >> /tmp/project-events.jsonl
  ```

- 其他 Agent：实现同一 JSONL 协议即可接入。

任务 ID、Project 身份和用户授权仍必须由宿主提供；没有可靠任务绑定时，桥接器不得自动上传。
