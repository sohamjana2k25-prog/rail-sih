import asyncio
import httpx
from datetime import datetime, timezone

async def simulate_overrun():
    url = "http://localhost:8000/api/v1/telemetry/progress-update"
    
    # Intentionally inflate estimated minutes remaining over 10 seconds to trigger overrun
    updates = [
        {"progress": 20.0, "estimated_remaining": 60, "delay": 2},
        {"progress": 25.0, "estimated_remaining": 65, "delay": 2},
        {"progress": 30.0, "estimated_remaining": 70, "delay": 2},
        {"progress": 35.0, "estimated_remaining": 75, "delay": 2},
        {"progress": 40.0, "estimated_remaining": 80, "delay": 2}, 
    ]
    
    async with httpx.AsyncClient() as client:
        for update in updates:
            payload = {
                "block_id": "block_123",
                "corridor_id": "corr_north_01",
                "supervisor_id": "sup_001",
                "actual_progress_pct": update["progress"],
                "estimated_minutes_remaining": update["estimated_remaining"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            try:
                response = await client.post(url, json=payload)
                print(f"Sent: progress={update['progress']}%, est_remaining={update['estimated_remaining']}m | Resp: {response.json()}")
            except Exception as e:
                print(f"Error sending request: {e}")
            
            await asyncio.sleep(update["delay"])

if __name__ == "__main__":
    asyncio.run(simulate_overrun())
