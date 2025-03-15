import React, { useEffect, useState } from "react";
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

const MapComponent = () => {
  // State for search input
  const [searchTerm, setSearchTerm] = useState("");
  // State for map reference
  const [mapInstance, setMapInstance] = useState(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [markers, setMarkers] = useState([]);
  const [smallMarkers, setSmallMarkers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const getAirportMarkers = async() => {
      try {
        const response = await axios.get(`http://localhost:5001/map/getAirportMarkers`);
        setMarkers(response.data);
      } catch (error) {
        console.error("Error fetching the FBOs at this airport: ", error);
      }
    }
    getAirportMarkers();
    const getSmallAirportMarkers = async() => {
      try {
        const response = await axios.get(`http://localhost:5001/map/getSmallAirportMarkers`);
        setSmallMarkers(response.data);
      } catch (error) {
        console.error("Error fetching the FBOs at this airport: ", error);
      }
    }
    getSmallAirportMarkers();
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

  //
  // TODO: When the map is switched to a single implementation, this zoom location should be the off center
  // location of the airport. 
  //
  const handleLocationClick = (location) => {
    if (mapInstance) {
      mapInstance.setCenter(location.position);
      mapInstance.setZoom(12);
    }
    // Navigate to the summary page for this airport/location
    navigate(`/summary/${location.title}`);
  };

  const handleAirportButton = () => {
    navigate(`/batch`);
  };


  return (
    <div>
      <NotificationCenter
        notifications={[
          "KTEB is Overcapacity! Check recommendations to provide room for incoming aircraft.",
          "KHPN is Overcapacity! Check recommendations to provide room for incoming aircraft.",
          "KLAS is Overcapacity! Check recommendations to provide room for incoming aircraft.",
          "KMDW is Overcapacity! Check recommendations to provide room for incoming aircraft.",
          "KDAL is Overcapacity! Check recommendations to provide room for incoming aircraft.",
          "KBPI is reaching capacity. On 3/3/2025, KBPI will be over capacity and action will be needed.",
          "KSDL is reaching capacity. On 3/7/2025, KSDL will be over capacity and action will be needed.",
        ]}
        visible={notificationVisible}
        toggleVisibility={() => setNotificationVisible(!notificationVisible)}
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
