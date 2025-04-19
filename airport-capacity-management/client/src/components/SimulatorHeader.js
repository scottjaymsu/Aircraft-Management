import React, { useState, useEffect, useCallback } from "react";
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
 */
const SimulatorHeader = ({
    selectedAirport, 
    selectedFBO, 
    takenSpace, 
    totalSpace, 
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
}) => {
    // Back button navigation
    const navigate = useNavigate();
    const handleBackButton = () => {
        navigate(`/summary/${selectedAirport}`);
    }

    const handleBackClick = () => handleBackButton();

    const [currentPopulation, setCurrentPopulation] = useState(0);
    const [overallCapacity, setOverallCapacity] = useState(0);
    // airport capacity as percentage
    const [capacity, setCapacity] = useState(null);
    // fbo capacity as percentage
    const [fbo, setFbo] = useState([]);
    const [fboCapacity, setFboCapacity] = useState([]);

  // Fetch airport capacity percentage
  useEffect(() => {
    // Fetch airport capacity data
    const fetchCapacityData = () => {
      fetch(`http://localhost:5001/airportData/getAirportCapacity/${selectedAirport}`)
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
  }, [selectedAirport]);    

    // fetch capacity data for entire airport
    useEffect(() => {
        // Fetch current population and overall capacity without using async/await
        const fetchData = () => {
          // Fetch number of planes currently at the airport
          fetch(`http://localhost:5001/airportData/getParkedPlanes/${selectedAirport}`)
            .then((currentResponse) => currentResponse.json())
            .then((currentData) => {
              const currentPopulation = currentData.length;
              setCurrentPopulation(currentPopulation);
              console.log("Current Population:", currentPopulation);
    
              // Fetch overall capacity of the airport
              fetch(`http://localhost:5001/airportData/getOverallCapacity/${selectedAirport}`)
                .then((overallResponse) => overallResponse.json())
                .then((overallData) => {
                  const overallCapacity = overallData.totalCapacity;
                  setOverallCapacity(overallCapacity);
                  console.log("Overall Capacity:", overallCapacity);
    
                  // Set capacity as percentage
                  setCapacity((currentPopulation / overallCapacity) * 100);
                })
                .catch((error) => {
                  console.error("Error fetching overall capacity data:", error);
                });
            })
            .catch((error) => {
              console.error("Error fetching current population data:", error);
            });
        };
    
        fetchData();
    }, [selectedAirport]);

    // fetch capacity data for selected fbo
    const fetchFBOData = useCallback(() => {
        axios
        .get(`http://localhost:5001/airports/getParkingCoordinates/${selectedAirport}`)
        .then((response) => {
            const data = response.data;
            const fboData = data
                .filter((lot) => lot.FBO_Name === selectedFBO) // Keep only matching records
                .map((lot) => ({
                    name: lot.FBO_Name,
                    parking_taken: lot.spots_taken,
                    total_parking: lot.Total_Space,
                }));
            setFbo(fboData);
        })
        .catch((error) => {
            console.error("Error fetching FBO data >:(", error);
        });
    }, [selectedAirport, selectedFBO]);

    useEffect(() => {
        fetchFBOData();
    }, [fetchFBOData]);


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
                    fbo={fbo}
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

