# Velvet Stories — motor narrativo consolidado (v0.9.9)

Esta versión deja una sola fuente de verdad para el roleplay. La carpeta de
proyecto duplicada, la Edge Function antigua `swift-task` y los parches sueltos
`v5`–`v8` fueron retirados del paquete; sus cambios válidos quedaron integrados
en los archivos reales de la app.

## Comportamiento consolidado

- La instrucción privada de **regenerar** tiene prioridad y no se convierte en
  cambio de escena salvo que lo pida explícitamente.
- Al regenerar, la respuesta rechazada desaparece antes de la primera espera de
  red. Si falla o se detiene la generación, la versión guardada se restaura.
- Las variantes rechazadas ya no se pegan completas en los reintentos. Velvet
  recibe un resumen abstracto de tácticas, recursos y muletillas que debe evitar,
  reduciendo el efecto de repetición por *negative-example priming*.
- La diversidad se comprueba contra los últimos cinco turnos del personaje y
  también por intención conversacional: negación, desvío de culpa, descarte y
  contraataque no pueden repetirse simplemente con sinónimos.
- En conflictos, el personaje debe respetar el significado literal del diálogo
  visible, responder el agravio real y cambiar de estrategia cuando la anterior
  ya falló. Ser frío, orgulloso o reservado no se convierte automáticamente en
  desprecio o insultos genéricos.
- Una reparación específica de progreso puede transformar un bucle defensivo en
  una admisión concreta, límite honesto, retirada, verdad relevante, intento de
  reparación o acción con consecuencias, sin obligar ternura ni disculpas.
- La ventana de continuidad textual aumenta de 18 a 52 mensajes y el backend
  conserva 80 mensajes recientes para selección de memoria/lore. Los últimos 12
  turnos permanecen en el bloque de máxima prioridad sin duplicarse.
- El último mensaje de la usuaria se repite como ancla autoritativa al final del
  prompt y su ID viaja desde el frontend hasta Supabase. Si la rama cambió antes
  de responder, la generación se detiene en vez de contestar un turno antiguo.
- Un detector específico reconoce cuando la apertura de la IA vuelve a una
  pregunta anterior —por ejemplo, responder «What do I want?» después de «I'm
  getting drained»— y la envía a reparación.
- Los resúmenes se actualizan cada cinco turnos y también después de regenerar;
  no convierten acusaciones o anécdotas inventadas por un personaje en canon.
- Las preguntas coloquiales sin signo final —por ejemplo, `what about you i
  haven't seen you`— se reconocen como preguntas y deben recibir una respuesta
  antes de que el personaje cambie de tema.
- Una confesión afectiva directa —por ejemplo, `I missed you`— se convierte en
  el centro emocional del turno cuando el perfil establece que el personaje
  siente atracción o cariño romántico. Velvet debe mostrar primero qué le
  provocaron esas palabras por dentro y sólo después puede protegerse con una
  broma, reserva o desvío; una sonrisa o un movimiento del paraguas no bastan.
- Esa reacción privada no obliga al personaje a confesarse, perseguir a la
  protagonista ni volverse repentinamente tierno. Permite una línea interior
  breve incluso con pensamientos configurados como raros, conservando su
  contradicción entre lo que siente y lo que deja ver.
- Una edición factual se activa ante hábitos, posesiones, deudas, planes o
  duraciones potencialmente inventadas. El diálogo previo del personaje no se
  acepta como prueba de una historia fuera de escena que la usuaria nunca
  confirmó.
- El perfil, los mensajes de la usuaria, las memorias manuales o fijadas y el
  lore forman un registro factual autoritativo. Las memorias aprendidas
  automáticamente quedan como pistas tentativas hasta que la usuaria las fije o
  otra fuente autoritativa las confirme; así una alucinación antigua no se
  convierte sola en canon. Detalles cotidianos nuevos —duraciones exactas,
  familiares, entrenadores, prácticas, exámenes, visitas, puertas cerradas o
  planes de fin de semana— se eliminan si ese registro no los respalda.
- Cada texto producido por el editor se valida nuevamente antes de aceptarse.
  Si Gemini falla, devuelve vacío o insiste en inventar, Velvet usa una respuesta
  breve y neutral al canon en vez de recuperar el borrador contaminado.
- El editor factual también cambia automáticamente al modelo secundario si el
  principal queda limitado o produce otra versión insegura; antes, ese cambio
  existía solamente en la primera generación.
- Las salidas de emergencia responden al sentido del último turno, usan sólo el
  primer nombre del personaje y ofrecen variantes distintas al regenerar. Ya no
  reducen una conversación a `"Okay"` ni repiten el nombre completo como robot.
- La autorización factual deja de basarse solamente en palabras presentes. Una
  mención como `your mom` no permite inventar que ella escribió, llamó, vigiló
  comidas o habló en privado: Velvet valida por separado sujeto, acción y detalle.
- Las rutinas atribuidas a la usuaria, cantidades de comida o bebidas, lugares
  fuera de escena y estereotipos de programación activan reparación si no están
  respaldados. Estudiar informática no implica bebidas energéticas, laboratorio,
  pantallas toda la noche, compiladores ni bromas sobre Python.
- Cuando la usuaria pregunta `what about you?`, el personaje debe hablar de sí
  mismo antes de comentar sobre ella; `I've been around; you're the one...` se
  trata como evasión y vuelve al editor.
- Velvet conserva y revisa el `finishReason` de Gemini. `MAX_TOKENS`, bloqueos,
  comillas abiertas, paréntesis sin cerrar, conectores finales y puntuación
  colgante activan una reparación antes de que el mensaje pueda guardarse.
- Los techos de salida suben a 900/1600/2400 tokens para corto/equilibrado/largo.
  Son máximos, no objetivos de longitud; dejan espacio porque el razonamiento
  interno de Gemini comparte el presupuesto con el texto visible.
- La reparación de integridad vuelve a escribir el turno completo; no pega una
  continuación improvisada al fragmento. Si ambos modelos fallan, recorta sólo
  hasta una frase cerrada y respaldada o utiliza un fallback completo y seguro.
- La última puerta antes de la base de datos vuelve a comprobar canon, POV y
  finalización, incluso después de regeneraciones y ediciones posteriores.
- Lecturas familiares, duraciones en horas, detalles de catering y afirmaciones
  sobre lo que la usuaria `would've` hecho ya requieren respaldo explícito.
- Exámenes, cenas o reuniones familiares y reproches como `you could've just
  texted` también requieren respaldo explícito; ya no pueden reemplazar la
  reacción emocional del personaje con logística inventada.
- Una última barrera factual se ejecuta después de las correcciones de progreso,
  mensajes y cámara, para impedir que una etapa posterior vuelva a introducir
  hechos falsos antes de mostrar la respuesta.
- El editor también interviene antes cuando detecta varias muletillas de IA o
  reutilización excesiva de lluvia, paraguas, miradas y movimientos de relleno.
- `gemini-3.6-flash` es el modelo principal y `gemini-3.5-flash` queda como
  fallback automático ante errores transitorios o límites temporales. El nivel
  de razonamiento sube de mínimo a bajo para priorizar coherencia y canon.
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
