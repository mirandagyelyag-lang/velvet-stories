VELVET STORIES v3.13.10 — SINGLE NATIVE SCROLL

This release removes the two-stage mobile scroll handoff.

- The browser document is the only vertical page scroll owner.
- Body, root, app shell and route pages no longer become accidental scrollers.
- Horizontal overflow uses clip instead of hidden, so it cannot create a second vertical scroll area.
- Scroll restoration continues to use the native document.
- The v3.13.8 reset and v3.13.9 fluid-scroll performance fixes remain intact.
