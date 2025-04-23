const db = require("../models/db");

//Helper function to convert the coordinates array to a WKT polygon string
function convertToPolygonWKT(coordinates){
  if (!coordinates || coordinates.length < 3){
    return null;
  }

  // copy of coordinates, get first and last vertex of the polygon, and then append the first point to end
  const coords = [...coordinates];
  const firstPoint = coords[0];
  const lastPoint = coords[coords.length - 1];
  if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng){
    coords.push(firstPoint);
  }
  // map each point to lat and long string, then join with commas
  const pointsStr = coords.map(point => `${point.lat} ${point.lng}`).join(', ');
  return `POLYGON((${pointsStr}))`;
}

// adds the fbo to the database
exports.addFBO = async (req, res) =>{
  try{
    const{
      Airport_Code,
      FBO_Name,
      Total_Space,
      Area_ft2,
      iata_code,
      coordinates,
    } = req.body;

    // query the database for the highest priority for the airport
    const [rows] = await db.promise().query(
      "SELECT MAX(Priority) as maxPriority FROM airport_parking WHERE Airport_Code = ?",
      [Airport_Code]
    );

    // default to 1 for priority, then if there is a existing priority then go to the next priority after the max
    let nextPriority = 1;
    if (rows && rows[0] && rows[0].maxPriority){
      nextPriority = rows[0].maxPriority + 1;
    }

    const polygonWKT = convertToPolygonWKT(coordinates);
    if (!polygonWKT){
      return res.status(400).json({ error: "Invalid polygon coordinates >:(" });
    }

    // insert the new fbo
    const [result] = await db.promise().query(
      `INSERT INTO airport_parking 
        (Airport_Code, FBO_Name, Total_Space, Area_ft2, iata_code, coordinates, Priority)
      VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?), ?)`,
      [
        Airport_Code,
        FBO_Name,
        Total_Space,
        Area_ft2,
        iata_code,
        polygonWKT,
        nextPriority,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      Airport_Code,
      FBO_Name,
      Total_Space,
      Area_ft2,
      iata_code,
      coordinates,
      Priority: nextPriority,
    });
  } catch (error){
    console.error("Error adding FBO >:(", error);
    res.status(500).json({error: "Error adding FBO >:("});
  }
};

// deletes the fbo in the database
exports.deleteFBO = async (req, res) =>{
  try{
    // extract fbo
    const fboId = req.params.id;

    // delete the query in the airport_parking table
    const [result] = await db.promise().query("DELETE FROM airport_parking WHERE id = ?",[fboId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({error: "FBO not found"});
    }

    res.status(200).json({message: "FBO deleted successfully :)"});
  } catch (error) {
    console.error("Error deleting FBO >:(", error);
    res.status(500).json({error: "Failed to delete FBO >:("});
  }
};

// updates the fbo with its new information
exports.updateFBO = async (req, res) => {
  try {
    const { 
      id, 
      FBO_Name, 
      Total_Space, 
      Area_ft2, 
      coordinates, 
      polygonWKT 
    } = req.body;

    // decides which polygon representation to use, either the WKT string the user inputed, or array of coords to WKT
    let polygon;
    if (polygonWKT){
      polygon = polygonWKT;
    }  
    else{
      polygon = convertToPolygonWKT(coordinates);
    }

    if (!polygon) {
      return res.status(400).json({ error: "Wrong polygon coordinates >:(" });
    }

    // update query
    const [result] = await db.promise().query(
      `UPDATE airport_parking
       SET FBO_Name = ?,
          Total_Space = ?,
          Area_ft2 = ?,
          coordinates = ST_GeomFromText(?)
       WHERE id = ?`,
      [FBO_Name, Total_Space, Area_ft2, polygon, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "FBO not found rip" });
    }

    res.status(200).json({ message: "FBO updated successfully!" });
  } catch (error) {
    console.error("Error updating FBO >:(", error);
    res.status(500).json({ error: "Error updating FBO >:(" });
  }
};
