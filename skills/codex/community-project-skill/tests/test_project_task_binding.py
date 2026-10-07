import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
from project_task_binding import TaskBindingError, resolve_binding  # noqa: E402


class TaskBindingTest(unittest.TestCase):
    def test_nearest_marker_is_used(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            work = root / "repo" / "src"
            work.mkdir(parents=True)
            (root / "repo" / ".project-task.json").write_text(
                json.dumps({"project_id": 8, "task_id": 123}), encoding="utf-8"
            )
            binding = resolve_binding(start_dir=work)
            self.assertEqual(binding["project_id"], 8)
            self.assertEqual(binding["task_id"], 123)

    def test_explicit_values_override_environment(self):
        with mock.patch.dict(os.environ, {"YEYING_PROJECT_ID": "9", "YEYING_PROJECT_TASK_ID": "999"}):
            binding = resolve_binding(8, 123)
        self.assertEqual(binding["source"], "arguments")
        self.assertEqual(binding["task_id"], 123)

    def test_missing_binding_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(
            os.environ, {"YEYING_PROJECT_ID": "", "YEYING_PROJECT_TASK_ID": ""}, clear=False
        ):
            with self.assertRaises(TaskBindingError):
                resolve_binding(start_dir=Path(tmp))


if __name__ == "__main__":
    unittest.main()
