import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/component.css';
import { getColor } from "../utils/helpers";

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

  /*Each type of airport has a list, so it can be generated based on the users zoom level, (large shows automaticallyy, medium is five clicks zoom, 
  and small is 7 clicks zoom) to avoid lagging when generating the map */
  const markersListening = (map) => {
  const largeAirportMarkers = [];
  const mediumAirportMarkers = [];
  const smallAirportMarkersList = []; 
  const markersWithHealthBars = [];

  markers.forEach((markerData) => {
    const marker = new window.google.maps.Marker({
      position: markerData.position,
      map,
      title: markerData.title,
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        fillColor: getColor(markerData.capacity_percentage*100),
        fillOpacity: 1,
        strokeColor: "rgb(33,48,71)",
        strokeWeight: 1,
        scale: 8,
      },
      animation: window.google.maps.Animation.DROP,
    });

    /* If the capacity percentage is not generated, that means it's capacity is 0 and will be set accordingly.
    This SVG is for the hover bars, and is generated based on the percentage of capacity of each specific airport*/
    const capacityPercentage = markerData.capacity_percentage || 0;
    const createSVG = (percentage) => {
      const width = 30;
      const height = 10;
      const filledWidth = width * (percentage);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <rect width="${width}" height="${height}" fill="white" stroke="rgb(33,48,71)" strokeWidth="1"/>
                <rect width="${filledWidth}" height="${height}" fill="${getColor(markerData.capacity_percentage*100)}"/>
              </svg>`;
    };
    
    /**
     * Health bar that displays above airport makers that currently
     * have airport dat input for them
     */
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

    infoWindow.addListener("domready", () => {
      const closeButton = document.querySelector(".gm-ui-hover-effect");
      if (closeButton) closeButton.style.display = "none";
    });

    marker.addListener("mouseover", () => infoWindow.open(map, marker));
    marker.addListener("mouseout", () => infoWindow.close());
    marker.addListener("click", () => navigate(`/summary/${markerData.title}`));
  });

  /* These markers are for the airports without FBOs (navy dots). */
  const createMarker = (markerData, icon, scale, map) => {
    return new window.google.maps.Marker({
      position: markerData.position,
      title: markerData.title,
      icon: {
        path: icon,
        fillColor: '#1c3149',
        fillOpacity: 1,
        strokeColor: "rgb(33,48,71)",
        strokeWeight: 1,
        scale: scale,
      },
      animation: window.google.maps.Animation.DROP,
      map,
    });
  };

  /* First generating the points. Only large airports will originally populate on the map, everything else will be set to a null parent
  until a separate function (updateMarkers()) prompts them to be shown*/
  smallMarkers.forEach((markerData) => {
    const marker = createMarker(markerData, window.google.maps.SymbolPath.CIRCLE, 5, null);
    marker.addListener("click", () => navigate(`/summary/${markerData.title}`));

    if (markerData.type === "large_airport") {
      marker.setMap(map);
      largeAirportMarkers.push(marker);
    } else if (markerData.type === "medium_airport") {
      mediumAirportMarkers.push(marker);
    } else {
      smallAirportMarkersList.push(marker);
    }
  });

  /* If the user zoom threshold is high enough, we now populate the map with the smaller or medium airports IF IT'S WITHIN THE BOUNDS  (or the map would still lag.) */
  const updateMarkers = () => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const setVisibility = (markerList, threshold) => {
      markerList.forEach((marker) => {
        const inBounds = bounds.contains(marker.position);
        const shouldShow = map.getZoom() >= threshold && inBounds;
        marker.setMap(shouldShow ? map : null);
      });
    };

    setVisibility(mediumAirportMarkers, MEDIUM_AIRPORT_ZOOM_THRESHOLD);
    setVisibility(smallAirportMarkersList, SMALL_AIRPORT_ZOOM_THRESHOLD);
  };

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

  /* This changes the position of the health bar to match where the marker is. Since we couldn't just put iit as an addition of the position
  of the airport marker itself we had to create a functiion to determine where it should be put based off the marker. */
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

  map.addListener("zoom_changed", updateMarkers);
  map.addListener("zoom_changed", updateHealthBarPositions);
  map.addListener("idle", () => {
    updateMarkers();
    updateHealthBarPositions();
  });

  updateMarkers();
  updateHealthBarPositions();
};

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

      mapRef.current = map;
      setMapInstance(map);
      // create markers and have them listen to the map
      markersListening(map); 
    };

    if (window.google && window.google.maps) {
      if (!mapRef.current) {
        initializeMap();
      } else {
        // If the map is already initialized, just update the markers
        markersListening(mapRef.current); 
      }
    }
  }, [markers, smallMarkers]);

  
  return <div id="map" style={{ height: "100vh", width: "100%" }} />;
};


export default MapContainer;