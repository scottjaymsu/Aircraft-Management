const express = require('express');
const batchFileController = require('../controllers/batchFileController');

const router = express.Router();

router.post('/insertAirport', batchFileController.insertAirport);
router.post('/getExistingAirports', batchFileController.getExistingAirports);
router.post('/insertFBO', batchFileController.insertFBO);
router.post('/getExistingFBOs', batchFileController.getExistingFBOs);

module.exports = router;
