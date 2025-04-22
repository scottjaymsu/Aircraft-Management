import React, { useEffect, useState, useRef } from "react";
import axios from 'axios';
import MapContainer from "../components/MapContainer";
import Sidebar from "../components/SideBar";
import NotificationCenter from "../components/NotificationCenter";
import { useNavigate } from "react-router-dom";
import '../styles/Map.css';

// Center of the U.S. Position
const ORIGINAL_CENTER = { lat: 39.8283, lng: -98.5795 };

// Original Zoom Position
const ORIGINAL_ZOOM = 5;

// Function to create notifications based on markers
const createNotifications = (markers) => {
  const notifications = [];
  [...markers].forEach((marker) => {
    const { title, capacity_percentage } = marker;
    if (capacity_percentage >= 0.50) {
      notifications.push({
        title: marker.title,
        message: `${title} is at ${Math.round(capacity_percentage * 100)}%. Redirect incoming flights.`
      });
    }
  });

  if (notifications.length === 0) {
    notifications.push("All airports are operating within capacity.");
  }

  return notifications;
};

const MapComponent = () => {
  // State for search input
  const [searchTerm, setSearchTerm] = useState("");
  // State for map reference
  const [mapInstance, setMapInstance] = useState(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [smallMarkers, setSmallMarkers] = useState([]);
  const hasLoaded = useRef(false);
  const navigate = useNavigate();

  /* The use effect for when this page first loads. It needs to check if it's already been loaded because due to React's strict mode, it will try to 
  load twice. It will then get all the airport Markers (the big ones have fbos, the red dots have no fbos and are set as "small markers" */
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    const getAirportMarkers = async () => {
      try {
        const [markersResponse, smallMarkersResponse] = await Promise.all([
          axios.get("http://localhost:5001/map/getAirportMarkers"),
          axios.get("http://localhost:5001/map/getSmallAirportMarkers")
        ]);
        setMarkers(markersResponse.data);
        setSmallMarkers(smallMarkersResponse.data);
      } catch (error) {
        console.error("Error fetching airport markers: ", error);
      }
    };
    getAirportMarkers();
  }, []);

  // Filter locations based on search input
  const filteredLocations = [...markers, ...smallMarkers].filter((loc) =>
    loc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const resetMap = () => {
    if (mapInstance) {
      mapInstance.setCenter(ORIGINAL_CENTER);
      mapInstance.setZoom(ORIGINAL_ZOOM);
    }
  };

  // Handle location click to navigate to the summary page
  const handleLocationClick = (locationTitle) => {
    navigate(`/summary/${locationTitle}`);
  };

  // Handle button click to navigate to the batch page
  const handleAirportButton = () => {
    navigate(`/batch`);
  };

  // Logout function
  const handleLogout = () => {
    // Clear the token from local storage
    localStorage.removeItem("token");
    // Redirect to the login page
    window.location.href = "/login";
  };


  return (
    <div>
      <NotificationCenter
        notifications={createNotifications(markers)}
        visible={notificationVisible}
        toggleVisibility={() => setNotificationVisible(!notificationVisible)}
        handleLocationClick={handleLocationClick}
      />


      <Sidebar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        locations={filteredLocations}
        onLocationClick={handleLocationClick}
        resetMap={resetMap}
        visible={sidebarVisible}
        toggleVisibility={() => setSidebarVisible(!sidebarVisible)}
      />
      <div>


      </div>
      <MapContainer markers={markers} smallMarkers={smallMarkers} setMapInstance={setMapInstance} />
      <div id="map-buttons">
        {/* <button className="data-button" onClick={resetMap}>Reset Map</button> */}
        <button class="data-button" onClick={handleAirportButton}>Add Data</button>
        <button class="data-button" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default MapComponent;
