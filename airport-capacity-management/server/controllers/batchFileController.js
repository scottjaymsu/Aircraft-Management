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
        const { ident, iata_code, name, latitude_deg, longitude_deg, iso_country, iso_region, municipality } = airport;
        const lat = parseFloat(latitude_deg);
        const long = parseFloat(longitude_deg);

        console.log(lat);
        console.log(long);
        const query = `INSERT INTO airport_data (ident, iata_code, name, latitude_deg, longitude_deg, iso_country, iso_region, municipality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          iata_code = VALUES(iata_code),
          name = VALUES(name),
          latitude_deg = VALUES(latitude_deg),
          longitude_deg = VALUES(longitude_deg),
          iso_country = VALUES(iso_country),
          iso_region = VALUES(iso_region),
          municipality = VALUES(municipality)`;

        db.query(query, [ ident, iata_code, name, lat, long, iso_country, iso_region, municipality], (err, results) => {
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
