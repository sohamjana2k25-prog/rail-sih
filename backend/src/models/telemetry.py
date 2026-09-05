from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class BlockState(str, Enum):
    PENDING_START = "PENDING_START"
    ACTIVE = "ACTIVE"
    EXTENSION_REQUESTED = "EXTENSION_REQUESTED"
    CLEARED_EARLY = "CLEARED_EARLY"
    COMPLETED = "COMPLETED"

class TelemetryUpdate(BaseModel):
    block_id: str
    corridor_id: str
    supervisor_id: str
    actual_progress_pct: float = Field(..., ge=0.0, le=100.0)
    estimated_minutes_remaining: int = Field(..., ge=0)
    timestamp: datetime

class BlockAlertPayload(BaseModel):
    block_id: str
    state: BlockState
    message: str
    alert_type: str
    slack_capacity_minutes: Optional[int] = None
