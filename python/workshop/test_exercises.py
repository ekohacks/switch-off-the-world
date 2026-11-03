"""Run the six exercises against the skeleton, one at a time.

    .venv/bin/python -m pytest -q -k Exercise2

Everything is red until its exercise is done, and every red names its exercise.
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
import pytest

from workshop.http_client import HttpClient as ProductionHttpClient
from workshop.http_client_skeleton import HttpClient

OPENAI_URL = "https://null.openai.invalid/v1/chat/completions"
CHUNKS = [
    {"choices": [{"delta": {"content": "Hel"}}]},
    {"choices": [{"delta": {"content": "lo"}}]},
]


# ---------------------------------------------------------------------------
# A real server for the narrow test and the real side of the contract: the only socket
# this folder ever opens. It answers per path from the routes the test hands it.
# ---------------------------------------------------------------------------
class _Routes:
    def __init__(self):
        self.answers: dict = {}


ROUTES = _Routes()


class _Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def log_message(self, *args):
        pass

    def _json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        self.rfile.read(length)
        answer = ROUTES.answers.get(self.path)
        if answer is None:
            self._json(404, {"error": "no such path"})
        elif isinstance(answer, int):
            self._json(answer, {"error": "configured status"})
        elif isinstance(answer, list):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            for chunk in answer:
                self.wfile.write(f"data: {json.dumps(chunk)}\n".encode())
            self.wfile.write(b"data: [DONE]\n")
            self.wfile.flush()
        elif answer == "slow":
            time.sleep(0.5)
            self._json(200, {"late": True})
        else:
            self._json(200, answer)


class _Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass


@pytest.fixture(scope="module")
def server():
    httpd = _Server(("127.0.0.1", 0), _Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield lambda path: f"http://127.0.0.1:{httpd.server_address[1]}{path}"
    httpd.shutdown()
    httpd.server_close()


@pytest.fixture
def routes():
    ROUTES.answers = {}
    yield ROUTES.answers
    ROUTES.answers = {}


# ---------------------------------------------------------------------------
# Exercise 1: the two lies. Read and run; nothing to write.
# ---------------------------------------------------------------------------
async def first_word_v1(client, url) -> str | None:
    """Ask once; answer the first word of the first choice."""
    result = await client.post(url, headers={}, json={"q": "?"})
    choices = result.get("choices") or []
    return choices[0]["message"]["content"].split()[0] if choices else None


async def first_word_v2(client, url) -> str | None:
    """Ask again once when the first attempt raises; the same answer for every caller."""
    try:
        result = await client.post(url, headers={}, json={"q": "?"})
    except httpx.HTTPStatusError:
        result = await client.post(url, headers={}, json={"q": "?"})
    choices = result.get("choices") or []
    return choices[0]["message"]["content"].split()[0] if choices else None


ANSWER = {"choices": [{"message": {"content": "ready when you are"}}]}


def a_503():
    request = httpx.Request("POST", OPENAI_URL)
    return httpx.HTTPStatusError(
        "503", request=request, response=httpx.Response(503, request=request)
    )


class TestExercise1TheTwoLies:
    """A test loyal to the call, then a test loyal to the behaviour."""

    async def test_loyal_to_the_call_is_green_on_version_1(self, mocker):
        """Pass, and assert how the client was called."""
        client = mocker.Mock()
        client.post = mocker.AsyncMock(return_value=ANSWER)

        assert await first_word_v1(client, OPENAI_URL) == "ready"
        client.post.assert_called_once_with(OPENAI_URL, headers={}, json={"q": "?"})

    @pytest.mark.xfail(strict=True, reason="the first lie: red on a better program")
    async def test_loyal_to_the_call_is_red_on_version_2(self, mocker):
        """Fail although nothing a user sees changed."""
        client = mocker.Mock()
        client.post = mocker.AsyncMock(side_effect=[a_503(), ANSWER])

        assert await first_word_v2(client, OPENAI_URL) == "ready"
        client.post.assert_called_once()

    async def test_loyal_to_the_call_stays_green_on_nonsense(self, mocker):
        """Pass while the function answers None: the second lie."""
        client = mocker.Mock()
        client.post = mocker.AsyncMock(return_value={"choices": []})

        word = await first_word_v1(client, OPENAI_URL)

        client.post.assert_called_once_with(OPENAI_URL, headers={}, json={"q": "?"})
        assert word is None

    async def test_loyal_to_the_behaviour_is_green_on_both_versions(self):
        """Pass on version 1 and version 2 alike, on the null."""
        assert (
            await first_word_v1(ProductionHttpClient.create_null([ANSWER]), OPENAI_URL)
            == "ready"
        )
        assert (
            await first_word_v2(
                ProductionHttpClient.create_null([a_503(), ANSWER]), OPENAI_URL
            )
            == "ready"
        )

    async def test_loyal_to_the_behaviour_says_what_went_out(self):
        """Record the request as behaviour, never as a call."""
        client = ProductionHttpClient.create_null([ANSWER])
        tracker = client.track_operation()

        await first_word_v1(client, OPENAI_URL)

        assert tracker.data == [
            {"operation": "post", "url": OPENAI_URL, "headers": {}, "json": {"q": "?"}}
        ]


# ---------------------------------------------------------------------------
# Exercise 2: the narrow integration test, the only one allowed a socket.
# ---------------------------------------------------------------------------
class TestExercise2TheNarrowTest:
    """The real client against a real local server."""

    async def test_post_sends_json_and_answers_the_parsed_body(self, server, routes):
        """Answer the body as parsed JSON."""
        routes["/echo"] = {"received": True}

        assert await HttpClient().post(server("/echo"), headers={}, json={"a": 1}) == {
            "received": True
        }

    async def test_post_raises_on_an_error_status(self, server, routes):
        """Raise httpx's error on a 503 rather than answering the body."""
        routes["/down"] = 503

        with pytest.raises(httpx.HTTPStatusError):
            await HttpClient().post(server("/down"), headers={}, json={})

    async def test_post_times_out_when_the_server_is_slower_than_asked(
        self, server, routes
    ):
        """Raise a timeout when the answer is later than the timeout."""
        routes["/slow"] = "slow"

        with pytest.raises(httpx.TimeoutException):
            await HttpClient().post(server("/slow"), headers={}, json={}, timeout=0.1)

    async def test_stream_yields_each_data_line_as_json_and_stops_at_done(
        self, server, routes
    ):
        """Yield one dict per data line, and stop at [DONE]."""
        routes["/stream"] = CHUNKS

        collected = [
            c async for c in HttpClient().stream(server("/stream"), headers={}, json={})
        ]

        assert collected == CHUNKS


# ---------------------------------------------------------------------------
# Exercise 3: the off switch.
# ---------------------------------------------------------------------------
class TestExercise3TheOffSwitch:
    """create_null answers without a socket; an empty null is a tripwire."""

    async def test_create_null_answers_the_configured_response(self):
        """Answer what was configured, for a host that does not resolve."""
        client = HttpClient.create_null([{"ok": True}])

        assert await client.post(OPENAI_URL, headers={}, json={}) == {"ok": True}

    async def test_an_empty_null_refuses_to_answer_at_all(self):
        """Raise when nothing was configured: the tripwire that proves no I/O happened."""
        client = HttpClient.create_null([])

        with pytest.raises(RuntimeError, match="No more configured responses"):
            await client.post(OPENAI_URL, headers={}, json={})


# ---------------------------------------------------------------------------
# Exercise 4: configurable responses.
# ---------------------------------------------------------------------------
class TestExercise4ConfigurableResponses:
    """A sequence in order, running dry loudly, and an exception as an answer."""

    async def test_answers_a_sequence_in_order(self):
        """Answer each configured response once, in order."""
        client = HttpClient.create_null([{"n": 1}, {"n": 2}])

        assert await client.post(OPENAI_URL, headers={}, json={}) == {"n": 1}
        assert await client.post(OPENAI_URL, headers={}, json={}) == {"n": 2}

    async def test_runs_dry_loudly(self):
        """Raise on the third request when two were configured."""
        client = HttpClient.create_null([{"n": 1}, {"n": 2}])
        await client.post(OPENAI_URL, headers={}, json={})
        await client.post(OPENAI_URL, headers={}, json={})

        with pytest.raises(RuntimeError, match="No more configured responses"):
            await client.post(OPENAI_URL, headers={}, json={})

    async def test_raises_a_configured_exception(self):
        """Raise the exception that was configured, so error paths run on the null."""
        client = HttpClient.create_null([a_503()])

        with pytest.raises(httpx.HTTPStatusError):
            await client.post(OPENAI_URL, headers={}, json={})

    async def test_streams_the_configured_chunks(self):
        """Yield the chunks of a configured response, one per iteration."""
        client = HttpClient.create_null([CHUNKS])

        assert [
            c async for c in client.stream(OPENAI_URL, headers={}, json={})
        ] == CHUNKS


# ---------------------------------------------------------------------------
# Exercise 5: output tracking.
# ---------------------------------------------------------------------------
class TestExercise5OutputTracking:
    """What was sent, recorded as behaviour."""

    async def test_records_each_post_as_behaviour_in_order(self):
        """Record operation, url, headers and json for each post."""
        client = HttpClient.create_null([{"n": 1}, {"n": 2}])
        tracker = client.track_operation()

        await client.post(
            OPENAI_URL, headers={"Authorization": "Bearer x"}, json={"q": 1}
        )
        await client.post(OPENAI_URL, headers={}, json={"q": 2})

        assert tracker.data == [
            {
                "operation": "post",
                "url": OPENAI_URL,
                "headers": {"Authorization": "Bearer x"},
                "json": {"q": 1},
            },
            {"operation": "post", "url": OPENAI_URL, "headers": {}, "json": {"q": 2}},
        ]

    async def test_records_a_post_that_raised_since_it_went_out(self):
        """Record the request even when the answer was an exception."""
        client = HttpClient.create_null([a_503()])
        tracker = client.track_operation()

        with pytest.raises(httpx.HTTPStatusError):
            await client.post(OPENAI_URL, headers={}, json={})

        assert [e["operation"] for e in tracker.data] == ["post"]

    async def test_records_a_stream_too(self):
        """Record a stream as an operation of its own."""
        client = HttpClient.create_null([CHUNKS])
        tracker = client.track_operation()

        async for _ in client.stream(OPENAI_URL, headers={}, json={"stream": True}):
            pass

        assert tracker.data == [
            {
                "operation": "stream",
                "url": OPENAI_URL,
                "headers": {},
                "json": {"stream": True},
            }
        ]


# ---------------------------------------------------------------------------
# Exercise 6: the contract list. One list of behaviour, run on the null and on the
# real; a null that answers differently fails. The seed of Oja's Python contract lists,
# and the subject of "What a Null Cannot See" on ekohacks.com.
# ---------------------------------------------------------------------------
class HttpClientContract:
    """The behaviour every HttpClient must honour, real or null."""

    async def test_post_answers_the_body_as_parsed_json(self, make):
        """Answer the body as a dict."""
        client, url = make({"/echo": {"received": True}})

        assert await client.post(url("/echo"), headers={}, json={}) == {
            "received": True
        }

    async def test_post_raises_on_an_error_status(self, make):
        """Raise httpx's status error, never answer the body."""
        client, url = make({"/down": 503})

        with pytest.raises(httpx.HTTPStatusError):
            await client.post(url("/down"), headers={}, json={})

    async def test_stream_yields_each_chunk_and_stops(self, make):
        """Yield one dict per chunk."""
        client, url = make({"/stream": CHUNKS})

        assert [
            c async for c in client.stream(url("/stream"), headers={}, json={})
        ] == CHUNKS

    async def test_track_operation_records_the_post(self, make):
        """Record the post as behaviour."""
        client, url = make({"/echo": {"received": True}})
        tracker = client.track_operation()

        await client.post(url("/echo"), headers={}, json={"q": 1})

        assert tracker.data == [
            {"operation": "post", "url": url("/echo"), "headers": {}, "json": {"q": 1}}
        ]


def _null_answers(routes: dict) -> list:
    """Hand the null the real server's answers, in the order the test asks."""
    answers = []
    for value in routes.values():
        if isinstance(value, int):
            request = httpx.Request("POST", OPENAI_URL)
            answers.append(
                httpx.HTTPStatusError(
                    str(value),
                    request=request,
                    response=httpx.Response(value, request=request),
                )
            )
        else:
            answers.append(value)
    return answers


class TestExercise6ContractOnTheNull(HttpClientContract):
    """The contract on the null."""

    @pytest.fixture
    def make(self):
        """Build a null handed the answers the real server would give."""
        return lambda routes: (
            HttpClient.create_null(_null_answers(routes)),
            lambda path: f"https://null.invalid{path}",
        )


class TestExercise6ContractOnTheReal(HttpClientContract):
    """The contract on the real client against the local server."""

    @pytest.fixture
    def make(self, server, routes):
        """Build the real client and a server that answers the routes."""

        def _make(table):
            routes.update(table)
            return HttpClient(), server

        return _make
