const db = require('../models/db');

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

// Get all FBOs at an airport from airport_parking table
// And the total parking space taken and availbale at the airport
exports.getAirportFBOs = (req, res) => {
    const { airportCode } = req.params;
    const query =
    `SELECT 
        ? AS Airport_Code,
        'All FBOs' AS FBO_Name, 
        SUM(Parking_Space_Taken) AS Parking_Space_Taken, 
        SUM(Total_Space) AS Total_Space
    FROM airport_parking
    WHERE Airport_Code = ?

    UNION ALL

    SELECT 
        Airport_Code,
        FBO_Name, 
        Parking_Space_Taken, 
        Total_Space
    FROM airport_parking
    WHERE Airport_Code = ?;`;
  
    db.query(query, [airportCode, airportCode, airportCode], (err, results) => {
      if (err) {
        console.error('Error fetching airport FBOs:', err);
        res.status(500).send('Error fetching airport FBOs');
        return;
      }
      res.json(results);
    });
  };

// Get NetJets fleet from netjets_fleet table
// Map the plane type to the size of the plane
// Map the plane type to the number of spots required
exports.getNetjetsFleet = (req, res) => {
    
    const spotsMapping = {
        'E55P': 1,
        'C56X': 1,
        'C680': 1,
        'C68A': 1,
        'C700': 1,
        'CL35': 1,
        'CL60': 2,
        'GL5T': 2,
        'GLEX': 2,
        'GL7T': 2
    };

    // Selecting the tail number, type of plane, and curr location calculation
    const query = `
        SELECT netjets_fleet.acid, netjets_fleet.plane_type,
        CASE
            WHEN flight_plans.status = 'ARRIVED' THEN flight_plans.arrival_airport
            WHEN flight_plans.status = 'FLYING' THEN 'In Flight'
            WHEN flight_plans.status = 'SCHEDULED' THEN flight_plans.departing_airport
            ELSE 'Unknown'
        END AS current_location
        FROM netjets_fleet
        LEFT JOIN flight_plans on netjets_fleet.flightRef = flight_plans.flightRef
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching NetJets fleet:', err);
            res.status(500).send('Error fetching NetJets fleet');
            return;
        }

        // Map the plane type to the size of the plane and number of spots 
        const fleetWithSize = results.map(plane => ({
            ...plane, 
            size: sizeMapping[plane.plane_type] || 'Unknown',
            numberSpots: spotsMapping[plane.plane_type] || 1
        }));

        res.json(fleetWithSize);
    });
};



// Get all planes at an airport from flight_plans table
// Old planes no longer at this location are filtered out 
exports.getAllPlanes = async (req, res) => {
    const { airportCode } = req.params;

    try {
        // Status = Arrived 
        const parkedPlanes = await new Promise((resolve, reject) => {
            // TODO change from parked_at_mock to parked_at when we have more data in actual parked_at
            // Also: parked_at uses slightly different names - somehow alter to match on db or 
            const query = 
            `SELECT 
                fp.acid, 
                COALESCE(
                    (SELECT MIN(future_fp.etd) 
                    FROM flight_plans future_fp 
                    WHERE future_fp.acid = fp.acid 
                    AND future_fp.departing_airport = ?
                    AND future_fp.status = 'SCHEDULED'
                    AND future_fp.etd > NOW()
                    ), 
                    NULL
                ) AS event, 
                nf.plane_type, 
                'Parked' AS status,
                ap.FBO_name  -- Added FBO name from airport_parking
            FROM flight_plans fp
            JOIN netjets_fleet nf ON fp.acid = nf.acid 
            LEFT JOIN parked_at pa ON fp.acid = pa.acid  --  Join parked_at to get fbo_id --
            LEFT JOIN airport_parking ap ON pa.fbo_id = ap.id  --  Join airport_parking to get FBO_name
            WHERE fp.arrival_airport = ? 
            AND fp.status = 'ARRIVED'
            AND NOT EXISTS (
                -- Exclude planes that have departed from the airport after arrival
                SELECT 1 
                FROM flight_plans departed_fp 
                WHERE departed_fp.acid = fp.acid 
                AND departed_fp.departing_airport = ?
                AND departed_fp.etd > fp.eta
            )
            AND NOT EXISTS (
                -- Exclude planes that are currently in maintenance at the same airport
                SELECT 1 
                FROM flight_plans maintenance_fp 
                WHERE maintenance_fp.acid = fp.acid 
                AND maintenance_fp.departing_airport = fp.arrival_airport 
                AND maintenance_fp.status = 'MAINTENANCE'
            )
            GROUP BY fp.acid, ap.FBO_name
            `;
            db.query(query, [airportCode, airportCode, airportCode], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // TODO: for arriving and departing planes - not filtered out ones that have an arrival time in the past 
        // But are still marked as arriving -- add to parked at that time? leave be? 
        // Status = Scheduled
        const departingPlanes = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    fp.acid, 
                    fp.eta AS event, 
                    nf.plane_type, 
                    'Departing' AS status,
                    ap.FBO_name  -- Added FBO name from airport_parking
                FROM flight_plans fp
                JOIN netjets_fleet nf ON fp.acid = nf.acid 
                LEFT JOIN parked_at_mock pa ON fp.acid = pa.acid  
                LEFT JOIN airport_parking ap ON pa.fbo_id = ap.id 
                WHERE fp.departing_airport = ? 
                AND fp.status = 'FLYING'
                GROUP BY fp.acid, ap.FBO_name
            `;
            db.query(query, [airportCode], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
        
        // Status = Flying 
        const arrivingPlanes = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    fp.acid, 
                    fp.eta AS event, 
                    nf.plane_type, 
                    'Arriving' AS status,
                    ap.FBO_name  -- Added FBO name from airport_parking
                FROM flight_plans fp
                JOIN netjets_fleet nf ON fp.acid = nf.acid 
                LEFT JOIN parked_at_mock pa ON fp.acid = pa.acid  
                LEFT JOIN airport_parking ap ON pa.fbo_id = ap.id 
                WHERE fp.arrival_airport = ? 
                AND fp.status = 'FLYING'
                GROUP BY fp.acid, ap.FBO_name
            `;
            db.query(query, [airportCode], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Status = Maintenance
        const maintenancePlanes = await new Promise((resolve, reject) => {
            const query = `
            SELECT 
                fp.acid, 
                fp.etd AS event, 
                nf.plane_type, 
                'Maintenance' AS status,
                ap.FBO_name  
            FROM flight_plans fp
            JOIN netjets_fleet nf ON fp.acid = nf.acid 
            LEFT JOIN parked_at_mock pa ON fp.acid = pa.acid 
            LEFT JOIN airport_parking ap ON pa.fbo_id = ap.id
            WHERE fp.departing_airport = ? 
            AND fp.status = 'MAINTENANCE'
            GROUP BY fp.acid, ap.FBO_name;
            `;
            db.query(query, [airportCode], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        let allPlanes = [
            ...parkedPlanes,
            ...departingPlanes,
            ...arrivingPlanes,
            ...maintenancePlanes
        ];
        const planesWithSize = allPlanes.map(plane => ({
            ...plane,
            size: sizeMapping[plane.plane_type] || 'Unknown'
        }));

        // 
        // allPlanes = allPlanes.sort((a, b) => new Date(a.event) - new Date(b.event));
        const statusOrder = {
            'Arriving': 1,
            'Departing': 2,
            'Parked': 3,
            'Maintenance': 4
        };
        
        planesWithSize.sort((a, b) => {
            let statusA = a.status.trim(); // Ensure no leading/trailing spaces
            let statusB = b.status.trim();
            
            return statusOrder[statusA] - statusOrder[statusB];
        });

        res.json(planesWithSize);
    } catch (err) {
        console.error('Error fetching planes:', err);
        res.status(500).send('Error fetching planes');
    }
};

 
/**
 * Run querys for data used for reccomendations
 */
exports.getRecommendations = async (req, res) => {
    const { airportCode } = req.params;
    // The plane has completed its flight (1, 1) 
    // const parkedQuery = `SELECT DISTINCT flight_plans.acid, flight_plans.etd, flight_plans.eta FROM flight_plans WHERE flight_plans.arrival_airport = ? AND flight_plans.status = 'ARRIVED'`;
    const parkedQuery = 
        `SELECT 
            fp.acid, 
            MIN(
                (SELECT MIN(future_fp.etd) 
                FROM flight_plans future_fp 
                WHERE future_fp.acid = fp.acid 
                AND future_fp.departing_airport = ?
                AND future_fp.status = 'SCHEDULED'
                AND future_fp.etd > NOW()
                )
            ) AS event, 
            'Parked' AS status
        FROM flight_plans fp
        JOIN netjets_fleet nf ON fp.acid = nf.acid 
        WHERE fp.arrival_airport = ? 
        AND fp.status = 'ARRIVED'
        AND NOT EXISTS (
            -- Exclude planes that have departed from the airport after arrival
            SELECT 1 
            FROM flight_plans departed_fp 
            WHERE departed_fp.acid = fp.acid 
            AND departed_fp.departing_airport = ?
            AND departed_fp.etd > fp.eta
        )
        AND NOT EXISTS (
            -- Exclude planes that are currently in maintenance at the same airport
            SELECT 1 
            FROM flight_plans maintenance_fp 
            WHERE maintenance_fp.acid = fp.acid 
            AND maintenance_fp.departing_airport = fp.arrival_airport 
            AND maintenance_fp.status = 'MAINTENANCE'
        )
        GROUP BY fp.acid;
        `;
    const currentAirportCoordQuery = 'SELECT latitude_deg AS lat, longitude_deg AS lon FROM airport_data WHERE ident = ?';
    const allAirportCoordQuery = 'SELECT latitude_deg AS lat, longitude_deg AS lon, ident FROM airport_data WHERE ident != ?';

    // airports withing a certain range
    const closeAirportsQuery = 'SELECT latitude_deg AS lat, longitude_deg AS lon, ident FROM airport_data WHERE ident != ? AND latitude_deg BETWEEN (? - ?) AND (? + ?) AND longitude_deg BETWEEN (? - ?) AND (? + ?)';

    // Combine Parked at query with getting the current FBO - reccomend moving to different FBO
    try {
        const parkedPlanes = await new Promise((resolve, reject) => {
        db.query(parkedQuery, [airportCode, airportCode, airportCode], (err, results) => {
            if (err) {
            return reject(err);
            }
            resolve(results);
        });
        });

        // Get our airport coordinates
        const currentAirportCoord = await new Promise((resolve, reject) => {
        db.query(currentAirportCoordQuery, [airportCode], (err, results) => {
            if (err) {
            return reject(err);
            }
            resolve(results[0]);
        });
        });

        // Getting the ranges
        const [rangeLat, rangeLon] = generateDistance(currentAirportCoord);

        // Finding Airports withing 100KM
        const closeAirports = await new Promise((resolve, reject) => {
        db.query(closeAirportsQuery, [airportCode, currentAirportCoord.lat, rangeLat, currentAirportCoord.lat, rangeLat, currentAirportCoord.lon, rangeLon, currentAirportCoord.lon, rangeLon], (err, results) => {
            if (err) {
            return reject(err);
            }
            resolve(results);
        });
        });

        const sortedAirports = sortAirports(closeAirports, currentAirportCoord.lat, currentAirportCoord.lon);
        console.log('Current airport:', currentAirportCoord); // Debugging statement

        console.log('Closest airports sorted:', sortedAirports); // Debugging statement

        console.log('Parked planes:', parkedPlanes); // Debugging statement

        const sortedParkedPlanes = parkedPlanes.sort((a, b) => new Date(b.etd) - new Date(a.eta));
        const recommendations = generateRecommendations(sortedParkedPlanes, sortedAirports);

        res.json(recommendations);
    } catch (err) {
        console.error('Error fetching parked planes:', err);
        res.status(500).send('Error fetching parked planes');
    }
};



// REC Engine For Outputting Strings 
const generateRecommendations = (parkedPlanes, sortedAirports) => {
  const recommendations = [];
  const currentTime = new Date();
  closestAirport = sortedAirports[0].ident; // Closest airport 

  const overCapacity = "Airport is currently Over Capacity.";
  const underCapacity = "Airport is currently Under Capacity. ";
  const noMovement = "No Movement Required";

  const longTerm = "can be moved to long term parking";
  const otherFBO = "Can be relocated to ";
  const close = "Closest Airport can be reloacted to: K";

  if (Array.isArray(parkedPlanes) && parkedPlanes.length > 0) {
    parkedPlanes.forEach((plane) => {
      const etdDate = new Date(plane.event);
      const formattedDate = `${etdDate.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}, ${etdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      // Difference in time: If event more than 24hrs in advance, could be moved
      const hoursDifference = (etdDate - currentTime) / (1000 * 60 * 60);
      if (hoursDifference >= 24 || etdDate < currentTime) {
        // want to organize so 
        const recommendation = {
          tailNumber: plane.acid,
          status: "Parked",
          nextEvent: formattedDate,
          recString: `${underCapacity}`+`${close}` + `${closestAirport}`
          //`${longTerm}` // Example recommendation string
        };
        // console.log(plane);

        recommendations.push(recommendation);
      }
      
    });
  } else {
    // Return a single reccomendation if none are parked 
    const recommendation = {
      tailNumber: "Null",
      status: "Null",
      nextEvent: "Null",
      recString: "No Recommendations at this time"
    };

    recommendations.push(recommendation);
  }
  console.log('Recommendations:', recommendations); // Debugging statement
  return recommendations;   
};

// Get the distance range for running query for close airports 
const generateDistance = (currentAirport) => {
  const maxDistance = 50; // Distance KM
  // Approximate range
  const rangeLat = maxDistance / 111; // 1 deg lat apporox 111KM
  const rangeLon = maxDistance / (111 * Math.cos(currentAirport.lat * Math.PI / 180)); 
  // +/- this distance for query to get airports winin a 100km range 

  return [rangeLat, rangeLon];
};

// Haversine Distance Formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth Radius KM
  const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}


// Finding the closest airport sorting closest to farthest 
const sortAirports = (airports, currLat, currLon) => {
  return airports
  .map(airport => ({
      ...airport,
      distance: haversineDistance(currLat, currLon, airport.lat, airport.lon)
  }))
  .sort((a, b) => a.distance - b.distance);
};



exports.addMaintenance = (req, res) => {
    const {acid} = req.params;
    const { airport } = req.query;
    const recentRef = "SELECT flightRef FROM flight_plans WHERE acid = ? ORDER BY eta DESC LIMIT 1;"
    db.query(recentRef, [acid], (err, results) => {
        if(err) {
            console.error("Error fetching latest flightRef...", err);
            return res.status(500).json({error: "Error fetching latest flightRef..."})
        }
        const latestRef = results[0].flightRef
        const addRef = latestRef + "M";
        const query = "INSERT INTO flight_plans (flightRef, acid, departing_airport, status, eta) VALUES (?, ?, ?, 'MAINTENANCE', NOW());";
    
    db.query(query, [addRef, acid, airport], (err, results) => {
        if (err) {
            console.error("Error updating maintenance status...", err);
            res.status(500).json({error: "Error updating maintenance status..."});
        }
        else {
            res.json(results);
        }
    });
    })
    
};


exports.removeMaintenance = (req, res) => {
    const {acid} = req.params;
    const query = "DELETE FROM flight_plans WHERE acid = ? AND status = 'MAINTENANCE';"
    
    db.query(query, [acid], (err, results) => {
        if (err) {
            console.error("Error updating maintenance status...", err);
            res.status(500).json({error: "Error updating maintenance status..."});
        }
        else {
            res.json(results);
        }
    });
    
};

function runSimulationRequest(selectedPlanes, airportCode, db, res) {
    /*const fboQuery = `
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
            AND ap.coordinates IS NOT NULL
        GROUP BY 
            ap.id;
    `;*/

    const fboQuery = `
        SELECT 
            ap.*,
            ap.Total_Space,
            FLOOR(Parking_Space_Taken / 3) AS spots_taken
        FROM 
            airport_parking ap
        LEFT JOIN 
            parked_at pa ON pa.fbo_id = ap.id
        WHERE 
            ap.Airport_Code = ?
            AND ap.coordinates IS NOT NULL
        GROUP BY 
            ap.id;
    `;

    db.query(fboQuery, [airportCode], (err, fboData) => {
        if (err) {
            console.error('Error fetching FBO data:', err);
            res.status(500).json({ error: 'Error fetching FBO data' });
            return;
        }
        const simulationResult = {};
        let remainingPlanes = [...selectedPlanes];
        fboData.forEach(fbo => {
            const availableSpots = fbo.Total_Space - fbo.spots_taken;

            const planesForFBO = remainingPlanes.splice(0, availableSpots);
            
            planesForFBO.forEach(plane => {
                simulationResult[plane] = {
                    fbo_id: fbo.id,
                    fbo_name: fbo.FBO_Name
                };
            });
        });
        remainingPlanes.forEach(plane => {
            simulationResult[plane] = {
                fbo_id: null,
                fbo_name: "None Available"
            };
        });
        res.status(200).json({ success: true, data: simulationResult });
    });
}



exports.runSimulation = (req, res) => {
    try {
        const { selectedPlanes, airportCode } = req.body;
        runSimulationRequest(selectedPlanes, airportCode, db, res);
    } catch (error) {
        console.error('Error running simulation:', error);
        res.status(500).json({ success: false, message: 'Error running simulation' });
    }
};
