import React, { useEffect, useState, useRef } from "react";
import axios from 'axios';
import MapContainer from "./components/MapContainer";
import Sidebar from "./components/SideBar";
import NotificationCenter from "./components/NotificationCenter";
import { useNavigate } from "react-router-dom";
import './styles/Map.css';

// Center of the U.S. Position
const ORIGINAL_CENTER = { lat: 39.8283, lng: -98.5795 };

// Original Zoom Position
const ORIGINAL_ZOOM = 5;

// Function to create notifications based on markers
const createNotifications = (markers) => {
  const notifications = [];
  [...markers].forEach((marker) => {
    const { title, status } = marker;
    if (status === "Overcapacity" || status === "Reaching Capacity") {
      notifications.push({
        title: marker.title,
        message: `${title} is at ${status}. Please redirect incoming flights.`,
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
      <button class="data-button" onClick={handleAirportButton}>Add Airports</button>

    </div>
  );
};

export default MapComponent;
