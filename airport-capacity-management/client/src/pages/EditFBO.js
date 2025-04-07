import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, Polygon, DrawingManager } from "@react-google-maps/api";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const mapOptions = {
  mapTypeId: "satellite",
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  tilt: 0,
  styles: [
    {featureType: "poi", elementType: "labels", stylers: [{visibility: "off"}]},
    {featureType: "transit", elementType: "labels", stylers: [{visibility: "off"}]},
    {featureType: "road", elementType: "labels", stylers: [{visibility: "off"}]},
    {featureType: "administrative", elementType: "labels", stylers: [{visibility: "off"}]},
  ],
};

//Function to help get the WKT formatted polygon to work with the rest of the code
const parseWKTPolygon = (wkt) =>{
  if (!wkt.startsWith("POLYGON(") && !wkt.startsWith("POLYGON (")) {
    console.error("Invalid WKT format noooooooooo >:(", wkt);
    return [];
  }
  wkt = wkt.replace("POLYGON (", "POLYGON(");
  const coordinateStr = wkt.slice(8, -1);
  const points = coordinateStr.split(",");
  return points.map((pt) =>{
    const [lng, lat] = pt.trim().split(/\s+/).map(Number);
    return {lat, lng};
  });
};

function EditFBO() {
  const {airportCode, fboId} = useParams();
  const navigate = useNavigate();
  const polygonRef = useRef(null);
  const mapRef = useRef(null);

  const [polygonPath, setPolygonPath] = useState([]);
  const [polygonArea, setPolygonArea] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [fboName, setFboName] = useState("");
  const [planeFootprint, setPlaneFootprint] = useState(0);
  const [drawingMode, setDrawingMode] = useState(null);
  const [capacityInput, setCapacityInput] = useState("");

  const [airportCoordinates, setAirportCoordinates] = useState({lat: 40.84, lng: -74.07});
  const [mapCenter, setMapCenter] = useState({lat: 40.84, lng: -74.07});

  //Get the airport data and updating both airportCoordinates and mapCenter
  useEffect(() =>{
    async function fetchAirportData() {
      try {
        const response = await axios.get(`http://localhost:5001/airports/getAirportData/${airportCode}`);
        if (response.data && response.data[0]){
          const { latitude_deg, longitude_deg } = response.data[0];
          const lat = parseFloat(latitude_deg);
          const long = parseFloat(longitude_deg);
          const adjustedCoordinates = {
            lat: lat,
            lng: long - 0.011,
          };
          setAirportCoordinates(adjustedCoordinates);
          setMapCenter(adjustedCoordinates);
        } 
        else{
          console.warn("No data returned for airport:", airportCode);
        }
      } 
      catch (error) {
        console.error("Error fetching airport data  >:(", error);
      }
    }
    if (airportCode){
      fetchAirportData();
    }
  }, [airportCode]);

  //Calculating and seting the default plane footprint
  useEffect(() =>{
    const defaultPlane = {length: 15.64, wingspan: 15.91};
    const lengthFt = defaultPlane.length * 3.28084;
    const wingspanFt = defaultPlane.wingspan * 3.28084;
    const defaultPlaneFootprint = (lengthFt + 25 * 2) * (wingspanFt + 25 * 2);
    setPlaneFootprint(defaultPlaneFootprint);
  }, []);

  //Geting FBO data and seting polygon, FBO name, capacity, and update map center
  useEffect(() =>{
    axios
      .get(`http://localhost:5001/airports/getParkingCoordinates/${airportCode}`)
      .then((response) => {
        const data = response.data;
        const fbo = data.find((item) => String(item.id) === String(fboId));
        if (!fbo){
          alert("FBO not found");
          navigate(-1);
          return;
        }
        setFboName(fbo.FBO_Name);
        setCapacity(fbo.Total_Space);

        if (fbo.airportCoordinates){
          setMapCenter(fbo.airportCoordinates);
        }

        let coords = [];
        if (typeof fbo.coordinates === "string"){
          coords = parseWKTPolygon(fbo.coordinates);
        } 
        else if (Array.isArray(fbo.coordinates) && fbo.coordinates.length > 0){
          coords = fbo.coordinates[0].map((coord) =>({
            lat: coord.x,
            lng: coord.y,
          }));
        }
        setPolygonPath(coords);

        if (coords.length > 0 && window.google && window.google.maps && window.google.maps.geometry){
          const mvcArray = new window.google.maps.MVCArray(
            coords.map((point) => new window.google.maps.LatLng(point.lat, point.lng))
          );
          const area = window.google.maps.geometry.spherical.computeArea(mvcArray);
          setPolygonArea(area);
        }
      })
      .catch((error) =>{
        console.error("Error fetching FBO data   >:(", error);
        alert("Error fetching FBO data >:(");
        navigate(-1);
      });
  }, [airportCode, fboId, navigate]);

  //Storing the map instance when it loads
  const onMapLoad = (map) =>{
    mapRef.current = map;
  };

  //When a polygon is made, attach listeners to update its path
  const onPolygonLoad = (polygon) =>{
    polygonRef.current = polygon;
    const path = polygon.getPath();
    path.addListener("set_at", () => updatePolygonPath(polygon));
    path.addListener("insert_at", () => updatePolygonPath(polygon));
    path.addListener("remove_at", () => updatePolygonPath(polygon));
  };

  //Update polygon path, area, and capacity when polygon vertices change
  const updatePolygonPath = (polygon) =>{
    const path = polygon.getPath();
    const newCoords = [];
    for (let i = 0; i < path.getLength(); i++){
      const latLng = path.getAt(i);
      newCoords.push({lat: latLng.lat(), lng: latLng.lng()});
    }
    setPolygonPath(newCoords);
    if (window.google?.maps?.geometry){
      const mvcArray = new window.google.maps.MVCArray(
        newCoords.map((point) => new window.google.maps.LatLng(point.lat, point.lng))
      );
      const newArea = window.google.maps.geometry.spherical.computeArea(mvcArray);
      setPolygonArea(newArea);
      const areaFt2 = newArea * 10.7639;
      setCapacity(Math.floor(areaFt2 / planeFootprint));
    }
  };

  //Handler for when a new polygon is drawn
  const onPolygonComplete = (polygon) =>{
    const path = polygon.getPath().getArray().map((latlng) =>({
      lat: latlng.lat(),
      lng: latlng.lng(),
    }));
    setPolygonPath(path);
    if (window.google?.maps?.geometry){
      const area = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
      setPolygonArea(area);
      const areaFt2 = area * 10.7639;
      setCapacity(Math.floor(areaFt2 / planeFootprint));
    }
    polygon.setMap(null);
    setDrawingMode(null);
  };

  const handleRemovePolygon = () =>{
    setPolygonPath([]);
    setPolygonArea(0);
    setCapacity(0);
    setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
  };

  const handleDrawPolygon = () =>{
    setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
  };

  const handleCapacityChange = (e) =>{
    const value = e.target.value;
    if (value === ""){
      setCapacity("");
    } 
    else{
      const numValue = parseFloat(value);
      if (!isNaN(numValue)){
        setCapacity(Math.ceil(numValue));
      }
    }
  };

  const handlePlaneFootprintChange = (e) =>{
    const newFootprint = Number(e.target.value);
    setPlaneFootprint(newFootprint);
    if (polygonArea > 0){
      const areaFt2 = polygonArea * 10.7639;
      setCapacity(Math.floor(areaFt2 / newFootprint));
    }
  };

  //Convert the polygon path into a WKT string
  const convertToPolygonWKT = (coordinates) =>{
    if (!coordinates || coordinates.length < 3) return null;
    const coords = [...coordinates]; //spread op
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng){
      coords.push(first);
    }
    const pointsStr = coords.map((point) => `${point.lat} ${point.lng}`).join(", ");
    return `POLYGON((${pointsStr}))`;
  };

  const handleSaveChanges = () =>{
    if (!fboName){
      alert("Please enter an FBO name");
      return;
    }
    if (polygonPath.length < 3){
      alert("Parking area must have at least 3 points");
      return;
    }
    const polygonWKT = convertToPolygonWKT(polygonPath);
    if (!polygonWKT){
      alert("Invalid parking area coordinates");
      return;
    }
    const areaFt2 = polygonArea * 10.7639;
    const payload = {
      id: fboId,
      FBO_Name: fboName,
      Total_Space: capacity,
      Area_ft2: areaFt2,
      coordinates: polygonPath,
      polygonWKT: polygonWKT,
    };

    axios
      .patch("http://localhost:5001/airports/fbo/updateFBO", payload)
      .then((response) =>{
        alert("FBO updated successfully!");
        navigate(-1);
      })
      .catch((error) =>{
        console.error("Error updating FBO  >:(", error);
        alert("Error updating FBO  >:(");
      });
  };

  const handleCancel = () =>{
    navigate(`/summary/${airportCode}`);
  };

  return (
    <div className="map-container" style={{position: "relative"}}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={15}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {polygonPath.length === 0 && drawingMode && (
          <DrawingManager
            drawingMode={drawingMode}
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: "#B9BE80",
                fillOpacity: 0.35,
                strokeColor: "#B9BE80",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                editable: true,
              },
            }}
          />
        )}
        {polygonPath.length > 0 && (
          <Polygon
            path={polygonPath}
            editable
            onLoad={onPolygonLoad}
            options={{
              fillColor: "#B9BE80",
              fillOpacity: 0.35,
              strokeColor: "#B9BE80",
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>
      <div
        className="info-card"
        style={{
          width: "25%",
          padding: "20px",
          background: "#eae8e6",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <img onClick={handleCancel} className="back-button" src="/back-arrow.png" alt="Back Button" style={{ cursor: "pointer", marginBottom: "16px" }}/>
        <div>
          <h2 className="title" style={{textAlign: "center", marginBottom: "16px", marginTop: "20px", marginLeft: "-10px"}}>
            Edit FBO
          </h2>
          <div style={{marginBottom: "16px"}}>
            <label style={{width: "100%"}}>
              Name:{" "}
              <input
                type="text"
                value={fboName}
                onChange={(e) => setFboName(e.target.value)}
                style={{width: "90%", padding: "8px", marginTop: "5px"}}
                placeholder="Enter FBO name"
              />
            </label>
          </div>
          {polygonPath.length === 0 ? (
            <>
              <p>Parking area removed.</p>
              <button
                className="fbo-action-button"
                onClick={handleDrawPolygon}
                style={{marginBottom: "16px", width: "90%"}}
              >
                Draw parking area
              </button>
            </>
          ) : (
            <button
              className="fbo-action-button"
              onClick={handleRemovePolygon}
              style={{marginBottom: "16px", width: "90%"}}
            >
              Remove Parking Area
            </button>
          )}
          {polygonArea > 0 && (
            <p style={{fontSize: "1rem", textAlign: "center"}}>
              Parking Area: {(polygonArea * 10.7639).toFixed(2)} ft<sup>2</sup>
            </p>
          )}
          {polygonArea > 0 && (
            <>
              <div style={{marginBottom: "16px"}}>
                <label style={{width: "90%"}}>
                  Adjust Plane Footprint (ft²):
                  <input
                    type="range"
                    min="5000"
                    max="15000"
                    step="100"
                    value={planeFootprint}
                    onChange={handlePlaneFootprintChange}
                    style={{width: "90%", marginTop: "5px"}}
                  />
                </label>
                <p style={{textAlign: "center", margin: "5px 0"}}>
                  {planeFootprint.toFixed(0)} ft²
                </p>
              </div>
              <div style={{marginBottom: "16px"}}>
                <label style={{width: "90%"}}>
                  Capacity:{" "}
                  <input
                    type="number"
                    value={capacity}
                    onChange={handleCapacityChange}
                    style={{width: "90%", padding: "8px", marginTop: "5px"}}
                  />
                </label>
              </div>
            </>
          )}
          <button
            onClick={handleSaveChanges}
            className="fbo-action-button"
            style={{marginTop: "16px", width: "90%"}}
          >
            Save Changes
          </button>
          <button
            onClick={handleCancel}
            className="fbo-action-button"
            style={{marginTop: "16px", width: "90%"}}
          >
            Cancel
          </button>
        </div>
        <p style={{fontSize: "0.9em", textAlign: "center", marginTop: "16px"}}>
          Drag polygon vertices to adjust the parking area.
        </p>
      </div>
    </div>
  );
}

export default EditFBO;
