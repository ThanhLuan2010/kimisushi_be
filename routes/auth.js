const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth');
const validate = require('../middlewares/validate');

const router = express.Router();

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Tên đăng nhập không được để trống'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
    validate
  ],
  authController.login
);

router.post(
  '/change-password',
  [
    body('token').notEmpty().withMessage('Token không được để trống'),
    body('oldPassword').notEmpty().withMessage('Mật khẩu cũ không được để trống'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
    validate
  ],
  authController.changePassword
);

router.post(
  '/verify',
  [
    body('token').notEmpty().withMessage('Token không được để trống'),
    validate
  ],
  authController.verify
);

module.exports = router;
