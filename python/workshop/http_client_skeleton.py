"""The workshop skeleton: HttpClient with every body missing.

Exercises 2 to 5 of ``README.md`` fill it in, one test class of ``test_exercises.py``
at a time. The shape is production's, ``http_client.py`` beside this file, Oja's wrapper
verbatim, which is also the answer key; ``solutions/http_client.py`` is the same file,
kept there so a pair that falls behind can copy it over this one.
"""

from workshop.output_tracker import (
    ConfigurableResponse,
    EventEmitter,
    OutputTracker,
)

HTTP_OPERATION_EVENT = "http_operation"


def _todo(exercise: int, what: str):
    raise NotImplementedError(f"TODO exercise {exercise}: {what}")


class _NullableHttpClient:
    """The embedded stub: answers configured responses and never opens a socket.

    Exercise 3 makes ``post`` answer; exercise 4 makes the answers a sequence that runs
    dry loudly and can be an exception, through ``ConfigurableResponse``.
    """

    def __init__(self, responses):
        self._responses = ConfigurableResponse(responses or [])

    async def post(self, url, headers=None, json=None, timeout=None):
        _todo(3, "the null post answers the next configured response")

    async def stream(self, url, headers=None, json=None, timeout=None):
        _todo(3, "the null stream yields the chunks of the next configured response")
        yield  # pragma: no cover


class HttpClient:
    """HTTP client with an off switch.

    Production mode wraps ``httpx.AsyncClient``; null mode answers configured responses.
    Both run the same ``post`` and ``stream`` lines; only the bottom layer differs.
    """

    def __init__(self):
        self._nullable = None
        self._emitter = EventEmitter()

    @classmethod
    def create_null(cls, responses) -> "HttpClient":
        """Exercise 3: build an instance whose bottom layer is a _NullableHttpClient."""
        _todo(3, "create_null builds an instance holding a _NullableHttpClient")

    def track_operation(self) -> OutputTracker:
        """Exercise 5: a tracker on the emitter; the caller reads what was sent."""
        _todo(5, "track_operation returns an OutputTracker on the emitter")

    async def post(self, url, headers=None, json=None, timeout=30):
        """Exercise 2: post JSON through httpx, raise on an error status, answer the parsed body.

        Exercise 3: when ``self._nullable`` is set, answer from it instead.
        Exercise 5: emit ``{"operation": "post", "url", "headers", "json"}`` first.
        """
        _todo(2, "post sends JSON through httpx and answers the parsed body")

    async def stream(self, url, headers=None, json=None, timeout=30):
        """Exercise 2: stream a POST and yield each ``data:`` line as parsed JSON, stopping at ``[DONE]``.

        Exercise 3: when ``self._nullable`` is set, yield from it instead.
        Exercise 5: emit ``{"operation": "stream", ...}`` first.
        """
        _todo(2, "stream yields each data line as JSON")
        yield  # pragma: no cover
