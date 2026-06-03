const express = require('express');
const telegramController = require('../controllers/telegram');

const router = express.Router();

router.post('/telegram-webhook', telegramController.handleWebhook);

module.exports = router;
