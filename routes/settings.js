const express = require('express');
const settingsController = require('../controllers/settings');

const router = express.Router();

// General Settings
router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);

// Admin-specific Settings (mounted under /api/admin/settings)
router.post('/seo', settingsController.updateSeo);
router.post('/geo', settingsController.updateGeo);
router.post('/hours', settingsController.updateHours);

module.exports = router;
