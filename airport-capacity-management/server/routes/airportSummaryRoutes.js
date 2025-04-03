const express = require('express');
const airportSummaryController = require('../controllers/airportSummaryController');

const router = express.Router();

router.get('/getParkingCoordinates/:airport_code', airportSummaryController.getParkingCoordinates);
router.get('/getAirportData/:airport_code', airportSummaryController.getAirportData);
router.get('/getAircraftAverages', airportSummaryController.GetAreaByType);

module.exports = router;
