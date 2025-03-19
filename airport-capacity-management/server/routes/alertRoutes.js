/**
 * Routes for alert data queries
 */
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.get('/getFboInfo/:id/:fbo', alertController.getFboInfo);

module.exports = router;