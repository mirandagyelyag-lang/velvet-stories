# Velvet Stories v1.9.0 · Phone First

This release is a mobile-first reliability and interaction rebuild on top of v1.8.1.

## Fixes requested for phone

1. **Leave chat restored**
   - The normal back control remains visible in the mobile chat header.
   - Reading Mode also gets an emergency leave-chat control so the user can never get trapped inside a conversation.

2. **Real live response streaming**
   - The roleplay Edge Function now uses Gemini `streamGenerateContent` instead of waiting for a complete response and fake-streaming it afterwards.
   - The visible `reply` is ordered first in the structured response and forwarded to the client as soon as Gemini emits it.
   - Scene/development/memory metadata finishes in the same request without a second background narrative call.
   - The existing one-repair safety path remains reserved for structurally unsafe replies.

3. **Tap a message to open options**
   - Finished messages open their action sheet on tap/click.
   - This includes the persisted AI opening message.
   - Interactive controls inside a message do not accidentally open the sheet.
   - A completed horizontal version swipe suppresses the following tap so the menu does not pop open by accident.

4. **Header three-dot menu works on phone**
   - Rebuilt as a real bottom sheet with a backdrop and mobile-safe z-index.
   - Includes fast access to Memory Book, Relationship, AI Status, Memories 2.5, New conversation, Story settings, Reading Mode, Scene Director, Story Hub, export/timeline and delete.

5. **Memories 2.5 is discoverable**
   - Visible from Profile.
   - Visible from the chat three-dot menu.
   - The Memories screen is explicitly titled `Memories 2.5` and keeps Active / Canon / Relationship / Events / Preferences / Conflicts / Replaced history views.

6. **Relationship Engine is discoverable**
   - Direct relationship button in the phone chat header.
   - Also available from the chat menu.
   - Remains evidence-based and percentage-free.

7. **Scene Director rebuilt for mobile**
   - No longer squeezed into the composer.
   - Dedicated bottom sheet with large two-column preset buttons and a custom direction field.
   - Presets: More dialogue, More tension, Move scene, Bring someone in, Follow character, Surprise me.
   - Explicit Clear / Use this direction actions.

8. **AI Status is discoverable on phone**
   - Visible from Profile.
   - Available as a chat-menu quick action.
   - Velvet Doctor now separates first visible reply latency from full-response latency and keeps Edge/Supabase/Gemini/PWA diagnostics.

## Extra phone-first improvements

- Corrected the mobile chat-header grid so actions no longer wrap into clipped/invisible positions.
- Larger touch targets for header/message actions and bottom-sheet controls.
- Bottom sheets use safe-area padding and sit above the fixed composer.
- Reading Mode always leaves a way out of chat.
- Guarded horizontal swipe from v1.8.1 remains, with vertical scrolling taking priority.
- Session telemetry records first-token latency, selected model, repair usage and full request duration.
- Profile now acts as a simple mobile hub for Memories 2.5 and AI Status.

## Verification

- 114 Story Engine checks pass.
- 34 UI checks pass.
- Modified JSX/TS/JS files pass syntax/transpile checks.

The full Vite production build could not be run in the packaging environment because dependency installation was unavailable there. Run `npm ci` and `npm run build` locally before deploying.

## Deploy

No new database migration is required for v1.9.0. The existing v1.8 migrations remain sufficient.

The Edge Function changed, so deploy it:

```bash
npx supabase link --project-ref vwyudrmxatuukcbncats
npx supabase functions deploy character-chat
```

Then push the frontend to the Git-connected Vercel project.
