const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function handleWebhook(req, res) {
  try {
    const update = req.body;

    // Handle callback_query (when user clicks an inline action button in Telegram)
    if (update.callback_query) {
      const { id: callback_id, data: callback_data, from: user } = update.callback_query;

      // Parse callback_data: format "pk_10_<orderId>" or "st_rcv_<orderId>"
      const parts = (callback_data || '').split('_');
      const action = parts.slice(0, 2).join('_');  // e.g. "pk_10" or "st_rcv"
      const orderId = parts.slice(2).join('_');    // remaining = orderId

      console.log(`[TELEGRAM CB] action=${action} orderId=${orderId} from=${user?.first_name} ${user?.last_name || ''} (id=${user?.id})`);
      console.log(`[TELEGRAM CB] raw callback_data: "${callback_data}"`);
      console.log(`[TELEGRAM CB] parts: ${JSON.stringify(parts)}`);

      // Answer callback query (required by Telegram within 30s)
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callback_id,
            text: `✅ Action received: ${action} for order ${orderId}`,
            show_alert: false
          })
        });
      }

      console.log(`[TELEGRAM CB] >>> Handled callback action successfully`);
      return res.status(200).json({ ok: true });
    }

    // Ignore other update types (normal messages, edited messages, etc.)
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[TELEGRAM WEBHOOK] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  handleWebhook
};
