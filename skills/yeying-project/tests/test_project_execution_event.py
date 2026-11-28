import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import project_execution_event as event  # noqa: E402


class ExecutionEventTest(unittest.TestCase):
    def test_fresh_hook_process_reuses_bound_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = ["--binding-root", tmp, "--project-id", "8", "--task-id", "123", "--source-tool", "claude"]
            start = {"event_id": "one", "session_id": "native", "type": "session_start"}
            end = {"event_id": "two", "type": "session_end"}
            with mock.patch.object(sys, "stdin", io.StringIO(json.dumps(start))):
                first = event.append_event(event.parser().parse_args(args))
            with mock.patch.object(sys, "stdin", io.StringIO(json.dumps(end))):
                last = event.append_event(event.parser().parse_args(args + ["--finalize"]))
            manifest = json.loads((Path(tmp) / ".project/execution-123/manifest.json").read_text())
            self.assertEqual(first["executionId"], last["executionId"])
            self.assertEqual(manifest["clientSessionId"], "native")
            self.assertEqual(manifest["recordCount"], 2)
            with self.assertRaisesRegex(event.ProjectApiError, "execution_id"):
                event.append_event(event.parser().parse_args(args + ["--execution-id", "different"]))

    def test_append_is_restart_safe_and_finalize_is_explicit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            args = event.parser().parse_args([
                "--project-id", "8", "--task-id", "123", "--source-tool", "claude",
                "--state", str(root / "state.json"), "--output-dir", str(root / "archive"),
            ])
            payload = {"event_id": "evt-1", "type": "user_message", "content": "hello"}
            with mock.patch.object(sys, "stdin", io.StringIO(json.dumps(payload))):
                self.assertTrue(event.append_event(args)["appended"])
            with mock.patch.object(sys, "stdin", io.StringIO(json.dumps(payload))):
                self.assertFalse(event.append_event(args)["appended"])
            args.finalize = True
            args.missing = ["hidden context"]
            with mock.patch.object(sys, "stdin", io.StringIO(json.dumps({"event_id": "evt-2", "type": "session_end"}))):
                result = event.append_event(args)
            self.assertTrue(result["finalized"])
            self.assertTrue((root / "archive" / "manifest.json").is_file())


if __name__ == "__main__":
    unittest.main()
