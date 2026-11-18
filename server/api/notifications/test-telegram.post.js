export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const botToken = String(body.botToken || '').trim();
    const chatId = String(body.chatId || '').trim();
    const restaurantName = String(body.name || 'Restaurant').trim();

    if (!botToken || !chatId) {
      setResponseStatus(event, 400);
      return { ok: false, error: 'Telegram Bot Token and Chat ID are required.' };
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Test notification from <b>${restaurantName}</b>! Order alerts are connected.`,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setResponseStatus(event, 400);
      return { ok: false, error: data.description || 'Telegram API rejected the request.' };
    }
    return { ok: true, message: 'Telegram test notification sent!' };
  } catch (err) {
    setResponseStatus(event, 500);
    return { ok: false, error: err?.message || 'Failed to send Telegram test message.' };
  }
});
