const db = require('../models/db');

//Returns any airports that match the idents that is passed over in the req.body
exports.getExistingAirports = (req, res) => {
  console.log(req.body)
  const identArray = req.body.map(airport => airport.ident);
  const query = "SELECT ident FROM airport_data WHERE ident IN (?)"
  console.log(identArray);
  db.query(query, [identArray], (err, results) => {
    if (err) {
      console.error('Error inserting data into database:', err);
      res.status(500).json({ error: 'Unable to insert data' });
    }
    else {
      const returnResults = results.map(result => result.ident);
      console.log(returnResults);
      res.json(results);
  }});
}

//Inserts additional airports into the sql table (or updates them depending on if primary key -- ident -- already exists)
//Note on promises: I've figured out how to do sql statements iteratively without sending responses that break the backend before all the queries are done
//A promise essentially runs as a reject or resolve... if any of the promises are rejected then it will send an error to the front end
//If they are all resolved then it will just be like a normal return to the front end
exports.insertAirport = (req, res) => {
  const batchData = req.body; 
  const insertedAirports = [];
  const queries = batchData.map((airport) => {
      return new Promise((resolve, reject) => {
        console.log("airport: ", airport);
        const { ident, iata_code, name, latitude_deg, longitude_deg, airport_size, iso_country } = airport;
        const lat = parseFloat(latitude_deg);
        const long = parseFloat(longitude_deg);

        console.log(lat);
        console.log(long);
        const query = `INSERT INTO airport_data (ident, iata_code, name, latitude_deg, longitude_deg, type, iso_country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          ident = VALUES(ident),
          iata_code = VALUES(iata_code),
          name = VALUES(name),
          latitude_deg = VALUES(latitude_deg),
          longitude_deg = VALUES(longitude_deg),
          type = VALUES(type),
          iso_country = VALUES(iso_country)`;

        db.query(query, [ ident, iata_code, name, lat, long, airport_size, iso_country], (err, results) => {
          if (err) {
              console.error("Error fetching arriving planes...", err);
              reject(err);
          } else {
            insertedAirports.push(ident);
            resolve(results);
          }
      });
    });
  });
  Promise.all(queries).then(() => {
    res.status(200).json({ message: "Successful", insertedAirports});
  }).catch((error) => {
    console.error("Error: ", error);
    res.status(500).json({ error: "error"});
  })
}
/**
 * Grab all FBOs at an existing airport 
 * For checking if the FBOs already exist in the database before inserting them 
 */
exports.getExistingFBOs = (req, res) => {
  const identArray = req.body.map(airport => airport.Airport_Code);
  const query = "SELECT Airport_Code AS ident, FBO_Name FROM airport_parking WHERE Airport_Code IN (?)"
  db.query(query, [identArray], (err, results) => {
    if (err) {
      console.error('Error inserting data into database:', err);
      res.status(500).json({ error: 'Unable to insert data' });
    }
    else {
      const grouped = {};
      for (const row of results) {
        if (!grouped[row.ident]) { grouped[row.ident] = []; }
        grouped[row.ident].push(row.FBO_Name);
      }
      res.json(grouped);
  }});
}

/**
 * Insert an FBO into the database
 * Defaults are set for Parking_Space_Taken and Area_ft2
 * If the FBO already exists, it will update the existing entry
 */
exports.insertFBO = (req, res) => {
  const batchData = req.body;
  const insertedFBOs = [];

  const queries = batchData.map((fbo) => {
    return new Promise((resolve, reject) => {
      const { Airport_Code, FBO_Name, Total_Space, iata_code, priority, coordinates, Parking_Space_Taken = 0, Area_ft2 = 0 } = fbo;
      
      // Default to empty polygon if invalid or missing
      const coordinatesValue = coordinates && coordinates.startsWith('POLYGON')
        ? coordinates
        : null;

        const query = `
          INSERT INTO airport_parking 
            (Airport_Code, FBO_Name, Total_Space, iata_code, priority, coordinates, Area_ft2)
          VALUES (?, ?, ?, ?, ?, ${coordinatesValue ? 'ST_GeomFromText(?)' : 'NULL'}, ?)
          ON DUPLICATE KEY UPDATE 
            Airport_Code = VALUES(Airport_Code),
            FBO_Name = VALUES(FBO_Name),
            Total_Space = VALUES(Total_Space),
            iata_code = VALUES(iata_code),
            priority = VALUES(priority),
            coordinates = ${coordinatesValue ? 'ST_GeomFromText(VALUES(coordinates))' : 'NULL'},
            Area_ft2 = VALUES(Area_ft2)
        `;


        const values = coordinatesValue 
        ? [Airport_Code, FBO_Name, Total_Space, iata_code, priority, coordinatesValue, Parking_Space_Taken, Area_ft2]
        : [Airport_Code, FBO_Name, Total_Space, iata_code, priority, Parking_Space_Taken, Area_ft2];
      
      db.query(query, values, (err, results) => {
        if (err) {
          console.error("Error inserting FBO:", err);
          reject(err);
        } else {
          insertedFBOs.push(FBO_Name);
          resolve(results);
        }
      });
    });
  });

  Promise.all(queries)
    .then(() => {
      res.status(200).json({ message: "Successful", insertedFBOs });
    })
    .catch((error) => {
      console.error("Error: ", error);
      res.status(500).json({ error: "error" });
    });
};
