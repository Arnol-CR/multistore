const express = require('express');
const router = express.Router();
const { getTracking } = require('../controllers/tracking.controller');
router.get('/:codigo', getTracking);
module.exports = router;
