import React from 'react';
import { useNavigate } from "react-router-dom";
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
    filteredFleetData, 
    fboData,
    localTime, 
    selectedSpots, 
    selectedPlaneType, 
    selectedPlaneSize, 
    selectedPlaneLocation
}) => {
    // Back button navigation
    const navigate = useNavigate();
    const handleBackButton = () => {
        navigate(`/summary/${selectedAirport}`);
    }

    const handleBackClick = () => handleBackButton();

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
                <div>{takenSpace}/{totalSpace}</div>
                <div>FBO Capacity</div>
                {selectedFBO && (
                    <div>{selectedFBO?.Parking_Space_Taken || 0}/{selectedFBO?.Total_Space || 0}</div>
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
            <div className='header-segment-small'>
                <label htmlFor="dropdown">Tail Number</label>
                <input 
                    type="text" 
                    className="dropdown" 
                    name="dropdown" 
                    value={searchTerm} 
                    onChange={handleTailNumberChange} 
                    placeholder="Search Tail Number"
                    list="tailNumbers"
                />
                <datalist id="tailNumbers">
                    {filteredFleetData.map((data, index) => (
                        <option key={data.acid || index} value={data.acid}>{data.acid}</option>
                    ))}
                </datalist>

                <label htmlFor="dropdown">FBO</label>
                <select className="dropdown" name="dropdown" onChange={handleFBOChange} value={selectedFBO ? selectedFBO.FBO_Name : ''}>
                    {fboData.map((data, index) => (
                        <option key={index}>{data.FBO_Name}</option>
                    ))}
                </select>
           

            </div>
            <div className='header-segment-small'>
                {/* <label htmlFor="datetime">Arrival Time</label>
                <input type="datetime-local" id="time" name="time"></input> */}
                <label htmlFor="local-datetime">Local Time</label>
                <input type="text" id="local-datetime" readOnly value={localTime || "Loading..."}></input>
            
            </div>
            <div className='header-segment-large'>
                <div id="plane-info-wrapper">
                    <div className="plane-info-section">
                        <div className="plane-section-title">Spots Required</div>
                        <div className="plane-section-status">{selectedSpots || "N/A"}</div>
                    </div>
                    <div className="plane-info-section">
                        <div className="plane-section-title">Type Name</div>
                        <div className="plane-section-status">{selectedPlaneType || "Unknown"}</div>
                    </div>
                    <div className="plane-info-section">
                        <div className="plane-section-title">Cabin Size</div>
                        <div className="plane-section-status">{selectedPlaneSize|| "Unknown"}</div>
                    </div>
                    <div className="plane-info-section">
                        <div className="plane-section-title">Current Location</div>
                        <div className="plane-section-status">{selectedPlaneLocation || "Unknown"}</div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default SimulatorHeader; 
