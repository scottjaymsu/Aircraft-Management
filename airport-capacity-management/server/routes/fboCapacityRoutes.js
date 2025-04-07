const express = require('express');
const router = express.Router();
const fboCapacityController = require('../controllers/fboCapacityController');
 
router.get('/getAirportParking/:Airport_Code', fboCapacityController.getAirportParking);
router.get('/getRemainingFboArea/:id/:fbo', fboCapacityController.getRemainingFboArea);
router.get('/getRemainingAirportArea/:Airport_Code', fboCapacityController.getRemainingAirportArea);
 
module.exports = router;