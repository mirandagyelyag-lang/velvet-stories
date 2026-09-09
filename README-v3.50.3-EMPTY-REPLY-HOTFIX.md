# v3.50.3 Empty Reply Hotfix
- Nickname diversity validation is advisory, never a hard/blocking repair reason.
- Sanitizers cannot erase a readable model reply.
- Final save has an empty-reply firewall and restores the original readable candidate if repair damaged it.
- Truly empty model output fails before save instead of creating a blank assistant bubble.
