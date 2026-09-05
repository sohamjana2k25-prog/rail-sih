import redis.asyncio as redis
from typing import AsyncGenerator
from src.core.config import settings

class RedisManager:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def publish(self, channel: str, message: str) -> None:
        """Publish a message to a specific Redis channel."""
        await self.redis_client.publish(channel, message)

    async def subscribe(self, channel: str) -> AsyncGenerator[str, None]:
        """Subscribe to a Redis channel and yield messages."""
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"]
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

redis_manager = RedisManager()
