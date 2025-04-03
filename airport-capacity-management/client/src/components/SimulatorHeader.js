import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../styles/Simulator.css';

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
    tailNumberOptions
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
    const [capacity, setCapacity] = useState(0);
    // fbo capacity as percentage
    const [fbo, setFbo] = useState([]);
    const [fboCapacity, setFboCapacity] = useState([]);

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
        <div id="head-dashboard">
            <div id="header1">
                <div className='header-segment-large'>
                    <div id="title-wrapper">
                        <button id="back-button-sim">
                            <img onClick={handleBackClick} src="/back-arrow.png" alt="Back Button"></img>
                        </button>
                        <div id="airport-title">{selectedAirport || "N/A"}</div>
                        <div id="sim-title">Flight Simulator</div>
                    </div>
                    <div id='fbo-title-sim'>{selectedFBO?.FBO_Name || 'Select an FBO'}</div>
                </div>
            </div>

            <div className='header-segment-small'>
                <div >{selectedAirport} Capacity</div>
                <div>
                    {currentPopulation != null && overallCapacity ? 
                    `${((currentPopulation / overallCapacity) * 100).toFixed(0)}%` : ''}
                </div>
                <div>FBO Capacity</div>
                {selectedFBO !== "All FBOs" && fbo[0] && (
                    <div>
                        {fbo[0].parking_taken != null && fbo[0].total_parking ? 
                        `${((fbo[0].parking_taken / fbo[0].total_parking) * 100).toFixed(0)}%` : '/'}
                    </div>
                )}
            </div>

            <div className='header-segment-small'>
                <div className='legend-row'>
                    <div className='legend-square blue-color'></div>
                    <div>Arriving</div>
                </div>
                <div className='legend-row'>
                    <div className='legend-square yellow-color'></div>
                    <div>Departing</div>
                </div>
                <div className='legend-row'>
                    <div className='legend-square green-color'></div>
                    <div>Parked</div>
                </div>
                <div className='legend-row'>
                    <div className='legend-square red-color'></div>
                    <div>Maintenance</div>
                </div>
            </div>

            {/* make into another component */}
            <div className='header-segment-small  right-drop'>
                

                <label htmlFor="local-datetime">Local Time</label>
                <input type="text" id="local-datetime" readOnly value={localTime || "Loading..."}></input>

                <label htmlFor="dropdown">FBO</label>
                <select className="dropdown" name="dropdown" onChange={handleFBOChange} value={selectedFBO ? selectedFBO.FBO_Name : ''}>
                    {fboData.map((data, index) => (
                        <option key={index}>{data.FBO_Name}</option>
                    ))}
                </select>
            </div>

            <div className="header-segment-small">
            <label htmlFor="dropdown">Tail Number</label>
                <input 
                        type="text" 
                        className="dropdown top-dropdown" 
                        name="dropdown" 
                        value={searchTerm} 
                        onChange={handleTailNumberChange} 
                        placeholder="Search Tail Number"
                        list="tailNumbers"
                    />
                    <datalist id="tailNumbers">
                    {tailNumberOptions && tailNumberOptions.map((data, index) => (
                        <option key={data.acid || index} value={data.acid}>{data.acid}</option>
                    ))}
                    </datalist>
            </div>

            <div className='header-segment-right'>
                <label htmlFor="plane-type-select">Plane Type</label>
                <select
                    id="plane-type-select"
                    className="dropdown"
                    value={selectedPlaneTypeFilter}
                    onChange={handlePlaneTypeFilterChange}
                >
                    <option value="All Types">All Types</option>
                    {planeTypes.map((obj, index) => (
                    <option key={index} value={obj.type}>{obj.type}</option>
                    ))}
                </select>
                <label htmlFor="plane-size-select">Plane Size</label>
                <select
                    id="plane-size-select"
                    className="dropdown"
                    value={selectedPlaneSizeFilter}
                    onChange={handlePlaneSizeFilterChange}
                >
                    <option value="All Sizes">All Sizes</option>
                    {planeSizes.map((obj, index) => (
                    <option key={index} value={obj.size}>{obj.size}</option>
                    ))}
                </select>

            </div>
        </div>

    );
};

export default SimulatorHeader; 

