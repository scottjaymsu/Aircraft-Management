import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../styles/Simulator.css';
import './header/SimulatorTableFilters'; 

// Components of the header
import AirportTitle from "./header/AirportTitle";
import SimulatorFBO from "./header/SimulatorFBO";
import CapacityInfo from "./header/CapacityInfo";
import Legend from "./header/Legend";
import SimulatorTime from "./header/SimulatorTime";
import SimulatorTableFilters from "./header/SimulatorTableFilters";

/**
 * Top segment of the Simulator page 
 * Displays a title, FBO, capacity information, and time
 * And offers filters for tail number, plane size, and plane type
 */
const SimulatorHeader = ({
    selectedAirport, 
    selectedFBO, 
    searchTerm, 
    handleTailNumberChange, 
    handleFBOChange, 
    fboData,
    localTime, 
    planeTypes,
    selectedPlaneTypeFilter,
    handlePlaneTypeFilterChange,
    planeSizes,
    selectedPlaneSizeFilter,
    handlePlaneSizeFilterChange,
    tailNumberOptions,
    handleResetFilters
}) => 
  {
    // Back button navigation
    const navigate = useNavigate();
    const handleBackButton = () => {
        navigate(`/summary/${selectedAirport}`);
    }

    const handleBackClick = () => handleBackButton();

    // airport capacity as percentage
    const [capacity, setCapacity] = useState(null);
    // fbo capacities for airport
    const [fboCapacities, setFboCapacities] = useState({});

    useEffect(() => {
      const fetchFboCapacities = async () => {
        try {
          const response = await axios.get(`http://localhost:5001/airportData/getAllFboCapacities/${selectedAirport}`);
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
    }, [selectedAirport]);

    // Fetch airport capacity percentage
    useEffect(() => {
      // Fetch airport capacity data
      const fetchCapacityData = () => {
        fetch(`http://localhost:5001/airportData/getAirportCapacity/${selectedAirport}`)
          .then((response) => response.json())
          .then((data) => {
            const percentageOccupied = parseFloat(data.percentage_occupied);
            if (!isNaN(percentageOccupied)) {
              setCapacity(Math.round(percentageOccupied));
            } else {
              setCapacity(null); 
            }
          })
          .catch((error) => {
            console.error("Error fetching airport capacity data:", error);
          });
      };

      fetchCapacityData();
    }, [selectedAirport]);    

    return (
        <div id="head-dashboard-wrapper">
            <div id="head-dashboard">
                <div id="left-header-content">
                <div id="header1">
                    <div className='header-segment-large'>
                      <AirportTitle selectedAirport={selectedAirport} handleBackClick={handleBackClick} />
                      <SimulatorFBO selectedFBO={selectedFBO} />
                    </div>
                </div>
                <CapacityInfo
                    capacity={capacity}
                    fboCapacity={fboCapacities[selectedFBO]}
                />
                <Legend/>
                <SimulatorTime
                    localTime={localTime}
                    handleResetFilters={handleResetFilters}
                />
                </div>

                <div id="right-header-content">
                <SimulatorTableFilters
                    label="FBO"
                    options={fboData?.map((data) => data.FBO_Name) || []}
                    value={selectedFBO || ''}
                    onChange={(val) => handleFBOChange(val)}
                    placeholder="Select FBO"
                />
                <SimulatorTableFilters
                    label="Tail Number"
                    options={tailNumberOptions?.map((data) => data.acid) || []}
                    value={searchTerm}
                    onChange={(val) => handleTailNumberChange(val)}
                    placeholder="Tail Number"
                />
                <SimulatorTableFilters
                    label="Plane Size"
                    options={planeSizes?.map((data) => data.size) || []}
                    value={selectedPlaneSizeFilter}
                    onChange={(val) => handlePlaneSizeFilterChange({ target: { value: val } })}
                    placeholder="Plane Size"
                />
                <SimulatorTableFilters
                    label="Plane Type"
                    options={planeTypes?.map((data) => data.type) || []}
                    value={selectedPlaneTypeFilter}
                    onChange={(val) => handlePlaneTypeFilterChange({ target: { value: val } })}
                    placeholder="Plane Type"
                />
                </div>
            </div>
            </div>

    );
};

export default SimulatorHeader; 

