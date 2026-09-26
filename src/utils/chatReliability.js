// Share the same identity across the initial request and every outbox retry.
export function queuedMessageId(item) {
  const candidate = item.serverId || String(item.localId || '').replace(/^(pending|offline)-/, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate : null;
}

export function replyForTurn(messages, expectedId) {
  const index = messages.findIndex((item) => item.id === expectedId && item.sender === 'user');
  if (index < 0) throw new Error('Could not confirm the original message. Reload the story before retrying.');
  for (const item of messages.slice(index + 1)) {
    if (item.sender === 'user') throw new Error('The story has moved on. Retry only the latest unanswered message.');
    if (item.sender === 'character' && !item.isStreaming && !item.isPending) return item;
  }
  return null;
}

export function saveDraft(storage, id, { message, replyTo, directorNote }) {
  if (!storage || !id) return false;
  try {
    for (const [key, value] of [
      [`velvet_draft_${id}`, message || ''],
      [`velvet_reply_draft_${id}`, replyTo?.id ? JSON.stringify(replyTo) : ''],
      [`velvet_director_note_${id}`, directorNote || ''],
    ]) {
      if (value) storage.setItem(key, value);
      else storage.removeItem(key);
    }
    return true;
  } catch { return false; }
}

export async function insertMessageOnce(client, payload) {
  const inserted = await client.from('messages').insert(payload).select().single();
  if (!inserted.error) return inserted.data;
  if (inserted.error.code !== '23505') throw inserted.error;
  // The first request may have committed even though its response was lost.
  const existing = await client.from('messages').select('*').eq('id', payload.id)
    .eq('user_id', payload.user_id).eq('conversation_id', payload.conversation_id).single();
  if (existing.error) throw existing.error;
  return existing.data;
}
