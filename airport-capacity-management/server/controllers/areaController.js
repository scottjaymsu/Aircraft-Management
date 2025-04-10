const db = require("../models/db");

/**
 * Gets all plane areas for a given airport.
 */
exports.getAirportPlaneAreas = (req, res) => {
    const airport = req.params.id;

    const airport_area_query = `
        SELECT 
            SUM(Area_ft2) AS total_area
        FROM
            airport_parking
        WHERE
            Airport_Code = ?
    `;

    // Fetching the total area for the given airport
    db.query(airport_area_query, [airport], (err, areaResults) => {
        if (err) {
            console.error("Error fetching airport area:", err);
            return res.status(500).json({ error: "Error fetching airport area" });
        }

        const totalArea = areaResults[0]?.total_area || 0;
        const query = `
            SELECT 
                airport_parking.Airport_Code,
                airport_parking.FBO_Name,
                airport_parking.id,
                flight_plans.acid,
                netjets_fleet.plane_type,
                aircraft_types.parkingArea
            FROM
                airport_parking
            JOIN
                flight_plans
            ON
                flight_plans.fbo_id = airport_parking.id
            JOIN
                netjets_fleet
            ON
                netjets_fleet.acid = flight_plans.acid
            JOIN
                aircraft_types
            ON
                aircraft_types.type = netjets_fleet.plane_type
            WHERE
                airport_parking.Airport_Code = ?
        `;

        // Fetching the plane areas for the given airport
        db.query(query, [airport], (err, planeResults) => {
            if (err) {
                console.error("Error fetching airport plane areas:", err);
                return res.status(500).json({ error: "Error fetching airport plane areas" });
            }

            // Convert string to float
            const airportArea = parseFloat(totalArea) / 10;

            // Calculate percentage
            let occupiedArea = 0;
            planeResults.forEach(plane => {
                occupiedArea += plane.parkingArea * 1.1;  // area + 10%
            });

            // percentage = sum(plane_area + 0.1*plane_area) / (airport_area / 10)
            const percentage = (occupiedArea / airportArea) * 100;

            console.log("Occupied Area:", occupiedArea.toFixed(2));
            console.log("Total Area:", airportArea.toFixed(2));
            console.log("Percentage Occupied:", percentage.toFixed(2) + "%");

            res.status(200).json({
                total_area: totalArea,
                occupied_area: occupiedArea.toFixed(2),
                percentage_occupied: percentage.toFixed(2) + "%",
                planes: planeResults
            });
        });
    });
};