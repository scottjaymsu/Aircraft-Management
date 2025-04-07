import React, { useState, useEffect } from "react";
import { GoogleMap, DrawingManager, Polygon } from "@react-google-maps/api";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import FBOComponent from "../components/FBOComponent";

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
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};

const BUFFER_FEET = 25;
const defaultPlane = { length: 15.64, wingspan: 15.91 };
const lengthFt = defaultPlane.length * 3.28084;
const wingspanFt = defaultPlane.wingspan * 3.28084;
const defaultPlaneFootprint = (lengthFt + BUFFER_FEET * 2) * (wingspanFt + BUFFER_FEET * 2);

function AddFBOPage() {
  const {airportCode} = useParams();
  const navigate = useNavigate();

  const [map, setMap] = useState(null);
  
  const [airportCoordinates, setAirportCoordinates] = useState({lat: 40.84, lng: -74.07});
  const [polygonPath, setPolygonPath] = useState([]);
  const [polygonArea, setPolygonArea] = useState(0);
  const [drawingMode, setDrawingMode] = useState(null);
  const [capacity, setCapacity] = useState(0);
  const [capacityInput, setCapacityInput] = useState("");
  const [fboName, setFboName] = useState("");
  const [fboList, setFboList] = useState([]);

  const [planeFootprint, setPlaneFootprint] = useState(defaultPlaneFootprint);

  const handleMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  useEffect(() => {
    if (map) {
      map.panTo(airportCoordinates);
    }
  }, [map, airportCoordinates]);

  useEffect(() => {
    async function fetchAirportData() {
      try {
        const response = await axios.get(`http://localhost:5001/airports/getAirportData/${airportCode}`);
        console.log("API response data:", response.data);
        if (response.data && response.data[0]) {
          const { latitude_deg, longitude_deg } = response.data[0];
          const lat = parseFloat(latitude_deg);
          const long = parseFloat(longitude_deg);
          setAirportCoordinates({
            lat: lat,
            lng: long - 0.011,
          });
        } else {
          console.warn("No data returned for airport:", airportCode);
        }
      } catch (error) {
        console.error("Error fetching airport data:", error);
      }
    }
    if (airportCode) {
      fetchAirportData();
    }
  }, [airportCode]);

  // Recalculate capacity when the polygon area or plane footprint changes
  useEffect(() => {
    if (polygonArea > 0) {
      recalcCapacity(polygonArea);
    }
  }, [polygonArea, planeFootprint]);

  // When the user completes drawing a polygon
  const onPolygonComplete = (polygon) => {
    const path = polygon
      .getPath()
      .getArray()
      .map((latlng) => ({ lat: latlng.lat(), lng: latlng.lng() }));
    setPolygonPath(path);

    if (window.google?.maps?.geometry) {
      const area = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
      setPolygonArea(area);
      recalcCapacity(area);
    }
    polygon.setMap(null);
    setDrawingMode(null);
  };

  // Compute capacity based on polygon area and plane footprint
  const recalcCapacity = (areaInMeters) => {
    const areaFt2 = areaInMeters * 10.7639;
    const computedCapacity = Math.floor(areaFt2 / planeFootprint);
    setCapacity(computedCapacity);
    setCapacityInput(String(computedCapacity));
  };

  const handlePolygonRightClick = (e) => {
    if (typeof e.vertex !== "undefined") {
      const index = e.vertex;
      const newPath = polygonPath.filter((_, i) => i !== index);
      setPolygonPath(newPath);

      if (window.google?.maps?.geometry) {
        const mvcArray = new window.google.maps.MVCArray(
          newPath.map((point) => new window.google.maps.LatLng(point.lat, point.lng))
        );
        const newArea = window.google.maps.geometry.spherical.computeArea(mvcArray);
        setPolygonArea(newArea);
        recalcCapacity(newArea);
      }
    }
  };

  const removePolygon = () => {
    setPolygonPath([]);
    setPolygonArea(0);
    setCapacity(0);
    setCapacityInput("");
    setDrawingMode(null);
  };

  // Allows editing capacity
  const handleCapacityChange = (e) => {
    const value = e.target.value;
    if (value === "") {
      setCapacityInput("");
      setCapacity(0);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const newCapacity = Math.ceil(numValue);
        setCapacity(newCapacity);
        setCapacityInput(String(newCapacity));
      } else {
        setCapacityInput("");
        setCapacity(0);
      }
    }
  };

  const handleSaveFBO = async () => {
    if (!fboName) {
      alert("Please enter an FBO name.");
      return;
    }
    if (polygonPath.length === 0) {
      alert("Please draw a parking area.");
      return;
    }
    const newFBOData = {
      Airport_Code: airportCode,
      FBO_Name: fboName,
      Parking_Space_Taken: 0,
      Total_Space: capacity,
      Area_ft2: polygonArea * 10.7639,
      iata_code: airportCode.startsWith("K") ? airportCode.slice(1) : airportCode,
      coordinates: polygonPath,
    };
    try {
      const response = await axios.post("http://localhost:5001/airports/fbo/addFBO", newFBOData);
      const savedFBO = response.data;
      setFboList((prevList) => [...prevList, savedFBO]);

      setFboName("");
      setPolygonPath([]);
      setPolygonArea(0);
      setCapacity(0);
      setCapacityInput("");
    } catch (error) {
      console.error("Error saving FBO:", error);
      alert("There was an error saving the FBO. Please try again.");
    }
  };

  const handleSubmit = () => {
    console.log("Submit");
  };

  const handleDone = () => {
    navigate(`/summary/${airportCode}`);
  };

  return (
    <div className="map-container" style={{ position: "relative" }}>
      <GoogleMap
        onLoad={handleMapLoad}
        mapContainerStyle={containerStyle}
        center={airportCoordinates}
        zoom={15}
        options={mapOptions}
      >
        {polygonPath.length === 0 && (
          <DrawingManager
            drawingMode={drawingMode}
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: "#B9BE80",
                fillOpacity: 0.5,
                strokeWeight: 2,
                clickable: true,
                editable: true,
                zIndex: 1,
              },
            }}
          />
        )}
        {polygonPath.length > 0 && (
          <Polygon
            path={polygonPath}
            onRightClick={handlePolygonRightClick}
            options={{
              fillColor: "#B9BE80",
              fillOpacity: 0.35,
              strokeColor: "#B9BE80",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              editable: true,
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
          overflow: "visible",
        }}
      >
        <img onClick={handleDone} className="back-button" src="/back-arrow.png" alt="Back Button" style={{ cursor: "pointer", marginBottom: "16px" }}/>
        <div>
          <h2 className="title" style={{ textAlign: "center", marginBottom: "16px", marginTop: "20px", marginLeft: "-10px" }}>
            Add FBO
          </h2>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ width: "100%" }}>
              Name:{" "}
              <input
                type="text"
                value={fboName}
                onChange={(e) => setFboName(e.target.value)}
                style={{ width: "90%", padding: "8px", marginTop: "5px" }}
                placeholder="Enter FBO name"
              />
            </label>
          </div>

          {polygonPath.length === 0 ? (
            <button
              className="fbo-action-button"
              onClick={() => setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON)}
              style={{ marginBottom: "16px", width: "90%" }}
            >
              Draw parking area
            </button>
          ) : (
            <button
              className="fbo-action-button"
              onClick={removePolygon}
              style={{ marginBottom: "16px", width: "90%" }}
            >
              Remove Parking space
            </button>
          )}

          {polygonArea > 0 && (
            <p style={{ fontSize: "1rem", textAlign: "center" }}>
              Parking Area: {(polygonArea * 10.7639).toFixed(2)} ft<sup>2</sup>
            </p>
          )}

          {polygonArea > 0 && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <label style={{width: "90%"}}>
                  Adjust Plane Footprint (ft²):
                  <input
                    type="range"
                    min="5000"
                    max="15000"
                    step="100"
                    value={planeFootprint}
                    onChange={(e) => setPlaneFootprint(Number(e.target.value))}
                    style={{width: "90%", marginTop: "5px"}}
                  />
                </label>
                <p style={{textAlign: "center", margin: "5px 0"}}>
                  {planeFootprint.toFixed(0)} ft²
                </p>
              </div>

              <div style={{marginTop: "16px"}}>
                <label style={{width: "90%"}}>
                  Capacity:{" "}
                  <input
                    type="number"
                    value={capacityInput}
                    onChange={handleCapacityChange}
                    style={{width: "90%", padding: "8px", marginTop: "5px"}}
                  />
                </label>
              </div>
            </>
          )}
          <button
            onClick={handleSaveFBO}
            className="fbo-action-button"
            style={{ marginTop: "16px", width: "90%" }}
          >
            Save FBO
          </button>
          <button
            onClick={handleDone}
            className="fbo-action-button"
            style={{ marginTop: "16px", width: "90%" }}
          >
            Done
          </button>
        </div>
        <p style={{ fontSize: "0.9em", textAlign: "center", marginTop: "16px" }}>
          Right-click a vertex to remove it
        </p>
      </div>

      {fboList.length > 0 && (
        <div style={{ marginTop: "20px", padding: "20px" }}>
          <FBOComponent fboList={fboList} />
          <button
            onClick={handleSubmit}
            className="fbo-action-button"
            style={{marginTop: "16px", width: "90%"}}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

export default AddFBOPage;
