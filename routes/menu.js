const express = require('express');
const { body } = require('express-validator');
const menuController = require('../controllers/menu');
const validate = require('../middlewares/validate');

const router = express.Router();

router.get('/', menuController.getMenu);

router.post(
  '/',
  [
    body().isArray().withMessage('Dữ liệu gửi lên phải là một danh sách món ăn (Array)'),
    body('*.id').optional().trim().notEmpty().withMessage('ID món ăn không được để trống'),
    body('*.name').optional().trim().notEmpty().withMessage('Tên món ăn không được để trống'),
    body('*.price').optional().trim().notEmpty().withMessage('Giá món ăn không được để trống'),
    validate
  ],
  menuController.updateMenu
);

module.exports = router;
