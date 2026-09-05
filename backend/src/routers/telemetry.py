from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from datetime import datetime, timedelta, timezone
from src.models.telemetry import TelemetryUpdate, BlockState, BlockAlertPayload
from src.services.redis_manager import redis_manager
from src.core.config import settings
import asyncio

router = APIRouter()

# Mock storage for scheduled end times
MOCK_SCHEDULED_END_TIMES = {
    "block_123": datetime.now(timezone.utc) + timedelta(minutes=60)
}

@router.post("/api/v1/telemetry/progress-update")
async def update_progress(update: TelemetryUpdate):
    channel = f"channel:corridor_{update.corridor_id}"
    
    if update.block_id not in MOCK_SCHEDULED_END_TIMES:
        raise HTTPException(status_code=404, detail="Block schedule not found")
        
    scheduled_end_time = MOCK_SCHEDULED_END_TIMES[update.block_id]
    
    # Calculate expected remaining time using the telemetry timestamp
    expected_remaining_minutes = (scheduled_end_time - update.timestamp).total_seconds() / 60
    
    # Calculate delay
    delay_minutes = update.estimated_minutes_remaining - expected_remaining_minutes
    
    if delay_minutes > settings.OVERRUN_LIMIT_MINUTES:
        # Overrun scenario
        alert = BlockAlertPayload(
            block_id=update.block_id,
            state=BlockState.EXTENSION_REQUESTED,
            message=f"Block {update.block_id} is delayed by {delay_minutes:.2f} minutes.",
            alert_type="DownlineWarningAlert"
        )
        await redis_manager.publish(channel, alert.model_dump_json())
        return {"status": "success", "alert_triggered": True, "alert_type": "overrun"}
        
    elif update.actual_progress_pct >= 100.0 and expected_remaining_minutes > settings.EARLY_CLEARANCE_LIMIT_MINUTES:
        # Early clearance scenario
        slack_capacity = int(expected_remaining_minutes)
        alert = BlockAlertPayload(
            block_id=update.block_id,
            state=BlockState.CLEARED_EARLY,
            message=f"Block {update.block_id} completed early. Slack capacity: {slack_capacity} mins.",
            alert_type="EarlyClearanceAlert",
            slack_capacity_minutes=slack_capacity
        )
        await redis_manager.publish(channel, alert.model_dump_json())
        return {"status": "success", "alert_triggered": True, "alert_type": "early_clearance"}

    return {"status": "success", "alert_triggered": False}

@router.websocket("/ws/live-blocks/{corridor_id}")
async def websocket_endpoint(websocket: WebSocket, corridor_id: str):
    await websocket.accept()
    channel = f"channel:corridor_{corridor_id}"
    
    async def listen_redis():
        try:
            async for message in redis_manager.subscribe(channel):
                await websocket.send_text(message)
        except Exception as e:
            print(f"Redis subscription error: {e}")
            
    task = asyncio.create_task(listen_redis())
    
    try:
        while True:
            # keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        task.cancel()
