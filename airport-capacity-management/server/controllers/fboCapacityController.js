const db = require('../models/db');
 
exports.getAirportParking = (req, res) => {
    const { Airport_Code } = req.params;
   
    // testing
    const airportcode = Airport_Code || 'KTEB';
    console.log(`Fetching parking data for airport ${airportcode}`);
    const query = 'SELECT Airport_Code, FBO_Name, Parking_Space_Taken, Total_Space FROM airport_parking WHERE Airport_Code = ?';
 
    db.query(query, [airportcode], (err, results) => {
        if (err) {
            console.error('Error fetching airport FBO parking:', err);
            res.status(500).send('Error fetching airport FBO parking');
            return;
        }
        // Testing
        console.log(results);
 
        res.json(results);
    });
}

exports.getRemainingFboArea = (req, res) => {
    const airport = req.params.id;
    const fbo = req.params.fbo;

    const query = `
        SELECT 
            airport_parking.Area_ft2,
            SUM(at.parkingArea) AS total_parking_area,
            airport_parking.Area_ft2 - SUM(at.parkingArea) AS remaining_area
        FROM 
            airport_parking
        JOIN 
            parked_at ON airport_parking.id = parked_at.fbo_id
        JOIN 
            netjets_fleet ON netjets_fleet.acid = parked_at.acid
        JOIN 
            aircraft_types at ON at.type = netjets_fleet.plane_type
        WHERE 
            airport_parking.Airport_Code = ?
            AND airport_parking.FBO_Name = ?
        GROUP BY 
            airport_parking.Area_ft2;
    `;

    db.query(query, [airport, fbo], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Remaining fbo query failed' });
        }
        res.status(200).json(results);
    });
}

exports.getRemainingAirportArea = (req, res) => {
    const { Airport_Code } = req.params;

    const query = `
        SELECT 
            -- Total area across all FBOs
            total_airport_area,
            -- Total area occupied by currently parked aircraft
            total_occupied_area,
            -- Remaining airport area
            (total_airport_area - total_occupied_area) AS remaining_area
        FROM (
            SELECT 
                -- Subquery to get total airport area without duplication
                (SELECT SUM(Area_ft2)
                 FROM airport_parking
                 WHERE Airport_Code = ?) AS total_airport_area,

                -- Sum of area occupied by all parked planes
                SUM(aircraft_types.parkingArea) AS total_occupied_area
            FROM 
                airport_parking
            JOIN 
                parked_at ON parked_at.fbo_id = airport_parking.id
            JOIN 
                netjets_fleet ON netjets_fleet.acid = parked_at.acid
            JOIN 
                aircraft_types ON aircraft_types.type = netjets_fleet.plane_type
            WHERE 
                airport_parking.Airport_Code = ?
        ) AS sub;
    `;

    db.query(query, [Airport_Code, Airport_Code], (err, results) => {
        if (err) {
            console.error('Error fetching remaining airport area:', err);
            return res.status(500).json({ error: 'Failed to fetch remaining airport area' });
        }
        res.status(200).json(results);
    });
};
