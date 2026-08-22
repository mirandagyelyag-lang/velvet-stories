# Velvet Stories v2.10.14 · Timeout Resilience

- Optional repair timeouts no longer discard a complete first draft.
- Streaming model budget increased to reduce false timeout errors during normal latency.
- Mobile SSE stall guard increased from 30s to 45s.
- Real cancellations still stop immediately.
