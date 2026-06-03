const express = require('express');
const { body } = require('express-validator');
const analyticsController = require('../controllers/analytics');
const validate = require('../middlewares/validate');

const router = express.Router();

router.get('/', analyticsController.getAnalytics);

router.post(
  '/track',
  [
    body('type')
      .notEmpty()
      .withMessage('Loại analytics không được để trống')
      .isIn(['pageview', 'click', 'order', 'reservation', 'hourly'])
      .withMessage('Loại analytics không hợp lệ'),
    validate
  ],
  analyticsController.trackAnalytics
);

router.post('/reset', analyticsController.resetAnalytics);

module.exports = router;
