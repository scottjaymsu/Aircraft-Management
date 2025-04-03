const express = require('express');
const simulatorController = require('../controllers/simulatorController');

const router = express.Router();

// Endpoint to get FBOs from airport_parking table
router.get('/getAirportFBOs/:airportCode', simulatorController.getAirportFBOs);
router.get('/getNetjetsFleet', simulatorController.getNetjetsFleet);
router.get('/getPlaneTypes', simulatorController.getPlaneTypes);
router.get('/getPlaneSizes', simulatorController.getPlaneSizes);

router.get('/getAllPlanes/:airportCode', simulatorController.getAllPlanes);
router.get('/addMaintenance/:acid', simulatorController.addMaintenance);
router.get('/removeMaintenance/:acid', simulatorController.removeMaintenance);

// Rec Engine
router.get('/getRecommendations/:airportCode', simulatorController.getRecommendations);
router.post('/runSimulation', simulatorController.runSimulation);




module.exports = router;
