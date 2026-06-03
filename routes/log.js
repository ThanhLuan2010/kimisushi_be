const express = require('express');
const logController = require('../controllers/log');

const router = express.Router();

router.get('/activity-log', logController.getActivityLog);

module.exports = router;
