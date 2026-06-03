const express = require('express');
const { body } = require('express-validator');
const comboController = require('../controllers/combo');
const validate = require('../middlewares/validate');

const router = express.Router();

router.get('/', comboController.getCombos);

router.post(
  '/',
  [
    body().isArray().withMessage('Dữ liệu gửi lên phải là một danh sách combo (Array)'),
    body('*.id').optional().trim().notEmpty().withMessage('ID combo không được để trống'),
    body('*.name').optional().trim().notEmpty().withMessage('Tên combo không được để trống'),
    body('*.price').optional().trim().notEmpty().withMessage('Giá combo không được để trống'),
    validate
  ],
  comboController.updateCombos
);

module.exports = router;
