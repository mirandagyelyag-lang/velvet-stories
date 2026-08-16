# Velvet Stories v1.9.1 · Mobile Composer Hotfix

Fixes the v1.9 mobile composer regression where legacy grid-column rules forced the textarea into the 36px Scene Director column.

- Scene Director is explicitly column 1.
- Textarea is explicitly column 2.
- Send/Stop is explicitly column 3.
- Reply metadata spans the full row.
- The hidden scene file input cannot affect grid placement.
- Android/iOS input remains 16px and vertically resizable.

No Supabase migration or Edge Function deploy is required.
