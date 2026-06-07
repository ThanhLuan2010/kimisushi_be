const express = require('express');
const categoryController = require('../controllers/category');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

// GET all categories
router.get('/', categoryController.getCategories);

// POST update all categories (replaces the entire collection)
router.post('/', categoryController.updateCategories);

module.exports = router;
