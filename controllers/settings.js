const Settings = require('../models/Settings');
const { logActivity } = require('../helpers/log');
const { getSettingsObj } = require('./inbox'); // Re-use the existing helper

async function getSettings(req, res) {
  try {
    const settings = await getSettingsObj();
    res.json(settings);
  } catch (e) {
    console.error('[API] GET /api/settings error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateSettings(req, res) {
  try {
    const data = req.body;
    const adminUser = data._adminUser || 'admin';
    
    delete data._adminUser;
    data.updatedAt = new Date();
    
    await Settings.findOneAndUpdate({}, { $set: data }, { upsert: true, new: true });
    await logActivity(adminUser, 'UPDATE_SETTINGS', { section: 'general' });
    
    const settings = await getSettingsObj();
    res.json({ success: true, settings });
  } catch (e) {
    console.error('[API] POST /api/settings error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateSeo(req, res) {
  try {
    const { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain } = req.body;
    const adminUser = req.body?._adminUser || 'admin';

    await Settings.findOneAndUpdate({}, {
      $set: { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain, updatedAt: new Date() }
    }, { upsert: true });
    
    await logActivity(adminUser, 'UPDATE_SEO', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateGeo(req, res) {
  try {
    const { geoRegion, geoPosition, geoPlacename } = req.body;
    const adminUser = req.body?._adminUser || 'admin';

    await Settings.findOneAndUpdate({}, { 
      $set: { geoRegion, geoPosition, geoPlacename, updatedAt: new Date() } 
    }, { upsert: true });
    
    await logActivity(adminUser, 'UPDATE_GEO', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateHours(req, res) {
  try {
    const keys = ['hoursMon1', 'hoursMon2', 'hoursTue1', 'hoursTue2', 'hoursWed1', 'hoursWed2', 'hoursThu1', 'hoursThu2', 'hoursFri1', 'hoursFri2', 'hoursSat1', 'hoursSat2', 'hoursSun1', 'hoursSun2', 'hoursSummary'];
    const updateData = {};
    const adminUser = req.body?._adminUser || 'admin';

    keys.forEach(k => { 
      if (req.body[k] !== undefined) updateData[k] = req.body[k]; 
    });
    updateData.updatedAt = new Date();

    await Settings.findOneAndUpdate({}, { $set: updateData }, { upsert: true });
    await logActivity(adminUser, 'UPDATE_HOURS', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  updateSeo,
  updateGeo,
  updateHours
};
