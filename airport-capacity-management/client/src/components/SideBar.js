import React, { useState, useEffect } from 'react';
import '../styles/component.css';
import { getColor } from '../utils/helpers';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';

const Sidebar = ({
  searchTerm,
  setSearchTerm,
  locations,
  onLocationClick,
  resetMap,
  visible,
  toggleVisibility,
}) => {
  // Airport capacities 
  const [capacities, setCapacities] = useState({});

  useEffect(() => {
    const fetchCapacities = async () => {
      try {
        const response = await axios.get("http://localhost:5001/airportData/getAllAirportCapacities");
        const data = response.data;

        // Convert array to map { airport: percentage_occupied }
        const capMap = {};
        data.forEach(entry => {
            const percentageOccupied = parseFloat(entry.percentage_occupied);
            capMap[entry.airport] = Math.round(percentageOccupied);
        });

        setCapacities(capMap);
        console.log("Capacities:", capMap);
      } catch (error) {
        console.error("Failed to fetch airport capacities:", error);
      }
    };

    fetchCapacities();
  }, []);

  return (
    <div id="side-bar" className={visible ? 'visible' : ''}>
      <div id="search-container">
        {/* Button that toggles the visibility of the container */}
        <button id="collapse-button" onClick={toggleVisibility}>
        {visible ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
        </button>

        {/* Search bar */}
        <input
          id="map-search"
          type="text"
          placeholder="Search for an airport..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {/* List of all of the map airports and their statuses */}
      <ul id="location-list" className={`scrollable-content ${visible ? 'visible' : ''}`}>
        {locations.map((loc) => (
          <li className="list-ele" key={loc.title} onClick={() => onLocationClick(loc.title)}>
            {loc.title}
            <div
              className="status-icon"
              style={{ backgroundColor: getColor(capacities[loc.title]) }}
            >
              {capacities[loc.title] != null ? `${capacities[loc.title]}%` : "----"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
