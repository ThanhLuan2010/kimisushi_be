const express = require('express');
const { body, param } = require('express-validator');
const inboxController = require('../controllers/inbox');
const validate = require('../middlewares/validate');

const router = express.Router();

// GET /api/inbox?type=order&status=neu
router.get('/', inboxController.getInbox);

// PUT /api/inbox/:id/status — cập nhật trạng thái đơn hàng
router.put(
  '/:id/status',
  [
    param('id').trim().notEmpty().withMessage('ID không được để trống'),
    body('status').trim().notEmpty().withMessage('Trạng thái không được để trống'),
    validate,
  ],
  inboxController.updateInboxStatus
);

router.post(
  '/',
  [
    body('type')
      .notEmpty()
      .withMessage('Loại inbox không được để trống (order hoặc reservation)')
      .isIn(['order', 'reservation'])
      .withMessage('Loại phải là "order" hoặc "reservation"'),
    body('customerName').optional().trim().notEmpty().withMessage('Tên khách hàng không được để trống'),
    body('name').optional().trim().notEmpty().withMessage('Tên không được để trống'),
    body('customerPhone').optional().trim().notEmpty().withMessage('Số điện thoại không được để trống'),
    body('phone').optional().trim().notEmpty().withMessage('Điện thoại không được để trống'),
    body('customerEmail').optional().trim().isEmail().withMessage('Email khách hàng không đúng định dạng'),
    body('email').optional().trim().isEmail().withMessage('Email không đúng định dạng'),
    validate,
  ],
  inboxController.createInboxItem
);

module.exports = router;

