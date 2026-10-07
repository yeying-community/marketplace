# Project 研发任务标准生命周期

`community-project-skill` 将 Project 任务作为唯一的任务事实源，将本地仓库作为代码事实源，将 GitHub PR 作为交付事实源。三者通过 `project_id`、`task_id`、执行 `executionId`、commit SHA 和 PR URL 互相引用。

## 阶段

阶段必须按顺序推进，不能跳过门禁：

| 阶段 | 必须形成的输入/输出 | 进入下一阶段的条件 |
| --- | --- | --- |
| `intake` | 用户请求、任务标题、范围初稿 | 任务已创建并绑定工作区 |
| `analysis` | 需求理解、现状证据、范围/非目标、约束和风险 | 分析记录已写入任务或生命周期文件 |
| `solution` | 至少一种可行方案、方案对比、推荐方案、验收标准、测试计划 | 方案记录已写入 |
| `approval` | 负责人确认、确认人和可追溯引用 | 方案确认已记录 |
| `implementation` | 修改文件、关键决策、实现过程 | 已完成获批方案的实现 |
| `verification` | 命令、结果、时间、环境、失败信息 | `passed=true`，且覆盖任务验收标准 |
| `delivery` | 分支、commit SHA、仓库、PR URL/编号 | PR 已创建或复用，状态和 CI 信息已记录 |
| `audit` | 执行归档、脱敏状态、缺失项、审计索引 | 归档已发布到任务附件并可复用 |
| `completed` | 最终结果、合并状态或明确阻塞 | PR、验证和归档记录完整 |

## 记录格式

在工作区创建生命周期状态：

```bash
python3 scripts/project_lifecycle.py bind \
  --project-id 8 --task-id 123 --workdir /path/to/repository \
  --config ~/.yeying/skills/project/config.toml
```

创建新任务并绑定：

```bash
python3 scripts/project_lifecycle.py create \
  --project-id 8 --name "实现某功能" --workdir /path/to/repository \
  --content-file /tmp/request.md
```

状态文件默认是工作区下的 `.project-lifecycle.json`，任务绑定文件是 `.project-task.json`。两个文件都不得写入 AK/SK，也不应提交到代码仓库。

每种产物使用一个 JSON 对象记录，并通过 SHA-256 幂等替换同一类型的旧版本：

```bash
python3 scripts/project_lifecycle.py record --state .project-lifecycle.json \
  --kind analysis --file /tmp/analysis.json --publish \
  --config ~/.yeying/skills/project/config.toml
python3 scripts/project_lifecycle.py record --state .project-lifecycle.json \
  --kind solution --file /tmp/solution.json --publish
```

建议字段：

- `analysis`：`understanding`、`in_scope`、`out_of_scope`、`evidence`、`constraints`、`risks`；
- `solution`：`options`、`comparison`、`recommendation`、`acceptance_criteria`、`test_plan`；
- `verification`：`commands`、`environment`、`passed`、`results`、`failures`；
- `pull_request`：`repository`、`branch`、`commit_sha`、`url`、`number`、`state`、`ci`、`review`、`merged_at`；
- `execution_archive`：`execution_id`、`manifest_sha256`、`complete`、`missing`、`published_at`。

负责人确认必须显式记录：

```bash
python3 scripts/project_lifecycle.py approve \
  --state .project-lifecycle.json --by "user-id-or-name" \
  --reference "Project 评论 ID 或会议记录链接"
```

阶段推进由门禁检查完成：

```bash
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to analysis
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to solution
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to approval
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to implementation
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to verification
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to delivery
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to audit
python3 scripts/project_lifecycle.py advance --state .project-lifecycle.json --to completed
```

`github-api-push` 负责把本地 commit 推到 GitHub、查找或创建 PR；完成后将同一组 `repository`、`branch`、`commit_sha` 和 `url` 写入 `pull_request` 产物。Project Skill 不复制 GitHub API，也不把“已提交本地 commit”误报为“已创建 PR”。

## 执行会话与审计

一次 AI 执行使用一个稳定的 `executionId`。执行归档可通过 `--lifecycle-file` 关联状态快照：

```bash
python3 scripts/project_execution_archive.py start \
  --project-id 8 --task-id 123 --source-tool codex \
  --state /tmp/execution.json --output-dir /tmp/execution \
  --lifecycle-file /path/to/repository/.project-lifecycle.json
```

`finalize` 会把生命周期快照、仓库/commit/PR/验证元数据和会话记录写入 `transcript.json`、`transcript.md` 与 `manifest.json`。归档只包含宿主实际暴露的公开事件；隐藏系统提示词、隐藏推理和未暴露的内部工具轨迹必须标记在 `missing` 中，不得猜测补写。

归档发布后，用 `archive-link` 校验 manifest 中每个文件的 SHA-256，并自动生成审计记录：

```bash
python3 scripts/project_lifecycle.py archive-link \
  --state .project-lifecycle.json \
  --manifest /tmp/execution/manifest.json --publish
```

只有通过该校验并关联到当前 Project/Task 的归档，才满足 `audit` 到 `completed` 的执行归档门禁。

如果 Agent 会话已经结束但没有归档，任务不得推进到 `completed`。归档可以是 `complete=false`，但必须说明缺失原因；这保证审计事实和“客户端未暴露完整会话”的边界同时可见。

## 失败、阻塞和重试

- 分析或方案不完整时停在对应阶段，不直接编码；
- 负责人拒绝方案时保留原方案记录，新增决策记录，不覆盖历史事实；
- 验证失败时记录命令和失败输出，使用允许的回退路径回到 `implementation`，不能推进 `delivery`；
- PR 或 CI 阻塞时记录阻塞原因和下一步，不能标记 `completed`；
- 重试复用同一个任务、状态文件和 `executionId`；记录按类型和摘要哈希幂等，执行归档按确定性附件名幂等；
- 删除任务、删除评论、删除附件、移动文件等破坏性操作不属于自动生命周期推进，必须单独确认。
