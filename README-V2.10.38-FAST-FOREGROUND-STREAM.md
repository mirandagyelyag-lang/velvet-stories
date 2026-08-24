# Velvet Stories v2.10.38 — Fast Foreground Stream

- Visible chats now use the direct SSE generation route so reply text paints as soon as Gemini emits it.
- Durable background enqueue remains available when the PWA is already hidden at send time.
- SSE writes are disconnect-tolerant so a mobile client disappearing does not itself abort persistence work.
- Touch-device stream paint cadence is reduced for a more immediate typing feel.
- All v2.10.37 charged-departure continuity behavior is preserved.
