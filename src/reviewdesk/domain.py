"""Typed records shared by the workflow and UI layers.

The Streamlit surface still accepts dictionaries at its boundaries for
backwards compatibility, while workflow results and audit entries use these
records internally.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Review:
    id: str
    stars: int | None
    text: str
    author: str = ""
    date: str = ""
    has_reply: bool = False


@dataclass
class ReplyDraft:
    text: str
    language: str = ""


@dataclass
class TriageDecision:
    action: str
    reasons: list[str] = field(default_factory=list)
    result: dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditEvent:
    timestamp: str
    review_id: str
    excerpt: str
    action: str
    status: str
    reasons: list[str]
    actor: str
    error: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "time": self.timestamp,
            "review_id": self.review_id,
            "excerpt": self.excerpt,
            "action": self.action,
            "decision": self.action,
            "status": self.status,
            "reasons": self.reasons,
            "actor": self.actor,
            "approver": self.actor,
            "error": self.error,
        }


@dataclass
class WorkflowResult:
    posted: int = 0
    would_post: int = 0
    failed: int = 0
    failed_rows: list[dict[str, Any]] = field(default_factory=list)
