const express = require('express');
const { body, param } = require('express-validator');
const tableController = require('../controllers/table');
const validate = require('../middlewares/validate');

const router = express.Router();

// GET /api/tables — lấy tất cả bàn
router.get('/', tableController.getTables);

// GET /api/tables/:id — lấy 1 bàn
router.get(
  '/:id',
  [param('id').trim().notEmpty().withMessage('ID bàn không được để trống'), validate],
  tableController.getTable
);

// POST /api/tables/create — tạo mới 1 bàn (phải đặt trước /:id để không bị conflict)
router.post(
  '/create',
  [
    body('name').trim().notEmpty().withMessage('Tên bàn không được để trống'),
    body('zone').trim().notEmpty().withMessage('Khu/vùng không được để trống'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Sức chứa phải là số nguyên dương'),
    validate,
  ],
  tableController.createTable
);

// PUT /api/tables/:id — cập nhật 1 bàn
router.put(
  '/:id',
  [
    param('id').trim().notEmpty().withMessage('ID bàn không được để trống'),
    body('status').optional().isIn(['empty', 'occupied', 'reserved']).withMessage('Trạng thái không hợp lệ'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Sức chứa phải là số nguyên dương'),
    validate,
  ],
  tableController.updateTable
);

// DELETE /api/tables/:id — xóa 1 bàn
router.delete(
  '/:id',
  [param('id').trim().notEmpty().withMessage('ID bàn không được để trống'), validate],
  tableController.deleteTable
);

// POST /api/tables — bulk replace (legacy, dùng cho CMS)
router.post(
  '/',
  [
    body().isArray().withMessage('Dữ liệu gửi lên phải là một danh sách bàn ăn (Array)'),
    validate,
  ],
  tableController.updateTables
);

module.exports = router;
