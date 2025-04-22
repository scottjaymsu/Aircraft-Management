const db = require('../models/db');

exports.getParkingCoordinates = (req, res) => {
    const { airport_code } = req.params;

    const query = `
        SELECT 
            ap.*,
            ap.Total_Space,
            (SELECT COUNT(*) FROM netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.fbo_id = ap.id AND flight_plans.status = 'ARRIVED') AS spots_taken
        FROM 
            airport_parking ap
        WHERE 
            ap.Airport_Code = ?
        GROUP BY 
            ap.id;
    `;
    
    db.query(query, [airport_code], (err, results) => {
        if (err) {
            console.error("Error fetching departing airport parking...", err);
            res.status(500).json({ error: "Error fetching airport parking..." });
        } else {
            res.json(results);
        }
    });
}

//Gets all the metadata related to a single airport in the database
exports.getAirportData = (req, res) => {
    const {airport_code} = req.params;

    const query = "SELECT * FROM airport_data WHERE ident = ?;";
    
    db.query(query, [airport_code], (err, results) => {
        if (err) {
            console.error("Error fetching airport data...", err);
            res.status(500).json({error: "Error fetching airport data..."});
        }
        else {
            res.json(results);
        }
    });
}

// Get average area by plane type 
exports.GetAreaByType = (req, res) => {
    const query = `
        SELECT 
            size, AVG(parkingArea) AS average_parking_area
        FROM 
            aircraft_types
        WHERE 
            size IS NOT NULL AND size <> ''
        GROUP BY size;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching average area by plane type...", err);
            res.status(500).json({ error: "Error fetching average area by plane type..." });
        } else {
            res.json(results);
        }
    });
}