import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, Polygon } from "@react-google-maps/api";
import { Card, CardContent } from "../components/card";
import { getStatusClass, getColor } from "../utils/helpers"

import "../styles/SummaryPage.css";
import "../styles/Scrollable.css";
import FlightTable from "../components/FlightTable";
import TrafficOverview from "../components/TrafficOverview";
import FBOComponent from "../components/FBOComponent";
import axios from "axios";
import Capacities from "../components/Capacities";

// Map Size
const containerStyle = {
  width: "100vw",
  height: "100vh",
};

// Google Map styling options
const mapOptions = {
  mapTypeId: "satellite",
  zoomControl: true,
  mapTypeControl: false,
  // Hide non relevant map features
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

// Custom Overlay for parking lot labels to display on the map
function CustomOverlay({ map, position, text }) {
  const divRef = React.useRef();

  React.useEffect(() => {
    if (map && divRef.current) {
      const overlayView = new window.google.maps.OverlayView();

      overlayView.onAdd = function () {
        const panes = overlayView.getPanes();
        panes.floatPane.appendChild(divRef.current);
      };

      overlayView.onRemove = function () {
        if (divRef.current.parentElement) {
          divRef.current.parentElement.removeChild(divRef.current);
        }
      };

      overlayView.draw = function () {
        const projection = overlayView.getProjection();
        const positionLatLng = new window.google.maps.LatLng(
          position.lat,
          position.lng
        );
        const positionPixels = projection.fromLatLngToDivPixel(positionLatLng);
        const div = divRef.current;

        if (div) {
          div.style.position = "absolute";
          div.style.left = `${positionPixels.x - div.offsetWidth / 2}px`;
          div.style.top = `${positionPixels.y - div.offsetHeight / 2}px`;
        }
      };

      overlayView.setMap(map);

      return () => {
        if (divRef.current) {
          overlayView.setMap(null);
        }

      };
    }
  }, [map, position]);

  return (
    <div
      ref={divRef}
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        color: "white",
        padding: "5px 10px",
        borderRadius: "5px",
        fontSize: "12px",
        whiteSpace: "nowrap",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

// Summary Page Component
export default function SummaryPage() {
  const airportCode = useParams().location;
  const [map, setMap] = React.useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [airportCoordinates, setAirportCoordinates] = useState({});

  const [airportMetadata, setAirportMetadata] = useState([]);
  // airport capacity as percentage
  const [capacity, setCapacity] = useState(null);
  // fbo capacities for airport
  const [fboCapacities, setFboCapacities] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    const fetchFboCapacities = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/airportData/getAllFboCapacities/${airportCode}`);
        const data = response.data;

        // Convert array to map { fbo: percentage_occupied }
        const fboMap = {};
        data.forEach(entry => {
          const percentageOccupied = parseFloat(entry.percentage_occupied);
          // round to nearest integer
          fboMap[entry.fbo] = Math.round(percentageOccupied); 
        });

        setFboCapacities(fboMap);
        console.log("FBO Capacities:", fboMap);
      } catch (error) {
        console.error("Failed to fetch FBO capacities:", error);
      }
    };

    fetchFboCapacities();
  }, [airportCode]);

  // Fetch airport capacity percentage
  useEffect(() => {
    // Fetch airport capacity data
    const fetchCapacityData = () => {
      fetch(`http://localhost:5001/airportData/getAirportCapacity/${airportCode}`)
        .then((response) => response.json())
        .then((data) => {
          const percentageOccupied = parseFloat(data.percentage_occupied);
          if (!isNaN(percentageOccupied)) {
            // Store percentageOccupied in capacity state
            setCapacity(Math.round(percentageOccupied));
          } else {
            console.error("Invalid percentage_occupied value:", data.percentage_occupied);
            setCapacity(0); // Default to 0 if the value is invalid
          }
        })
        .catch((error) => {
          console.error("Error fetching airport capacity data:", error);
        });
    };

    fetchCapacityData();
  }, [airportCode]);

  useEffect(() => {
    console.log(airportCode);

    // Fetch FBO data and coordinates for map overlay and FBO list
    async function fetchParkingCoordinates() {
      try {
        const response = await fetch(
          `http://localhost:5001/airports/getParkingCoordinates/${airportCode}`
        );
        const data = await response.json();
        console.log("Parking Coordinates:", data);
       
        // Filter out parking lots with no coordinates and map them to the required format
        const parseWKTPolygon = (wkt) => {
          if (!wkt.startsWith("POLYGON(") && !wkt.startsWith("POLYGON (")) {
            console.error("Invalid WKT format:", wkt);
            return [];
          }
          wkt = wkt.replace("POLYGON (", "POLYGON(");
          const coordinateStr = wkt.slice(8, -1); // remove POLYGON( and final )
          const points = coordinateStr.split(",");
          return points.map((pt) => {
            const [lat, lng] = pt.trim().split(/\s+/).map(Number);
            return { lat, lng };
          });
        };

        const parkingLots = data
        .filter((lot) => lot.coordinates)
        .map((lot) => {
          let coordinates = [];

          if (typeof lot.coordinates === "string") {
            coordinates = parseWKTPolygon(lot.coordinates);
          } else if (
            Array.isArray(lot.coordinates) &&
            lot.coordinates.length > 0
          ) {
            coordinates = lot.coordinates[0].map((coord) => ({
              lat: coord.x,
              lng: coord.y,
            }));
          }

          return {
            name: lot.FBO_Name,
            coordinates,
            color: getColor(fboCapacities[lot.FBO_Name]),
            labelPosition: coordinates[0] || { lat: 0, lng: 0 },
          };
        });
        
        setParkingLots(parkingLots);
      } catch (error) {
        console.error("Error fetching parking data:", error);
      }
    }

    //Fetch the lat long coordinates of each airport
    async function fetchAirportData() {
      try {
        const response = await fetch(
          `http://localhost:5001/airports/getAirportData/${airportCode}`
        );
        const data = await response.json();
        const { latitude_deg, longitude_deg } = data[0];
        const lat = parseFloat(latitude_deg);
        const long = parseFloat(longitude_deg);
        setAirportCoordinates({
          lat: lat,
          lng: long - 0.011,
        });
        setAirportMetadata(data[0]);
      } catch (error) {
        console.error("Error fetching parking data:", error);
      }
    }
    fetchParkingCoordinates();
    fetchAirportData();

  }, [airportCode, fboCapacities]);


  //
  // Navigation Handlers
  // 

  // This function handles the navigation to the simulator page when the "see more" button is clicked
  const handleSeeMore = () => {
    navigate(`/simulator/${airportCode}`);
  };

  // This function handles the navigation back to the home page when the back button is clicked
  const handleBack = () => {
    navigate("/");
  }

  return (
    <div className="map-container">
      {/* Google map of airport selected */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        options={mapOptions}
        center={airportCoordinates}
        zoom={15}
        onLoad={(mapInstance) => setMap(mapInstance)}
      >
        {/* Draws the FBO outlines on the map */}
        {parkingLots.map((lot, index) => (
          <Polygon
            key={index}
            path={lot.coordinates}
            options={{
              fillColor: lot.color,
              fillOpacity: 0.5,
              strokeColor: lot.color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        ))}

        {/* Draws the parking lot labels on the map */}
        {parkingLots.map((lot, index) => (
          <CustomOverlay
            key={`overlay-${index}`}
            map={map}
            position={lot.labelPosition}
            text={lot.name}
          />
        ))}
      </GoogleMap>
      
      <div className="info-card scrollable-content">
        {/* Back button to go back to the home page */}
        <img onClick={handleBack} className="back-button" src="/back-arrow.png" alt="Back Button"></img>


          <Card className="card-content">
            <CardContent className="text-center flex-1">
              <h2 className="title">
                {airportMetadata.name ? `${airportCode} - ${airportMetadata.name}` : "\u00A0"}
              </h2>
              {capacity !== null ? 
                <p className={`status-bubble ${getStatusClass(capacity)}`}>
                  {capacity}% 
                </p>
                : "\u00A0"}
            </CardContent>
          </Card>

          {/* Traffic Overview graph */}
        <Card className="card-content flex-2">
          <div style={{ textAlign: 'center', top: 0 }}>
            <h2>Traffic Overview</h2>
          </div>
          <TrafficOverview id={airportCode} />
        </Card>
        {/* Arriving flight table */}
        <Card className="card-content flex-3">
          <CardContent>
            <FlightTable id={airportCode} flightType="arriving" />
          </CardContent>
        </Card>

        {/* Departing flight table */}
        <Card className="card-content flex-3">
          <CardContent>
            <FlightTable id={airportCode} flightType="departing" />
          </CardContent>
        </Card>

        {/* FBO List */}
        <FBOComponent id={airportCode}/>
        <Card className="card-content flex-3">
          <CardContent>
                <Capacities id={airportCode} area_left={23} />
          </CardContent>
        </Card>
        <button className="see-more flex-1" onClick={handleSeeMore}>See more</button>
      </div>
    </div>
  );
}
