/**
 * Routes for airport data queries
 */
const express = require('express');
const router = express.Router();
const airportDataController = require('../controllers/airportDataController');
const areaController = require('../controllers/areaController');

router.get('/getAirportData/:id', airportDataController.getAirportData);
router.get('/getCurrentCapacity/:id', airportDataController.getCurrentCapacity);
router.get('/getOverallCapacity/:id', airportDataController.getOverallCapacity);
router.get('/getParkedPlanes/:id', airportDataController.getParkedPlanes);
router.get('/getAirportCapacity/:id', areaController.getAirportCapacity);
router.get('/getFboCapacity/:id/:fbo', areaController.getFboCapacity);
router.get('/getAllAirportCapacities', areaController.getAllAirportCapacities);
router.get('/getAllFboCapacities/:id', areaController.getAllFboCapacities);
router.get('/getCurrentTime/:id', airportDataController.getCurrentTime);


module.exports = router;