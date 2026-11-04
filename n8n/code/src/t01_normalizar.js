// Nodo Code «T01 Normalizar» · workflow «DBS · Entrada Telegram»
// Entrada: el update del Telegram Trigger (message o callback_query).
// Salida: evento normalizado con event_key para deduplicar.
const u = $input.first().json;
let ev;
if (u.callback_query) {
  const q = u.callback_query;
  ev = {
    tipo: 'callback',
    event_key: 'tg-cb-' + q.id,
    telegram_user_id: String(q.from && q.from.id),
    chat_id: String(q.message && q.message.chat && q.message.chat.id),
    callback_id: String(q.id),
    callback_data: String(q.data || ''),
    texto: '',
    comando: null,
    args: '',
  };
} else {
  const m = u.message || u.edited_message || {};
  const texto = limpiarTexto(m.text || '');
  const cm = /^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/.exec(texto);
  ev = {
    tipo: 'mensaje',
    event_key: 'tg-msg-' + (u.update_id !== undefined ? u.update_id : (m.chat && m.chat.id) + '-' + m.message_id),
    telegram_user_id: String(m.from && m.from.id),
    chat_id: String(m.chat && m.chat.id),
    callback_id: null,
    callback_data: null,
    texto,
    comando: cm ? cm[1].toLowerCase() : null,
    args: cm ? cm[2].trim() : texto,
  };
}
ev.ts_evento = new Date().toISOString();
return [{ json: ev }];
