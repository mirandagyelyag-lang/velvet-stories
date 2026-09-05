# Velvet Stories v3.22.1 — Envelope Guard

Fixes raw/truncated Gemini JSON appearing as character prose. The Edge Function now salvages the visible `reply` from incomplete structured envelopes, accepts nested `hidden_metadata`, keeps metadata compact, and refuses to expose broken JSON as story text. The PWA also cleans already-saved character messages that contain a recoverable raw envelope.
