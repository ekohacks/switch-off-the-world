class EventEmitter:
    def __init__(self):
        self._handlers = {}

    def on(self, event_type: str, handler):
        """Register an event handler for a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def emit(self, event_type: str, data):
        """Emit an event of a specific type with the given data."""
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                handler(data)


class OutputTracker:
    def __init__(self, emitter: EventEmitter, event_type: str):
        self._data: list = []

        def handler(data: dict) -> None:
            self._data.append(data)

        emitter.on(event_type, handler)

    @property
    def data(self) -> list:
        """Returns tracker data."""
        return self._data.copy()


class ConfigurableResponse:
    def __init__(self, responses):
        self._data = []
        if isinstance(responses, list):
            self._data.extend(responses)
        else:
            self._data.append(responses)

    def next(self):
        """Return the next response in the list, or raises an error if no responses are left."""
        if not self._data:
            raise RuntimeError(
                "No more configured responses — did you configure enough for this test?"
            )
        response = self._data.pop(0)

        if isinstance(response, Exception):
            raise response

        if response == {}:
            raise RuntimeError(
                "Empty response configured — did you mean to configure data?"
            )
        return response
