/**
 * Controller to query airport data that 
 * passed to the client
 */
const airportDB = require('../models/airportDB');

// Controller to get airport data by FAA Designator
exports.getAirportData = (req, res) => {
    // Testing
    const ident = req.params.ident || 'KTEB';

    const query = 'SELECT ident, name, capacity FROM airport_data WHERE ident = ?';

    airportDB.query(query, [ident], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }

        // Testing
        console.log(results);
        // Send results back as response
        res.json(results);
    });
}

// Controller to get current capacity of airport
exports.getCurrentCapacity = (req, res) => {
    // Testing
    const ident = req.params.ident || 'KTEB';

    const query = 'SELECT COUNT(*) FROM netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.arrival_airport = ? AND flight_plans.arrived = TRUE';

    airportDB.query(query, [ident], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }

        // Testing
        console.log(results);
        // Send results back as response
        res.json(results);
    });
}