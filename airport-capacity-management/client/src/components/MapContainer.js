import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import './component.css';
import { getStatusColor } from "../utils/helpers";

// Center of the U.S. Position
const ORIGINAL_CENTER = { lat: 39.8283, lng: -98.5795 };

// Original Zoom Position
const ORIGINAL_ZOOM = 5;

const MapContainer = ({ markers, onMarkerClick, setMapInstance }) => {
  // Store the map instance
  const mapRef = useRef(null);
  // For navigation
  const navigate = useNavigate();

  useEffect(() => {
    const initializeMap = () => {
      if (!window.google || !window.google.maps) return;

      const map = new window.google.maps.Map(document.getElementById("map"), {
        center: ORIGINAL_CENTER,
        zoom: ORIGINAL_ZOOM,
        mapId: "cbef200dfd600c27",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false, 
      });

      markers.forEach((markerData) => {
        const marker = new window.google.maps.Marker({
          position: markerData.position,
          map,
          title: markerData.title,
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: getStatusColor(markerData.status),
            fillOpacity: 1,
            strokeColor: "rgb(33,48,71)",
            strokeWeight: 1,
            scale: 8,
          },
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<h3>${markerData.title}</h3>`,
        });

        // Code to remove the close button from the info window
        infoWindow.addListener("domready", () => {
          const closeButton = document.querySelector(".gm-ui-hover-effect");
          if (closeButton) {
            closeButton.style.display = "none";
          }
        });

        // Display airport name on hover
        marker.addListener("mouseover", () => {
          infoWindow.open(map, marker);
        });

        marker.addListener("mouseout", () => {
          infoWindow.close();
        });

        marker.addListener("click", () => {
          navigate(`/summary/${markerData.title}`); // Navigate to the summary page
        });
      });

      mapRef.current = map;
      setMapInstance(map);
    };

    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.body.appendChild(script);
    }
  }, [markers, onMarkerClick, navigate, setMapInstance]);

  return <div id="map" style={{ height: "100vh", width: "100%" }} />;
};

export default MapContainer;
