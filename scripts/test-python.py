"""Run both Python suites with a deadline, including deadlocks in native libraries."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    for directory in ('server', 'tests'):
        command = [sys.executable, '-X', 'faulthandler', '-m', 'unittest',
                   'discover', '-s', directory, '-p', 'test_*.py', '-v']
        try:
            subprocess.run(command, cwd=ROOT, check=True, timeout=60)
        except subprocess.TimeoutExpired:
            print(f'The {directory} tests exceeded 60 seconds. '
                  'Check for environment or TestClient deadlocks.', file=sys.stderr)
            return 1
        except subprocess.CalledProcessError as error:
            return error.returncode or 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
