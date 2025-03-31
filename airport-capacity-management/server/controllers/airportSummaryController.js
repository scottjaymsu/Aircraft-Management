const db = require('../models/db');

exports.getParkingCoordinates = (req, res) => {
    const { airport_code } = req.params;

    const query = `
        SELECT 
            ap.*,
            ap.Total_Space,
            COUNT(pa.fbo_id) AS spots_taken
        FROM 
            airport_parking ap
        LEFT JOIN 
            parked_at pa ON pa.fbo_id = ap.id
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

exports.getArrivingPlanes = (req, res) => {
    const {airport_code} = req.params;

    const query = "SELECT * FROM flight_plans WHERE arrival_airport = ?;";
    
    db.query(query, [airport_code], (err, results) => {
        if (err) {
            console.error("Error fetching arriving planes...", err);
            res.status(500).json({error: "Error fetching arriving planes..."});
        }
        else {
            res.json(results);
        }
    });
}
  
exports.getDepartingPlanes = (req, res) => {
    const {airport_code} = req.params;

    const query = "SELECT * FROM flight_plans WHERE departing_airport = ?;";
    
    db.query(query, [airport_code], (err, results) => {
        if (err) {
            console.error("Error fetching arriving planes...", err);
            res.status(500).json({error: "Error fetching arriving planes..."});
        }
        else {
            res.json(results);
        }
    });
}
