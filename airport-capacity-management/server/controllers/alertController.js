/**
 * @file alertController.js
 * 
 * Controller to query data for alerts section on 
 * the simulator page. 
 */
const db = require('../models/db');

// Record = {airport code (faa designator), fbo name, primary key, priority}
exports.getAlert = (req, res) => {
    const airport = req.params.id;
    const fbo = req.params.fbo;

    const query = `
        SELECT airport_parking.Airport_Code,
            airport_parking.FBO_Name,
            airport_parking.id,
            airport_parking.Priority,
            netjets_fleet.acid,
            netjets_fleet.flightRef,
            netjets_fleet.plane_type,
            flight_plans.status,
            flight_plans.etd,
            flight_plans.eta,
            aircraft_types.parkingArea AS parkingArea,
            aircraft_types.size 
            FROM 
            netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef 
            JOIN aircraft_types ON netjets_fleet.plane_type = aircraft_types.type 
            JOIN airport_parking ON flight_plans.fbo_id = airport_parking.id 
            WHERE airport_parking.Airport_Code = ? AND airport_parking.FBO_Name = ?
    `;

    db.query(query, [airport, fbo], (err, results) => {
        if (err) {
            console.error("Error querying alert data.", err);
            return res.status(500).json({ error: 'Error querying alert data.' });
        }

        // Testing
        console.log(results);
        // Send results back as response
        res.json(results);
    });
}   

// Get all fbo data for a given airport 
// {fbo name, priority, id, total space, parked planes count}
exports.getFBOs = (req, res) => {
    const airport = req.params.id;

    const query = `
        SELECT FBO_Name, Priority, id, Total_Space,
            (SELECT COUNT(*) FROM netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.fbo_id = airport_parking.id) AS parked_planes_count 
            FROM airport_parking WHERE Airport_Code = ?;
    `;

    db.query(query, [airport], (err, results) => {
        if (err) {
            console.error("Error querying FBO data.", err);
            return res.status(500).json({ error: 'Error querying FBO data.' });
        }

        // Testing
        console.log(results);
        // Send results back as response
        res.json(results);
    });
}