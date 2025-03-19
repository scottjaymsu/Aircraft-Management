import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import './component.css';
import { getStatusColor } from "../utils/helpers";

// Center of the U.S. Position
const ORIGINAL_CENTER = { lat: 39.8283, lng: -98.5795 };

// Original Zoom Position
const ORIGINAL_ZOOM = 5;
const MEDIUM_AIRPORT_ZOOM_THRESHOLD = 8;
const SMALL_AIRPORT_ZOOM_THRESHOLD = 10;

const MapContainer = ({ markers, smallMarkers, onMarkerClick, setMapInstance }) => {
  // Store the map instance
  const mapRef = useRef(null);
  // For navigation
  const navigate = useNavigate();
  // from the zoom button
  // const [zoomLevel, setZoomLevel] = useState(ORIGINAL_ZOOM);

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

      const largeAirportMarkers = [];
      const mediumAirportMarkers = [];
      const smallAirportMarkers = [];
      const markersWithHealthBars = [];

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
        
        const capacityPercentage = markerData.capacity_percentage || 100;

        const createSVG = (percentage) => {
          const width = 30;
          const height = 10;
          const filledWidth = width * (percentage)

          return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
              <rect width="${width}" height="${height}" fill="white" stroke="rgb(33,48,71)" strokeWidth="1"/>
              <rect width="${filledWidth}" height="${height}" fill="${getStatusColor(markerData.status)}"/>
            </svg>`
        }

        const healthBar = new window.google.maps.Marker({
          position: markerData.position,
          map,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(createSVG(capacityPercentage)),
          },
        });
        markersWithHealthBars.push({ marker, healthBar });

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

        marker.addListener("mouseover", () => infoWindow.open(map, marker));
        marker.addListener("mouseout", () => infoWindow.close());
        marker.addListener("click", () => navigate(`/summary/${markerData.title}`));
      });

      // Dynamically change the health bar's position based on the marker's position
      const updateHealthBarPositions = () => {
        const projection = map.getProjection();
        if (!projection) return;

        markersWithHealthBars.forEach(({ marker, healthBar }) => {
          const latLng = marker.getPosition();
          if (!latLng) return;

          const point = projection.fromLatLngToPoint(latLng);
          const zoomFactor = Math.pow(2, map.getZoom()); 
          const offsetY = 45 / zoomFactor; 

          const newLatLng = projection.fromPointToLatLng(
            new window.google.maps.Point(point.x, point.y - offsetY)
          );

          smoothTransition(healthBar, newLatLng);
        });
      };
      
      // Transition Smoothly between zoom
      const smoothTransition = (marker, newPosition) => {
        const currPos = marker.getPosition();
        if (!currPos) return;
        const steps = 25; 
        const deltaLat = (newPosition.lat() - currPos.lat()) / steps;
        const deltaLng = (newPosition.lng() - currPos.lng()) / steps;

        let step = 0;

        const animate = () => {
          if (step < steps) {
            const lat = currPos.lat() + deltaLat * step;
            const lng = currPos.lng() + deltaLng * step;
            marker.setPosition(new window.google.maps.LatLng(lat, lng));
            step++;
            requestAnimationFrame(animate);
          } else {
            marker.setPosition(newPosition);
          }
        };

        animate();
      };

      map.addListener("zoom_changed", updateHealthBarPositions);
      map.addListener("idle", updateHealthBarPositions);

      const createMarker = (markerData, icon, scale, map) => {
        return new window.google.maps.Marker({
          position: markerData.position,
          title: markerData.title,
          icon: {
            path: icon,
            fillColor: 'red',
            fillOpacity: 1,
            strokeColor: "rgb(33,48,71)",
            strokeWeight: 1,
            scale: scale,
          },
          animation: window.google.maps.Animation.DROP,
          map: map,
        });
      };

      map.addListener("zoom_changed", () => {
        // from the zoom button
        // const newZoom = map.getZoom();
        // setZoomLevel(newZoom);
        updateMarkers();
      });
      
      smallMarkers.forEach((markerData) => {
        if (markerData.type === "large_airport") { 
          const smallMarker = createMarker(markerData, window.google.maps.SymbolPath.CIRCLE, 5, map);
          smallMarker.addListener("click", () => navigate(`/summary/${markerData.title}`));
          largeAirportMarkers.push(smallMarker); 
        }
        else if (markerData.type === "medium_airport") { 
          const smallMarker = createMarker(markerData, window.google.maps.SymbolPath.CIRCLE, 5, null);
          smallMarker.addListener("click", () => navigate(`/summary/${markerData.title}`));
          mediumAirportMarkers.push(smallMarker);}
        else { 
          const smallMarker = createMarker(markerData, window.google.maps.SymbolPath.CIRCLE, 5, null);
           smallMarker.addListener("click", () => navigate(`/summary/${markerData.title}`));
          smallAirportMarkers.push(smallMarker); 
        }
      });

      const updateMarkers = () => {
        const bounds = map.getBounds();
        if (!bounds) return;

        smallAirportMarkers.forEach((marker) => {
          if (bounds.contains(marker.position)) {
            if (map.getZoom() >= SMALL_AIRPORT_ZOOM_THRESHOLD) {
              marker.setMap(map);
            }
            else {
              marker.setMap(null);
            }
          } else {
            marker.setMap(null);
          }
        });
        mediumAirportMarkers.forEach((marker) => {
          if (bounds.contains(marker.position)) {
            if (map.getZoom() >= MEDIUM_AIRPORT_ZOOM_THRESHOLD) {
              marker.setMap(map);
            }
            else {
              marker.setMap(null);
            }
          } else {
            marker.setMap(null);
          }
        });
      };
  
      updateMarkers();
      
      map.addListener("idle", updateMarkers);

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
  }, [markers, onMarkerClick, navigate, setMapInstance, smallMarkers]);

  return <div id="map" style={{ height: "100vh", width: "100%" }} />;
};


export default MapContainer;
