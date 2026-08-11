# Velvet Stories — motor narrativo consolidado (v0.8)

Esta versión deja una sola fuente de verdad para el roleplay. La carpeta de
proyecto duplicada, la Edge Function antigua `swift-task` y los parches sueltos
`v5`–`v8` fueron retirados del paquete; sus cambios válidos quedaron integrados
en los archivos reales de la app.

## Comportamiento consolidado

- La instrucción privada de **regenerar** tiene prioridad y no se convierte en
  cambio de escena salvo que lo pida explícitamente.
- Al regenerar, la respuesta rechazada desaparece antes de la primera espera de
  red. Si falla o se detiene la generación, la versión guardada se restaura.
- Un mensaje vacío, `.`, `..` o `…` se guarda como una señal interna compacta y
  nunca se muestra en el chat.
- El primer silencio termina el beat actual; el segundo devuelve la cámara al
  personaje principal y los siguientes permanecen con él hasta una instrucción
  explícita de POV.
- Si el personaje principal ya se alejó y la protagonista reacciona fuera de su
  alcance, la cámara lo sigue sin hacerle oír lo imposible. Su conducta pública
  puede contradecir su emoción privada, siempre apoyada por el canon.
- La continuación silenciosa exige voz de personaje y una decisión útil: no se
  permite encadenar decoración de habitación, lluvia, puertas, teléfono o
  microgestos sin contenido.
- El motor rechaza logística inventada como tráfico, atrasos, reuniones o planes
  no establecidos, y no inventa intimidad con terceros para producir drama.
- Si una reparación agota sus intentos, Velvet entrega una continuación breve y
  segura en vez de mostrar un error interno de validación de POV.
- La usuaria conserva control exclusivo sobre sus acciones, diálogo, emociones,
  pensamientos, reacciones, consentimiento y decisiones.

## Verificación local

```bash
npm ci
npm run verify:story
npm run lint
npm run build
```

## Publicación

Desde Git Bash, dentro de la carpeta raíz correcta (la que contiene
`package.json`):

```bash
bash APPLY-AUDIT-CLEANUP.sh
npm ci
npm run verify:story
npx supabase db push
npx supabase functions deploy character-chat
git add .
git commit -m "Consolidate Velvet story engine"
git push origin main
```

El comando de Supabase publica el motor narrativo. El `git push` publica la
interfaz mediante la conexión existente del repositorio.
