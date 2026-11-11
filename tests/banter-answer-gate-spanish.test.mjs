import assert from "node:assert/strict";
import { test } from "node:test";
import { V35383_TESTS } from "../supabase/functions/character-chat/engine/banter-answer-gate-v35383.js";

const { directQuestionInfo, answersDirectQuestion } = V35383_TESTS;

test("detecta preguntas directas en español", () => {
  for (const question of ["¿Por qué viniste?", "¿Dónde estamos?", "¿Cuándo vuelves?", "¿Quieres quedarte?", "¿Qué pasó?"]) {
    assert.ok(directQuestionInfo(question), question);
  }
});
test("acepta respuestas directas en español", () => {
  assert.equal(answersDirectQuestion("Porque quería verte.", "¿Por qué viniste?"), true);
  assert.equal(answersDirectQuestion("Aquí, junto a la mesa.", "¿Dónde estamos?"), true);
  assert.equal(answersDirectQuestion("Mañana por la tarde.", "¿Cuándo vuelves?"), true);
  assert.equal(answersDirectQuestion("Sí, quiero quedarme.", "¿Quieres quedarte?"), true);
});
test("rechaza evasivas evidentes", () => {
  assert.equal(answersDirectQuestion("¿Y tú por qué preguntas?", "¿Por qué viniste?"), false);
  assert.equal(answersDirectQuestion("¿Dónde crees tú?", "¿Dónde estamos?"), false);
});
