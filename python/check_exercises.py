"""Prove the two claims the README makes, without touching the skeleton.

The blank skeleton is 4 passed, 21 failed and 1 xfailed; the answer key makes every
exercise pass. The solved run happens in a temporary copy of this folder. Part of the gate.
"""

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# The README's numbers. The xfailed test is exercise 1's first lie, red by design.
BLANK = {"passed": 4, "failed": 21, "xfailed": 1}


def run_exercises(cwd: Path) -> dict[str, int]:
    """Run the exercises in ``cwd`` and read the counts off pytest's summary line."""
    completed = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider"],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    lines = completed.stdout.strip().splitlines()
    summary = lines[-1] if lines else ""
    counts = {
        word: int(number)
        for number, word in re.findall(
            r"(\d+) (passed|failed|xfailed|xpassed|errors?)", summary
        )
    }
    if not counts:
        sys.exit(
            f"check_exercises: pytest gave no summary in {cwd}\n"
            f"{completed.stdout}\n{completed.stderr}"
        )
    return counts


def main() -> None:
    """Check the blank skeleton, then the answer key in a temporary copy."""
    blank = run_exercises(ROOT)
    if {key: blank.get(key, 0) for key in BLANK} != BLANK:
        sys.exit(f"check_exercises: blank skeleton: expected {BLANK}, got {blank}")

    with tempfile.TemporaryDirectory(prefix="switch-off-the-world-") as copy:
        copy_path = Path(copy)
        shutil.copytree(
            ROOT / "workshop",
            copy_path / "workshop",
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        shutil.copy(ROOT / "pyproject.toml", copy_path / "pyproject.toml")
        shutil.copy(
            copy_path / "workshop" / "solutions" / "http_client.py",
            copy_path / "workshop" / "http_client_skeleton.py",
        )
        solved = run_exercises(copy_path)

    total = BLANK["passed"] + BLANK["failed"]
    unexpected = {
        key: value for key, value in solved.items() if key not in ("passed", "xfailed")
    }
    if unexpected or solved.get("passed") != total:
        sys.exit(f"check_exercises: solved: expected {total} passed, got {solved}")
    print(f"check_exercises: blank {blank}; solved {solved}")


if __name__ == "__main__":
    main()
