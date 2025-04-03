import React from 'react';
import './component.css';
import { getStatusColor } from '../utils/helpers';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const Sidebar = ({
  searchTerm,
  setSearchTerm,
  locations,
  onLocationClick,
  resetMap,
  visible,
  toggleVisibility,
}) => {
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
              style={{ backgroundColor: getStatusColor(loc.status) }}
            >
              {loc.total_planes != null && loc.capacity ? 
              `${((loc.total_planes / loc.capacity) * 100).toFixed(0)}%` : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
