const db = require('../models/db');

//  Find out if airports are under or over capacity -- Not sure if this was done for frontend yet
exports.getCurrentAirportStatus = async (req, res) => {
    const { iata_code } = req.params;

    const query = '';
    try { 
        const currStatus = await new Promise((resolve, reject) => {
            db.query(query, ['k'+iata_code], (err, results) => {
              if (err) {
                return reject(err);
              }
              resolve(results);
            });
        });

        const allStatus = currStatusStringGen(currStatus);
        res.json(allStatus);

    } catch (err) {
        console.error('Error fetching current status:', err);
        res.status(500).send('Error fetching current status');
    }
};

const currStatusStringGen = (status) => {
    const allStatus = [];
    const over = " is currently over capacity.";
    const under = " is currently under capacity.";
    status.forEach((airport) => {
        const s = {
            statStr: airport.ident + (airport.current_load > airport.capacity ? over : under),
        };
        allStatus.push(s);
    });
        
    return allStatus;
};

    


//This query essentially grabs the data related to all the fbo capacities at each airport and groups them all together as one. It then
//determines a capacity status based on if the current planes at the airport (gotten froma flight plans table) is over or under the total
//fbo capacity. I put reaching capacity as 90% of the total capacity, it can be changed later. Also returns some metadata related to long and lat
exports.getAirportMarkers = async (req, res) => {
    const query = `SELECT ad.ident, ad.latitude_deg, ad.longitude_deg,
    COALESCE(COUNT(DISTINCT netjets_fleet.flightRef), 0) AS total_planes,
    COALESCE(capacity_info.capacity, 0) AS capacity,
    CASE WHEN COALESCE(COUNT(DISTINCT netjets_fleet.flightRef), 0) >= COALESCE(capacity_info.capacity, 0) THEN 'Overcapacity'
        WHEN COALESCE(COUNT(DISTINCT netjets_fleet.flightRef), 0) >= (0.75 * COALESCE(capacity_info.capacity, 0)) THEN 'Reaching Capacity'
        ELSE 'Undercapacity'
    END AS capacity_status,
    CASE WHEN COALESCE(capacity_info.capacity, 0) = 0 THEN 0
        ELSE COALESCE(COUNT(DISTINCT netjets_fleet.flightRef), 0) / COALESCE(capacity_info.capacity, 0) 
    END AS capacity_percentage
    FROM airport_data ad 
    INNER JOIN airport_parking ap ON ad.ident = ap.Airport_Code
    LEFT JOIN flight_plans ON flight_plans.arrival_airport = ad.ident AND flight_plans.status = 'ARRIVED'
    LEFT JOIN netjets_fleet ON netjets_fleet.flightRef = flight_plans.flightRef
    LEFT JOIN ( SELECT ap.Airport_Code, SUM(ap.Total_Space) AS capacity FROM airport_parking ap GROUP BY ap.Airport_Code) AS capacity_info ON ad.ident = capacity_info.Airport_Code
    GROUP BY ad.ident, ad.latitude_deg, ad.longitude_deg;`
    
    db.query(query, [], (err, results) => {
        if (err) {
            console.error("Error fetching airport data...", err);
            res.status(500).json({error: "Error fetching airport data..."});
        }
        else {
            const formattedResults = results.map((row) => ({
                position: {
                    lat: parseFloat(row.latitude_deg),
                    lng: parseFloat(row.longitude_deg)
                },
                title: row.ident,
                capacity: row.capacity,
                total_planes: row.total_planes,
                status: row.capacity_status,
                capacity_percentage: row.capacity_percentage
            }))
            res.json(formattedResults);
        }
    });
};

/* This grabs all airports that DO NOT EXIST in the airport_parking table (ie they do not have any fbos associated with them) */
exports.getSmallAirportMarkers = async (req, res) => {
    const query = `SELECT ad.ident, ad.latitude_deg, ad.longitude_deg, ad.type
    FROM airport_data ad 
    WHERE NOT EXISTS (SELECT 1 FROM airport_parking WHERE airport_parking.Airport_Code = ad.ident)`
    
    db.query(query, [], (err, results) => {
        if (err) {
            console.error("Error fetching airport data...", err);
            res.status(500).json({error: "Error fetching airport data..."});
        }
        else {
            const formattedResults = results.map((row) => ({
                position: {
                    lat: parseFloat(row.latitude_deg),
                    lng: parseFloat(row.longitude_deg)
                },
                type: row.type,
                title: row.ident,
            }))
            res.json(formattedResults);
        }
    });
};