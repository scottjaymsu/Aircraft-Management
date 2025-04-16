/**
 * Controller to query airport data that 
 * passed to the client
 */
const airportDB = require('../models/airportDB');
const tzLookup = require('tz-lookup');
const { DateTime } = require('luxon');

// Controller to get airport data by FAA Designator - {FAA designator, name}
exports.getAirportData = (req, res) => {
    const id = req.params.id;

    const query = 'SELECT ident, name FROM airport_data WHERE ident = ?';

    airportDB.query(query, [id], (err, results) => {
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
    const id = req.params.id;

    const query = 'SELECT COUNT(*) FROM netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.arrival_airport = ? AND flight_plans.arrived = TRUE';

    airportDB.query(query, [id], (err, results) => {
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


// Controller to get overall capacity of airport using mock data
exports.getOverallCapacity = (req, res) => {
    // Testing
    const id = req.params.id;

    const query = 'SELECT Total_Space FROM airport_parking WHERE Airport_Code = ?';

    airportDB.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }

        const totalCapacity = results.reduce((sum, item) => sum + item.Total_Space, 0);

        // Testing
        console.log({totalCapacity});
        // Send results back as response
        res.json({totalCapacity});
    });
}

// api to provide number of aircrafts currently parked at airport 
exports.getParkedPlanes = (req, res) => {
    const airport = req.params.id;

    const query = `
    SELECT
        netjets_fleet.acid, plane_type, arrival_airport, status
    FROM
        netjets_fleet 
    JOIN 
        flight_plans 
    ON
        netjets_fleet.flightRef = flight_plans.flightRef
	WHERE
        (
            (flight_plans.status = 'ARRIVED')
            OR
            (flight_plans.status = 'SCHEDULED')
        )
    AND 
        arrival_airport = ?    
    `;

    airportDB.query(query, [airport], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error parking data.' });
        }

        // Testing
        console.log(results);
        // Send results back as response
        res.json(results);
    });
}


exports.getCurrentTime = (req, res) => {
    const id = req.params.id;
    const query = 'SELECT latitude_deg, longitude_deg FROM airport_data WHERE ident = ?';
    airportDB.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }
        const { latitude_deg, longitude_deg } = results[0];
        try {
            const timeZone = tzLookup(latitude_deg, longitude_deg);
            const localTime = DateTime.now().setZone(timeZone).toISO();
            const timeZoneAbbr = DateTime.now().setZone(timeZone).toFormat('ZZZ');
            console.log(localTime);
            console.log("Timezone: ", timeZoneAbbr);
            res.json({ timeZoneAbbr, localTime });
        } catch (error) {
            console.error("Error determining time zone.", error);
            res.status(500).json({ error: 'Failed to determine local time.' });
        }
    });
}
