# Velvet Stories v2.0.4 · Chat Beats UI

UI-only correction based on v2.0.3. The AI output, prompts, memory engine and generation pipeline are unchanged.

## What changed
- Character turns no longer sit inside one giant card on mobile.
- A single AI turn is visually split into narration and dialogue beats.
- Only the text inside paired quote marks becomes a dialogue bubble.
- Speech tags and actions between quotes stay narration instead of becoming one huge bold quote block.
- Character avatar aligns with the beginning of the turn.
- User messages and all story-engine behavior remain unchanged.

## Example
Input stored in the conversation remains exactly one message:

`Roman watched the road. "There is a diner ahead," he said quietly. "Unless you want silence."`

Mobile UI renders it as three visual beats:
1. narration
2. dialogue bubble
3. narration + next dialogue bubble as separate beats

No database migration or Edge Function deployment is required.
