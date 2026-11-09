const express = require('express');
const telegramController = require('../controllers/telegram');

const router = express.Router();

router.post('/telegram-webhook', telegramController.handleWebhook);
router.post('/test-telegram', telegramController.testTelegram);
router.get('/telegram-setup-webhook', telegramController.setupWebhook);
router.post('/telegram-setup-webhook', telegramController.setupWebhook);
router.get('/telegram-webhook-info', telegramController.getWebhookInfo);

module.exports = router;
