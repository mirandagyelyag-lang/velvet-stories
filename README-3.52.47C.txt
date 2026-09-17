Velvet Stories 3.52.47 · Instant Story Conflict First · Installer C

Installer C does NOT search for or replace legacy Instant Story seed/fallback helpers.
It anchors only on:
  async function handleInstantStory
  async function handleCharacterGenerate
and replaces that exact handler range with a self-contained Conflict First handler + uniquely named helpers.

Apply:
  bash ./APPLY-VELVET-3.52.47C.sh

Deploy only after APPLY prints BUILD CORRECTO:
  bash ./DEPLOY-VELVET-3.52.47.sh
