VELVET STORIES v3.21.1 · REQUEST HOTFIX

Fixes repeated Gemini INVALID_ARGUMENT failures introduced by the oversized Human Behavior response schema.

- Keeps all v3.21 Human Behavior features.
- Replaces the huge transport schema with a shallow top-level JSON contract.
- Keeps semantic validation/persistence on the server.
- Automatically retries once without a response schema when Gemini returns INVALID_ARGUMENT.
- Does not require a database migration.
