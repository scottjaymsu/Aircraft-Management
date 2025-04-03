const db = require("../models/db");

//Helper function to convert the coordinates array to a WKT polygon string
function convertToPolygonWKT(coordinates){
  if (!coordinates || coordinates.length < 3){
    return null;
  }
  const coords = [...coordinates];
  const firstPoint = coords[0];
  const lastPoint = coords[coords.length - 1];
  if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng){
    coords.push(firstPoint);
  }
  const pointsStr = coords.map(point => `${point.lat} ${point.lng}`).join(', ');
  return `POLYGON((${pointsStr}))`;
}

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

    const [rows] = await db.promise().query(
      "SELECT MAX(Priority) as maxPriority FROM airport_parking WHERE Airport_Code = ?",
      [Airport_Code]
    );

    let nextPriority = 1;
    if (rows && rows[0] && rows[0].maxPriority){
      nextPriority = rows[0].maxPriority + 1;
    }

    const polygonWKT = convertToPolygonWKT(coordinates);
    if (!polygonWKT){
      return res.status(400).json({ error: "Invalid polygon coordinates >:(" });
    }

    const [result] = await db.promise().query(
      `INSERT INTO airport_parking 
        (Airport_Code, FBO_Name, Parking_Space_Taken, Total_Space, Area_ft2, iata_code, coordinates, Priority)
      VALUES (?, ?, ?, ?, ?, ?, ST_GeomFromText(?), ?)`,
      [
        Airport_Code,
        FBO_Name,
        0,
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
      Parking_Space_Taken: 0,
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

exports.deleteFBO = async (req, res) =>{
  try{
    const fboId = req.params.id;
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

exports.updateFBO = async (req, res) => {
  try {
    const { id, FBO_Name, Total_Space, Area_ft2, coordinates, polygonWKT } = req.body;

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
