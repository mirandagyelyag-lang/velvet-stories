VELVET STORIES v3.49.5 · CHAT RECOVERY + CLEAN CHAT UI

- A canonical character reply after the expected user message owns turn success.
- Late SSE/provider/enrichment errors cannot place Retry under an already completed reply.
- The Edge Function returns a minimal done event if the reply was saved but secondary enrichment fails.
- Recovery searches by durable user->character turn order, not an arbitrary recent message.
- Single-version replies no longer show noisy 1 / 1 navigation.
- Mobile ellipsis chrome is removed because tapping a bubble already opens actions.
- Velvet Experience stays in the chat menu while its duplicate composer button is hidden on phones.
- Composer and genuine error surfaces are more compact.
