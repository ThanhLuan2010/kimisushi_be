const express = require('express');
const mailController = require('../controllers/mail');

const router = express.Router();

router.post('/gmail-notify', mailController.notify);
router.post('/gmail-test', mailController.testConnection);
router.post('/gmail-test-send', mailController.testSend);

module.exports = router;
