Get-Clipboard -Raw |
Set-Content `
  .\supabase\functions\character-chat\index.ts `
  -Encoding utf8
