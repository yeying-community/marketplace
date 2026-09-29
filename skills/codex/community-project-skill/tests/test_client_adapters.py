import json
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import project_claude_hook as claude  # noqa: E402
import project_codex_events as codex  # noqa: E402


class ClientAdapterTest(unittest.TestCase):
    def test_claude_hook_maps_tool_result(self):
        event = claude.normalize({
            "hook_event_name": "PostToolUse",
            "session_id": "s1",
            "tool_name": "exec_command",
            "tool_response": {"stdout": "ok"},
        })
        self.assertEqual(event["type"], "tool_result")
        self.assertEqual(event["role"], "tool")
        self.assertEqual(event["metadata"]["tool_name"], "exec_command")
        self.assertTrue(event["event_id"].startswith("claude-"))

    def test_codex_adapter_is_json_serializable_and_stable_with_id(self):
        payload = {"type": "assistant", "text": "完成", "session_id": "s1"}
        first = codex.normalize(payload, 1)
        second = codex.normalize(payload, 1)
        self.assertEqual(first, second)
        self.assertEqual(first["type"], "assistant_message")
        json.dumps(first, ensure_ascii=False)


if __name__ == "__main__":
    unittest.main()
