"""Stable Streamlit entry point for ReviewDesk."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from reviewdesk.app import *  # noqa: F401,F403