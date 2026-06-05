const express = require('express');
const fcmController = require('../controllers/fcm');

const router = express.Router();

router.post('/token', fcmController.registerToken);
router.delete('/token', fcmController.removeToken);

module.exports = router;
