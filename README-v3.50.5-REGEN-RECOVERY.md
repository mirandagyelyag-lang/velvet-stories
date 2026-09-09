# Velvet Stories v3.50.5 · Regen Recovery

Fixes the repeated Retry warning during regeneration. Streaming remains the fast path, but a failed SSE hedge now falls through to the proven non-stream Gemini failover before the UI is allowed to show a final error. Short natural replies can also be salvaged when hidden JSON metadata is truncated. No canned roleplay text is fabricated.
