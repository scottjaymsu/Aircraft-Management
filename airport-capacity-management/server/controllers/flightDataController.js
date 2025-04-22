/**
 * Controller to query flight data that is 
 * passed to the client.
 */
const flightDB = require('../models/db');

// Size mapping for plane types and their sizes
const sizeMapping = {
    'E55P': 'Light',
    'C56X': 'Mid-Size',
    'C680': 'Mid-Size',
    'C68A': 'Mid-Size',
    'C700': 'Super Mid-Size',
    'CL35': 'Super Mid-Size',
    'CL60': 'Large',
    'GL5T': 'Long Range Large',
    'GLEX': 'Long Range Large',
    'GL7T': 'Long Range Large'
}


// Controller to get flight data by airport that it is arriving to
exports.getArrivingFlights = (req, res) => {
    const airport = req.params.id;

    // {tail number, eta, departing airport, arrival airport, plane type, parking area}
    const query = `
        SELECT 
            flight_plans.acid, 
            flight_plans.eta, 
            flight_plans.departing_airport, 
            flight_plans.arrival_airport, 
            netjets_fleet.plane_type,
            aircraft_types.parkingArea
        FROM 
            flight_plans
        LEFT JOIN 
            netjets_fleet
        ON 
            flight_plans.acid = netjets_fleet.acid
        LEFT JOIN 
            aircraft_types
        ON 
            netjets_fleet.plane_type = aircraft_types.type
        WHERE 
            flight_plans.arrival_airport = ?
            AND flight_plans.eta >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
        ORDER BY flight_plans.eta ASC
    `;

    flightDB.query(query, [airport], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }

        // Map the plane type to the size of the plane and number of spots 
        const planesWithSize = results.map(plane => ({
            ...plane, 
            size: sizeMapping[plane.plane_type] || 'Unknown'
        }));

        // Testing
        //console.log(planesWithSize);
        // Send results back as response
        res.json(planesWithSize);
    });
}

// Controller to get next departure flights times by airport
// {tail number, departing date/time, plane type, plane area (ft.^2)}
exports.getDepartingFlights = (req, res) => {
    const airport = req.params.id;

    const query = `
        SELECT 
            flight_plans.acid,
            flight_plans.etd,
            netjets_fleet.plane_type,
            aircraft_types.parkingArea
        FROM 
            flight_plans
        LEFT JOIN
            netjets_fleet
        ON 
            netjets_fleet.acid = flight_plans.acid
        LEFT JOIN 
            aircraft_types
        ON 
            netjets_fleet.plane_type = aircraft_types.type            
        WHERE 
            flight_plans.departing_airport = ?
            AND flight_plans.etd >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
        ORDER BY flight_plans.etd ASC
    `;



    flightDB.query(query, [airport], (err, results) => {
        if (err) {
            console.error("Error querying airport data.", err);
            return res.status(500).json({ error: 'Error querying airport data.' });
        }

        // Map the plane type to the size of the plane and number of spots 
        const planesWithSize = results.map(plane => ({
            ...plane, 
            size: sizeMapping[plane.plane_type] || 'Unknown'
        }));


        // Testing
       // console.log(planesWithSize); 
        // Send results back as response
        res.json(planesWithSize);
    });
}

// Controller to get planes in maintenance
exports.getMaintenancePlanes = (req, res) => {
    const airport = req.params.id;

    const query = `
        SELECT * FROM flight_plans WHERE status = 'MAINTENANCE' AND departing_airport = ?
    `;

    flightDB.query(query, [airport], (err, results) => {
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