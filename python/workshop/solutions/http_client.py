"""The answer key for exercises 2 to 5: ``workshop/http_client.py``, Oja's wrapper, verbatim.

To check your work, copy this file over ../http_client_skeleton.py and run the exercises;
to go back to the skeleton, ``git checkout workshop/http_client_skeleton.py``.
"""

from workshop.output_tracker import (
    ConfigurableResponse,
    EventEmitter,
    OutputTracker,
)

HTTP_OPERATION_EVENT = "http_operation"


class _NullableHttpClient:
    """In-memory replacement for real HTTP calls — configured responses only.

    Tracking events are emitted by the wrapper.
    """

    def __init__(self, responses):
        self._responses = ConfigurableResponse(responses or [])

    async def post(self, url, headers=None, json=None, timeout=None):
        return self._responses.next()

    async def stream(self, url, headers=None, json=None, timeout=None):
        chunks = self._responses.next()
        for chunk in chunks:
            yield chunk


class HttpClient:
    """HTTP client with nullable support for testing.

    Production mode wraps httpx.AsyncClient.
    Null mode returns pre-configured responses.
    Operations are tracked on real and nulled instances alike.
    """

    def __init__(self):
        self._client = None
        self._nullable = None
        self._emitter = EventEmitter()

    @classmethod
    def create_null(cls, responses) -> "HttpClient":
        """Create a null instance for testing."""
        instance = cls()
        instance._nullable = _NullableHttpClient(responses)
        return instance

    def track_operation(self):
        """Track HTTP operations for testing and telemetry."""
        return OutputTracker(self._emitter, HTTP_OPERATION_EVENT)

    async def post(self, url, headers=None, json=None, timeout=30):
        """Make an HTTP POST request."""
        self._emitter.emit(
            HTTP_OPERATION_EVENT,
            {"operation": "post", "url": url, "headers": headers, "json": json},
        )
        if self._nullable:
            return await self._nullable.post(url, headers, json, timeout)

        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, headers=headers, json=json, timeout=timeout
            )
            response.raise_for_status()
            return response.json()

    async def stream(self, url, headers=None, json=None, timeout=30):
        """Make a streaming HTTP request. Yields response chunks."""
        self._emitter.emit(
            HTTP_OPERATION_EVENT,
            {"operation": "stream", "url": url, "headers": headers, "json": json},
        )
        if self._nullable:
            async for chunk in self._nullable.stream(url, headers, json, timeout):
                yield chunk
            return

        import httpx

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, headers=headers, json=json, timeout=timeout
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        import json as json_module

                        yield json_module.loads(line[6:])
