const express = require('express');
const { body } = require('express-validator');
const faqController = require('../controllers/faq');
const validate = require('../middlewares/validate');

const router = express.Router();

router.get('/', faqController.getFaq);
router.get('/all', faqController.getAllFaq);

router.post(
  '/',
  [
    body().isArray().withMessage('Dữ liệu gửi lên phải là một danh sách FAQ (Array)'),
    body('*.id').optional().trim().notEmpty().withMessage('ID FAQ không được để trống'),
    body('*.question').optional().trim().notEmpty().withMessage('Câu hỏi không được để trống'),
    body('*.answer').optional().trim().notEmpty().withMessage('Câu trả lời không được để trống'),
    validate
  ],
  faqController.updateFaq
);

module.exports = router;
