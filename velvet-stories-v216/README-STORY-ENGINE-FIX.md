# Velvet Stories — Feedback y creación completa (v1.3.1)

La v1.3.1 corrige `Create with AI`: generación acotada a 28 segundos entre
modelo principal y fallback, pensamiento mínimo, respuestas más concisas,
errores reales en pantalla, `Stop generation` y `Discard draft`.

La v1.3 conserva el motor narrativo y la huella de voz de v1.2, y añade una
capa de aprendizaje explícita y un creador completo de personajes.

## Me gusta, no me gusta y sincronización

- Cada respuesta del personaje muestra 👍 y 👎. El pulgar positivo permite
  conservar voz, impacto emocional, equilibrio de diálogo o ritmo; `Everything`
  elige las cuatro cualidades sin memorizar el texto literal.
- El pulgar negativo abre los ocho motivos de regeneración. En una respuesta
  antigua guarda el aprendizaje sin alterar ese punto del canon; en la última
  también genera la nueva versión.
- Una elección repetida dos veces se aplica globalmente. `Settings` muestra lo
  que Velvet está aprendiendo y lo ya aprendido, con contador y borrado
  individual. La acción más reciente puede deshacerse desde el chat.
- Story DNA y los contadores se guardan en una tabla privada protegida por RLS,
  por lo que acompañan a la misma cuenta en computador, celular y PWA.

## Create with AI

- Una idea corta puede producir nombre, rol, introducción, personalidad,
  relación, mundo, DNA, desarrollo, voz avanzada, límites, estilo y opening.
- También funciona con el campo vacío: `Surprise me` crea un personaje adulto,
  original e independiente, no una copia de los perfiles existentes.
- El resultado es solo un borrador editable. No crea ni guarda el personaje
  hasta presionar `Create character`.
- `Organize profile` reparte un perfil antiguo entre los campos sin pedir
  hechos nuevos. `AI Polish` sigue disponible para pulir y completar huecos.
- La huella avanzada ahora muestra flecha, `Tap to expand` y un contador de los
  seis campos completados.

La v1.2 conserva completo el desarrollo persistente de la v1.1 y añade tres
capas globales: preferencias narrativas, feedback inteligente al regenerar y
una huella de voz distinta para cada personaje.

## Story DNA global

- `Settings → How I like stories` define prosa, proporción de diálogo,
  visibilidad del mundo interior, ritmo romántico y una instrucción permanente.
- Los valores predeterminados usan prosa contemporánea, conversación adelantada,
  impacto emocional visible y romance medio/rápido.
- Se aplican a todos los personajes actuales y futuros, pero nunca sustituyen la
  personalidad, los límites, el canon ni una fase relacional no ganada.

## Regeneración con aprendizaje

- La usuaria puede marcar: idea ignorada, demasiado corto, fuera de personaje,
  demasiada narración, poco diálogo, repetición, violación de POV o falta de
  impacto emocional.
- Varios motivos pueden seleccionarse juntos y combinarse con una dirección
  escrita libremente.
- El motivo se aplica a la regeneración actual. Después de elegir el mismo dos
  veces, se convierte en preferencia global visible y borrable desde Settings.
- La respuesta rechazada sigue fuera del canon y su desarrollo emocional se
  deshace antes de escribir la versión nueva.

## Huella de voz

- El creador de personajes incluye un panel avanzado plegado para vocabulario y
  ritmo, humor, conflicto, afecto, señales verbales y tonos prohibidos.
- Todos los campos son opcionales. Los personajes existentes continúan
  funcionando y el motor infiere lo ausente desde su personalidad y ejemplos.
- El modelo prepara en privado el objetivo conversacional, la táctica exterior y
  la presión emocional antes de escribir; ese análisis nunca aparece en el chat.
- La validación compara las últimas respuestas y rechaza líneas distintivas u
  openings demasiado parecidos antes de mostrarlos.

La v1.1 extiende el motor consolidado con desarrollo persistente para **todos los
personajes existentes y futuros**. No contiene reglas especiales para Rowan ni
para ningún nombre. Cada conversación mantiene su propio arco, de modo que dos
chats con el mismo personaje pueden evolucionar de forma distinta.

La v1.0 reemplaza por completo la cadena histórica de parches de
`character-chat`. No borra personajes, chats, memorias, lorebooks, UI ni tablas.
Conserva el contrato de Supabase y cambia únicamente cómo se decide, genera,
valida y guarda el próximo turno narrativo.

## Arquitectura

Cada turno sigue una sola ruta:

1. Cargar perfil, controles, últimos 80 mensajes, memoria y lore.
2. Resolver la intención real del último mensaje.
3. Pedir a Gemini una respuesta, una nota breve de continuidad y una propuesta
   de desarrollo basada en evidencia, todo en la misma llamada.
4. Aplicar una única validación local de integridad.
5. Si hace falta, permitir una sola reescritura contextual.
6. Guardar y transmitir la respuesta completa.

## Desarrollo persistente

- Los campos opcionales `Core motivation`, `Emotional defense`, `What reaches
  them` y `Possible growth direction` están disponibles al crear o editar
  cualquier personaje. Los perfiles antiguos funcionan aunque se dejen vacíos.
- Una conversación nueva recibe automáticamente un estado independiente. Esto
  también se aplica a personajes que todavía no existen al instalar la versión.
- El estado conserva la dinámica actual, contradicciones activas, residuo
  emocional temporal, hitos ganados y preferencias narrativas aprendidas al
  regenerar.
- Un evento solo se acepta si su evidencia aparece en el último intercambio
  visible. El modelo no puede convertir una visita, confesión o relación
  inventada en desarrollo persistente.
- Las fases relacionales necesitan evidencia acumulada. Un momento fuerte puede
  dejar impacto, pero no cambia por sí solo diez años de carácter o relación.
- El residuo emocional desaparece gradualmente y las listas tienen límites para
  que los chats largos no crezcan sin control.
- Rebobinar o abrir una rama limpia elimina el desarrollo derivado de la línea
  abandonada.
- Regenerar restaura un punto compacto anterior a la respuesta descartada: no
  quedan emociones, hitos ni cambios de relación provenientes de esa toma.

No existen respuestas narrativas locales prefabricadas. Si la generación y su
única reparación siguen siendo vacías, genéricas, cortadas, repetidas o controlan
el POV de la usuaria, Velvet muestra un error de regeneración. Nunca sustituye el
turno por `Okay`, `I understand`, `I'm listening` ni una frase equivalente.

## Comportamiento narrativo

- `It's okay`, `fine`, `alright` y equivalentes son actos sociales que liberan
  tensión. El personaje debe recibirlos, mostrar un efecto proporcional,
  responder con su propia voz y mover la escena un paso pequeño.
- `I missed you`, `I love you` y la lealtad indirecta —por ejemplo, `If I hated
  you, I wouldn't be by your side for ten years`— activan impacto privado y
  subtexto antes de la respuesta exterior. No obligan una confesión romántica.
- Las preguntas coloquiales sin `?` se reconocen y deben contestarse.
- Un punto es silencio narrativo. Dos silencios consecutivos devuelven el foco
  significativo al personaje principal, con diálogo audible.
- Si la protagonista se va, la cámara sigue la reacción posible del personaje;
  no entra en el baño, dormitorio o pensamientos de la usuaria.
- Un texto directo debe afectar al personaje y normalmente recibir respuesta
  escrita antes de que intervengan secundarios.
- Regenerar parte desde el mismo punto de la historia sin pegar la respuesta
  rechazada en el prompt, y una toma demasiado parecida no puede guardarse.
- El modelo recibe una prohibición única y explícita de inventar comunicaciones,
  visitas, rutinas, horarios, familiares, deudas, duraciones o historia compartida
  fuera de escena.
- El último turno de la usuaria se repite al final del prompt como ancla
  autoritativa. El ID del frontend debe coincidir con el de Supabase.

## Cuota y continuidad

- Modelo principal configurable: `GEMINI_MODEL`.
- Fallback configurable: `GEMINI_FALLBACK_MODEL`.
- La nota de continuidad viaja dentro de la misma respuesta JSON, por lo que ya
  no se gastan llamadas separadas para resumen, estado y extracción automática
  de memoria después de cada mensaje.
- Si ambos modelos alcanzan la cuota, la app muestra `The free AI limit was
  reached. Try again later.` en vez de fabricar roleplay débil.
- Las memorias manuales/fijadas, lore, resumen existente, continuidad derivada y
  los últimos 80 mensajes siguen disponibles al modelo.

## Verificación

```bash
npm run verify:story
npm run verify:ui
npm run lint
npm run build
```

`verify:story` ejecuta 92 casos concretos, incluidos personajes futuros,
independencia por conversación, evidencia inventada, cambio gradual de fase,
residuo emocional, Story DNA, los ocho motivos de regeneración, voces propias,
frases recicladas, conversación casual, `It's okay`, afecto, silencio, POV,
completitud y diversidad.
