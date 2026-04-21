const express = require('express');
const router  = express.Router();
const { requireApiKey } = require('../middleware');

// All admin routes require API key
router.use(requireApiKey);

// GET /api/admin/stats  — system overview//
router.get('/stats', async (req, res, next) => {
  try {
    let predStats = { total: 0, correct: null, accuracy: null };
    try {
      const Prediction = require('../models/Prediction');
      const total    = await Prediction.countDocuments();
      const accuracy = await Prediction.accuracy();
      predStats = { total, ...accuracy };
    } catch { /* DB offline */ }

  
    res.json({
      success: true,
      data: {
        modelVersion:    '1.0.0',
        modelAccuracy:   58.7,
        trainingMatches: 1095,
        trainingSeason:  '2008–2024',
        ensembleModels:  ['Logistic Regression', 'Random Forest', 'XGBoost', 'LightGBM'],
        predictions:     predStats,
        uptime:          process.uptime(),
        memoryMB:        Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion:     process.version,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/admin/predictions  — last 50 predictions
router.get('/predictions', async (req, res, next) => {
  try {
    const Prediction = require('../models/Prediction');
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const preds = await Prediction.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Prediction.countDocuments();
    res.json({ success: true, data: preds, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch {
    res.json({ success: true, data: [], meta: { total: 0 } });
  }
});

// PATCH /api/admin/predictions/:id/outcome  — record actual result
router.patch('/predictions/:id/outcome', async (req, res, next) => {
  try {
    const { actualWinner } = req.body;
    if (!actualWinner) return res.status(400).json({ success: false, message: 'actualWinner required' });
    const Prediction = require('../models/Prediction');
    const pred = await Prediction.findById(req.params.id);
    if (!pred) return res.status(404).json({ success: false, message: 'Prediction not found' });
    pred.actualWinner = actualWinner;
    pred.wasCorrect   = pred.predictedWinner === actualWinner;
    await pred.save();
    res.json({ success: true, data: pred });
  } catch (err) { next(err); }
});

// DELETE /api/admin/predictions  — clear all predictions (dev only)
router.delete('/predictions', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  try {
    const Prediction = require('../models/Prediction');
    await Prediction.deleteMany({});
    res.json({ success: true, message: 'All predictions cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
