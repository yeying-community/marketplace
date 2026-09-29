#!/usr/bin/env python3
"""Convert client-neutral JSONL events into a Project execution archive."""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path
from typing import Any

from project_api import ProjectApiError
from project_execution_archive import SCHEMA, finalize_state, load_state, now, publish, redact, write_json


ROLE_BY_TYPE = {
    "user_message": "user",
    "assistant_message": "assistant",
    "tool_call": "tool",
    "tool_result": "tool",
}


def new_state(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "project_id": args.project_id,
        "task_id": args.task_id,
        "execution_id": args.execution_id or str(uuid.uuid4()),
        "source_tool": args.source_tool,
        "model": args.model,
        "started_at": now(),
        "status": "running",
        "complete": False,
        "missing": ["execution completion"],
        "records": [],
        "attachments": [],
        "event_ids": [],
        "output_dir": str(args.output_dir),
    }


def normalize_event(event: dict[str, Any]) -> tuple[str, dict[str, Any], str | None]:
    event_type = str(event.get("type") or "event")
    role = str(event.get("role") or ROLE_BY_TYPE.get(event_type) or "event")
    content = event.get("content", event.get("payload", event))
    metadata = event.get("metadata")
    record: dict[str, Any] = {"role": role, "kind": event_type, "content": content}
    if isinstance(metadata, dict):
        record["metadata"] = metadata
    elif metadata is not None:
        record["metadata"] = {"client_metadata": metadata}
    for key in ("timestamp", "session_id"):
        if event.get(key) is not None:
            record.setdefault("metadata", {})[key] = event[key]
    return event_type, redact(record), str(event["event_id"]) if event.get("event_id") else None


def capture(args: argparse.Namespace) -> dict[str, Any]:
    state = load_state(args.state) if args.state.exists() else new_state(args)
    event_ids = set(state.get("event_ids", []))
    source = args.input_file.open(encoding="utf-8") if args.input_file else sys.stdin
    try:
        for line_number, line in enumerate(source, 1):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ProjectApiError(f"第 {line_number} 行不是有效 JSON") from exc
            if not isinstance(event, dict):
                raise ProjectApiError(f"第 {line_number} 行必须是 JSON 对象")
            _, record, event_id = normalize_event(event)
            if event_id and event_id in event_ids:
                continue
            state["records"].append(record)
            if event_id:
                event_ids.add(event_id)
                state.setdefault("event_ids", []).append(event_id)
            write_json(args.state, state)
    finally:
        if args.input_file:
            source.close()
    state["complete"] = args.complete
    state["missing"] = [] if args.complete else (args.missing or ["client did not expose complete native context"])
    state = finalize_state(state, args.output_dir)
    write_json(args.state, state)
    if args.publish:
        publish(args.state, state)
    return {"executionId": state["execution_id"], "records": len(state["records"]), "published": bool(args.publish)}


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description="把客户端 JSONL 会话事件归档到 Project 任务")
    command.add_argument("--project-id", type=int, required=True)
    command.add_argument("--task-id", type=int, required=True)
    command.add_argument("--source-tool", required=True)
    command.add_argument("--model")
    command.add_argument("--execution-id", default=None)
    command.add_argument("--state", type=Path, required=True)
    command.add_argument("--output-dir", type=Path, required=True)
    command.add_argument("--input-file", type=Path)
    completion = command.add_mutually_exclusive_group()
    completion.add_argument("--complete", action="store_true")
    completion.add_argument("--incomplete", action="store_false", dest="complete")
    command.set_defaults(complete=False)
    command.add_argument("--missing", action="append", default=[])
    command.add_argument("--publish", action="store_true")
    return command


if __name__ == "__main__":
    try:
        print(json.dumps(capture(parser().parse_args()), ensure_ascii=False, indent=2))
    except (OSError, ProjectApiError, ValueError) as exc:
        print(f"错误: {exc}", file=sys.stderr)
        raise SystemExit(1)
