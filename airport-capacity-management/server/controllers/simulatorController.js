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

// Get all info for sizes of planes
exports.getPlaneTypes = (req, res) => {
    const query = `
        SELECT type
        FROM aircraft_types
        WHERE size IS NOT NULL AND size <> ''`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching plane types:', err);
            res.status(500).send('Error fetching plane types');
            return;
        }
        res.json(results);
    });
};

// Get all info for sizes of planes
exports.getPlaneSizes = (req, res) => {
    const query = `
        SELECT DISTINCT size
        FROM aircraft_types
        WHERE size IS NOT NULL AND size <> ''`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching plane sizes:', err);
            res.status(500).send('Error fetching plane sizes');
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
            // Also: parked_at uses slightly different names - somehow alter to match on db or 
            const query = `
                SELECT 
                    fp.acid,
                    -- Account for duplicate entries 
                    MIN(
                        -- Assign Next Event if exists
                        (SELECT MIN(future_fp.etd) 
                        FROM flight_plans future_fp 
                        WHERE future_fp.acid = fp.acid 
                        AND future_fp.departing_airport = ?
                        AND future_fp.status = 'SCHEDULED'
                        AND future_fp.etd > NOW())
                    ) AS event,
                    MIN(nf.plane_type) AS plane_type,
                    'Parked' AS status,
                    MIN(arr.size) AS size,
                    MIN(ap.FBO_name) AS FBO_name
                FROM flight_plans fp
                JOIN netjets_fleet nf ON fp.acid = nf.acid 
                LEFT JOIN aircraft_types arr ON nf.plane_type = arr.type
                LEFT JOIN parked_at pa ON fp.acid = pa.acid
                LEFT JOIN airport_parking ap ON pa.fbo_id = ap.id
                WHERE fp.arrival_airport = ?
                AND fp.status = 'ARRIVED'
                
                AND NOT EXISTS (
                    -- Exclude planes that are currently in maintenance at the same airport
                    SELECT 1 
                    FROM flight_plans maintenance_fp 
                    WHERE maintenance_fp.acid = fp.acid 
                    AND maintenance_fp.departing_airport = fp.arrival_airport 
                    AND maintenance_fp.status = 'MAINTENANCE')
                GROUP BY fp.acid
                ORDER BY fp.acid ASC
            `;
    
            db.query(query, [airportCode, airportCode], (err, results) => {
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
                LEFT JOIN parked_at pa ON fp.acid = pa.acid  
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
                LEFT JOIN parked_at pa ON fp.acid = pa.acid  
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
            LEFT JOIN parked_at pa ON fp.acid = pa.acid 
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
          recString: `K${closestAirport}`
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

function getAirportFBOs(airportCode, callback) {
    const fboQuery = "SELECT * FROM airport_parking WHERE Airport_Code = ?;";
    db.query(fboQuery, [airportCode], (err, fboData) => {
        const fboInfo = {};

        fboData.forEach(fbo => {
            fboInfo[fbo.id] = {
                fbo_name: fbo.FBO_Name,
                capacity: fbo.Total_Space
            };
        });
        callback(null, fboInfo);
    });
}

/* The actual functionality for determining when a plane has space at an FBO. */
function runSimulationRequest(selectedPlanes, planeTime, airportCode, db, res) {

    //Now that we are adjusting fbo data inside of the sql  loop, we don't need this function, but keeping functionality incase an issue arises
    getAirportFBOs(airportCode, (err, airportFBOs) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching FBO data' });
            return;
        }

        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const additionalSpaceByFBO = {};
        const simulationResult = {};

        /* The selected planes come in top to bottom based on when the user clicked them to add them to the table. However, for this simulator to be accurate we need to sort
        these planes based on the time the user selected for them. Earlier ones should be simulated first and then later ones will factor those earlier ones into the calculations. */
        selectedPlanes.sort((planeA, planeB) => {
            const timeA = planeTime[planeA] || today.toTimeString().split(' ')[0].substring(0, 5);
            const timeB = planeTime[planeB] || today.toTimeString().split(' ')[0].substring(0, 5);
            return timeA.localeCompare(timeB);
        });

        processNextPlane(0);
        function processNextPlane(index) {
            if (index >= selectedPlanes.length) {
                res.status(200).json({ success: true, data: simulationResult });
                return;
            }
            
            const currentPlane = selectedPlanes[index];
            /* This is where the times are determined. If there is a match in planeTime array ( a user specified a time for the plane ) it will grab that. If not, it just uses the current
            time that the user is simulating at. */
            const planeTimeFormatted = planeTime[currentPlane] || today.toTimeString().split(' ')[0].substring(0, 5);
            const formattedTime = `${dateString} ${planeTimeFormatted}:00`;

            const getPlaneInfoQuery = "SELECT nf.plane_type, at.parkingArea FROM netjets_fleet nf JOIN aircraft_types at ON nf.plane_type = at.type WHERE nf.acid = ? LIMIT 1;"
            db.query(getPlaneInfoQuery, [currentPlane], (err, planeInfoResult) => {
                if (err || planeInfoResult.length === 0) {
                    console.error('Error fetching plane type/parkingArea:', err);
                    simulationResult[currentPlane] = {
                        fbo_id: null,
                        fbo_name: "Error Getting Plane Info"
                    };
                    processNextPlane(index + 1);
                    return;
                }
                const { plane_type, parkingArea } = planeInfoResult[0];
                // This is the original query that just factors in parking space without space of plane.
            /*const fboQuery = `
                WITH arrived_planes AS (SELECT flight_plans.fbo_id, netjets_fleet.acid FROM netjets_fleet
                JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.arrival_airport = ?),
                scheduled_arrivals AS (SELECT fbo_id FROM flight_plans WHERE arrival_airport = ? AND status = "SCHEDULED" AND eta <= ?),
                scheduled_departures AS (SELECT fbo_id FROM flight_plans WHERE departing_airport = ? AND status = "SCHEDULED" AND eta > ?),
                plane_counts AS (
                    SELECT fbo_id, COUNT(acid) AS arrived_count, 0 AS scheduled_arrival_count, 0 AS scheduled_departure_count
                    FROM arrived_planes GROUP BY fbo_id
                    UNION ALL SELECT fbo_id, 0, COUNT(fbo_id), 0
                    FROM scheduled_arrivals GROUP BY fbo_id
                    UNION ALL SELECT fbo_id, 0, 0, COUNT(fbo_id)
                    FROM scheduled_departures GROUP BY fbo_id
                )
                SELECT ap.*, ap.Total_Space, COALESCE(SUM(plane_counts.arrived_count), 0) + COALESCE(SUM(plane_counts.scheduled_arrival_count), 0) - COALESCE(SUM(plane_counts.scheduled_departure_count), 0) AS spots_taken
                FROM airport_parking ap LEFT JOIN plane_counts ON plane_counts.fbo_id = ap.id WHERE ap.Airport_Code = ? GROUP BY ap.id ORDER BY ap.Priority;`;*/

                //This new query factors in the space of planes rather than just one parking spot (fbo space divided by 10 to ensure simulator functionality, but should be considered in full in real scenarios)
                const fboQuery = `WITH arrived_planes AS (
                    SELECT flight_plans.fbo_id, netjets_fleet.acid, netjets_fleet.plane_type
                    FROM netjets_fleet
                    JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef
                    WHERE flight_plans.arrival_airport = ?
                ),
                scheduled_arrivals AS (
                    SELECT fbo_id, netjets_fleet.acid, netjets_fleet.plane_type
                    FROM flight_plans
                    JOIN netjets_fleet ON flight_plans.flightRef = netjets_fleet.flightRef
                    WHERE arrival_airport = ?
                    AND status = 'SCHEDULED' AND eta <= ?
                ),
                scheduled_departures AS (
                    SELECT fbo_id, netjets_fleet.acid, netjets_fleet.plane_type
                    FROM flight_plans
                    JOIN netjets_fleet ON flight_plans.flightRef = netjets_fleet.flightRef
                    WHERE departing_airport = ?
                    AND status = 'SCHEDULED' AND eta > ?
                ),
                plane_areas AS (
                    SELECT fbo_id, SUM(parkingArea * 1.1) AS arrived_area, 0 AS scheduled_arrival_area, 0 AS scheduled_departure_area
                    FROM arrived_planes
                    JOIN aircraft_types ON arrived_planes.plane_type = aircraft_types.type
                    GROUP BY fbo_id UNION ALL
                    SELECT fbo_id, 0, SUM(parkingArea * 1.1), 0
                    FROM scheduled_arrivals
                    JOIN aircraft_types ON scheduled_arrivals.plane_type = aircraft_types.type
                    GROUP BY fbo_id UNION ALL
                    SELECT fbo_id, 0, 0, SUM(parkingArea * 1.1)
                    FROM scheduled_departures
                    JOIN aircraft_types ON scheduled_departures.plane_type = aircraft_types.type
                    GROUP BY fbo_id
                )
                SELECT
                    ap.*,ap.Area_ft2/5 AS Area_ft2,
                    COALESCE(SUM(plane_areas.arrived_area), 0) + COALESCE(SUM(plane_areas.scheduled_arrival_area), 0) - COALESCE(SUM(plane_areas.scheduled_departure_area), 0) AS space_taken
                FROM airport_parking ap
                LEFT JOIN plane_areas ON plane_areas.fbo_id = ap.id
                WHERE ap.Airport_Code = ?
                GROUP BY ap.id
                ORDER BY ap.Priority;`

                db.query(fboQuery, [airportCode, airportCode, formattedTime, airportCode, formattedTime, airportCode], (err, fboData) => {
                    if (err) {
                        console.error('Error fetching FBO data for plane:', err);
                        simulationResult[currentPlane] = {
                            fbo_id: null,
                            fbo_name: "Error Processing"
                        };
                        processNextPlane(index + 1);
                        return;
                    }
                    /* The simulation is useless if we don't factor in the previous planes we've already simulated, so the FBOData has to be
                    adjusted to account for those additional planes that have already been "simulated" to enter that FBO */
                    const adjustedFBOData = fboData.map(fbo => {
                        const fboClone = {...fbo};
                        if (additionalSpaceByFBO[fbo.id]) {
                            fboClone.space_taken += additionalSpaceByFBO[fbo.id];
                        }
                        return fboClone;}
                    );

                    /* Loop through all the fbos in the adjusted fbo data -- if there are available spots then assign it to that FBO and break the loop. If it never gets assigned, that means there
                    was no space to assign it and should not have an fbo assigned. */
                    let assignedFBO = null;
                    for (const fbo of adjustedFBOData) {
                        const availableSpots = fbo.Area_ft2 - fbo.space_taken;
                        const paddedArea = parkingArea * 1.1;
                        if (availableSpots >= paddedArea) {
                            assignedFBO = fbo;
                            additionalSpaceByFBO[fbo.id] = (additionalSpaceByFBO[fbo.id] || 0) + parkingArea;
                            break;
                        }
                    }

                    if (assignedFBO) {
                        simulationResult[currentPlane] = {
                            fbo_id: assignedFBO.id,
                            fbo_name: assignedFBO.FBO_Name
                        };
                    }
                    else {
                        simulationResult[currentPlane] = {
                            fbo_id: null,
                            fbo_name: "None Available"
                        };
                    }
                    processNextPlane(index + 1);
                });
            });
        }
    });
}

exports.runSimulation = (req, res) => {
    try {
        const { selectedPlanes, planeTimes, airportCode } = req.body;
        runSimulationRequest(selectedPlanes, planeTimes, airportCode, db, res);
    } catch (error) {
        console.error('Error running simulation:', error);
        res.status(500).json({ success: false, message: 'Error running simulation' });
    }
};
