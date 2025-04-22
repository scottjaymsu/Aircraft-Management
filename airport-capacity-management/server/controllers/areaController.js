const db = require("../models/db");

/**
 * Gets all capacity for a given airport.
 */
exports.getAirportCapacity = (req, res) => {
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
            const airportArea = parseFloat(totalArea) / 7.5;

            // Calculate percentage
            let occupiedArea = 0;
            planeResults.forEach(plane => {
                occupiedArea += plane.parkingArea * 1.1;  // area + 10%
            });

            // percentage = sum(plane_area + 0.1*plane_area) / (airport_area / 7.5)
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

/**
 * Gets remaining capacities for all airports
 */
exports.getAllAirportCapacities = (req, res) => {
    const airport_area_query = `
        SELECT
            Airport_Code,
            SUM(Area_ft2) AS total_area
        FROM
            airport_parking
        GROUP BY
            Airport_Code;
    `;

    const occupied_area_query = `
        SELECT 
            airport_parking.Airport_Code,
            SUM(aircraft_types.parkingArea * 1.1) AS occupied_area
        FROM
            airport_parking
        JOIN
            flight_plans
            ON flight_plans.fbo_id = airport_parking.id
        JOIN
            netjets_fleet
            ON netjets_fleet.acid = flight_plans.acid
        JOIN
            aircraft_types
            ON aircraft_types.type = netjets_fleet.plane_type
        GROUP BY
            airport_parking.Airport_Code;
    `;

    // Get total area
    db.query(airport_area_query, (err, areaResults) => {
        if (err) {
            console.error("Error fetching airport areas:", err);
            return res.status(500).json({ error: "Error fetching airport areas" });
        }

        // Get occupied area
        db.query(occupied_area_query, (err2, occupiedResults) => {
            if (err2) {
                console.error("Error fetching occupied areas:", err2);
                return res.status(500).json({ error: "Error fetching occupied areas" });
            }

            // Convert results into maps
            const totalMap = {};
            areaResults.forEach(row => {
                totalMap[row.Airport_Code] = parseFloat(row.total_area) / 7.5;
            });

            const occupiedMap = {};
            occupiedResults.forEach(row => {
                occupiedMap[row.Airport_Code] = parseFloat(row.occupied_area);
            });

            // Combine both maps
            const summary = Object.keys(totalMap).map(code => {
                const total = totalMap[code];
                const occupied = occupiedMap[code] || 0;
                const percentage = (occupied / total) * 100;

                return {
                    airport: code,
                    total_area: total.toFixed(2),
                    occupied_area: occupied.toFixed(2),
                    percentage_occupied: percentage.toFixed(2) + "%",
                    area_remaining: (total - occupied).toFixed(2)
                };
            });

            // Console log the result
            // console.log("Airport Capacity Summary:");
            // summary.forEach(entry => {
            //     console.log(`${entry.airport} - Total: ${entry.total_area} | Occupied: ${entry.occupied_area} | Remaining: ${entry.area_remaining} | ${entry.percentage_occupied}`);
            // });

            res.status(200).json(summary);
        });
    });
};

// Get fbo capacity for a given airport
exports.getFboCapacity = (req, res) => {
    const airport = req.params.id;
    const fbo = req.params.fbo;

    const fbo_area_query = `
        SELECT 
            Area_ft2
        FROM
            airport_parking
        WHERE
            Airport_Code = ?
        AND
            FBO_Name = ?
    `;

    // Fetching the total area for the given fbo
    db.query(fbo_area_query, [airport, fbo], (err, areaResults) => {
        if (err) {
            console.error("Error fetching fbo area:", err);
            return res.status(500).json({ error: "Error fetching fbo area" });
        }

        const totalArea = areaResults[0]?.Area_ft2 || 0;
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
            AND
                airport_parking.FBO_Name = ?
        `;

        // Fetching the plane areas for the given fbo
        db.query(query, [airport, fbo], (err, planeResults) => {
            if (err) {
                console.error("Error fetching fbo plane areas:", err);
                return res.status(500).json({ error: "Error fetching fbo plane areas" });
            }

            // Convert string to float
            const fboArea = parseFloat(totalArea) / 7.5;

            // Calculate percentage
            let occupiedArea = 0;
            planeResults.forEach(plane => {
                occupiedArea += plane.parkingArea * 1.1;  // area + 10%
            });

            // percentage = sum(plane_area + 0.1*plane_area) / (airport_area / 7.5)
            const percentage = (occupiedArea / fboArea) * 100;

            console.log("Occupied Area:", occupiedArea.toFixed(2));
            console.log("Total Area:", fboArea.toFixed(2));
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

exports.getAllFboCapacities = (req, res) => {
    const airport = req.params.id;

    const fbo_area_query = `
        SELECT
            FBO_Name,
            Area_ft2 AS total_area
        FROM
            airport_parking
        WHERE
            Airport_Code = ?
        GROUP BY
            FBO_Name;
    `;
    
    const occupied_area_query = `
    SELECT 
        airport_parking.FBO_Name,
        SUM(aircraft_types.parkingArea * 1.1) AS occupied_area
    FROM
        airport_parking
    JOIN
        flight_plans
        ON flight_plans.fbo_id = airport_parking.id
    JOIN
        netjets_fleet
        ON netjets_fleet.acid = flight_plans.acid
    JOIN
        aircraft_types
        ON aircraft_types.type = netjets_fleet.plane_type
    WHERE
        Airport_Code = ?
    GROUP BY
        airport_parking.FBO_Name;
    `;

    // Get total area for FBOs
    db.query(fbo_area_query, [airport], (err, areaResults) => {
        if (err) {
            console.error("Error fetching FBO areas:", err);
            return res.status(500).json({ error: "Error fetching FBO areas" });
        }

        // Get occupied area for FBOs
        db.query(occupied_area_query, [airport], (err2, occupiedResults) => {
            if (err2) {
                console.error("Error fetching occupied areas:", err2);
                return res.status(500).json({ error: "Error fetching occupied areas" });
            }

            // Convert results into maps
            const totalMap = {};
            areaResults.forEach(row => {
                // Scale areas
                totalMap[row.FBO_Name] = parseFloat(row.total_area) / 7.5; 
            });

            const occupiedMap = {};
            occupiedResults.forEach(row => {
                occupiedMap[row.FBO_Name] = parseFloat(row.occupied_area);
            });

            // Combine both maps
            const summary = Object.keys(totalMap).map(fbo => {
                const total = totalMap[fbo];
                const occupied = occupiedMap[fbo] || 0;
                const percentage = (occupied / total) * 100;

                return {
                    fbo: fbo,
                    total_area: total.toFixed(2),
                    occupied_area: occupied.toFixed(2),
                    percentage_occupied: percentage.toFixed(2) + "%",
                    area_remaining: (total - occupied).toFixed(2)
                };
            });

            // Console log the result
            // console.log("FBO Capacity Summary:");
            // summary.forEach(entry => {
            //     console.log(`${entry.fbo} - Total: ${entry.total_area} | Occupied: ${entry.occupied_area} | Remaining: ${entry.area_remaining} | ${entry.percentage_occupied}`);
            // });

            res.status(200).json(summary);
        });
    });
};
