import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Simulator.css';

// import { get } from '../../../server/routes/simulatorRoutes'

const data = [
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},
    { tailNumber: "N246QS", status: "Parked", type: "CL-650S", nextEvent: "2 / 3 / 2025 11:15:00"},


];

const recc = [
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
    {tailNumber: "N246QS", status: "Parked", nextEvent: "2 / 3 / 2025 ", details: "extra extra extra"},
];

const SimulatorComponent = () => {
    const { iata_code } = useParams();
    const [expandedRow, setExpandedRow] = useState(null);
    const [fboData, setFboData] = useState([]);
    const [fleetData, setFleetData] = useState([]);
    const [arrivingPlanes, setArrivingPlanes] = useState([]);
    const [departingPlanes, setDepartingPlanes] = useState([]);


//  SPACES CHANGING THAT NEED TO CHANGE WITH NEW DATA?
    const [totalSpace, setTotalSpace] = useState(0);
    const [takenSpace, setTakenSpace] = useState(0);
    const [selectedFBO, setSelectedFBO] = useState(null);
    const [selectedAirport, setSelectedAirport] = useState(null);
    const [localTime, setLocalTime] = useState(new Date().toLocaleString());

    const [recs, setRecs] = useState([]);

    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    useEffect(() => {
        const getAirportFBOs = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getAirportFBOs/${iata_code}`);
                setFboData(response.data);
                const totalSpace = response.data.reduce((sum, fbo) => sum + (fbo.Total_Space || 0), 0);
                setTotalSpace(totalSpace);
                const takenSpace = response.data.reduce((sum, fbo) => sum + (fbo.Parking_Space_Taken || 0), 0);
                setTakenSpace(takenSpace);
                if (response.data.length > 0) {
                    setSelectedFBO(response.data[0]);
                    setSelectedAirport(response.data[0].Airport_Code);
                }
            } catch (error) {
                console.error('Error fetching airport FBOs AHHHHHH:', error);
            }
        };

        // Get ALL tail numbers 
        const getNetjetsFleet = async () => {
            try {
                const response = await axios.get('http://localhost:5001/simulator/getNetjetsFleet');
                setFleetData(response.data);
            } catch (error) {
                console.error('Error fetching NetJets fleet:', error);
            }
        };

        const getArrivingPlanes = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getArrivingPlanes/${iata_code}`);
                setArrivingPlanes(response.data);
            } catch (error) {
                console.error('Error fetching arriving planes:', error);
            }
        };

        const getDepartingPlanes = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getDepartingPlanes/${iata_code}`);
                setDepartingPlanes(response.data);
            } catch (error) {
                console.error('Error fetching departing planes:', error);
            }
        };

        const getRecommendations = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getRecommendations/${iata_code}`);
                setRecs(response.data);
                console.log('Recommendations:', response.data);
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            }
        };

        getRecommendations();
        getNetjetsFleet();
        getAirportFBOs();
        getArrivingPlanes();
        getDepartingPlanes();
    }, [iata_code]);

    // For updating local time 
    // Currently just our time but can change individual airport times 
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const formattedDate = `${now.toLocaleDateString('en-us', {day: 'numeric', month: 'numeric', year: 'numeric'})}, ${now.toLocaleTimeString('en-us', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})}`;
            setLocalTime(formattedDate);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // When FBO is selected from dropdown
    // Changes var to selected one that changes other divs on page 
    const handleFBOChange = (event) => {
        const selectedFBOName = event.target.value;
        const selectedFBO = fboData.find(fbo => fbo.FBO_Name === selectedFBOName);
        setSelectedFBO(selectedFBO);
    };


    

    return (
        <div>
            <div id="simulator-grid">
                <div id="head-dashboard">
                    <div id="header1">
                        <div className='header-segment-large'>
                            <div id="title-wrapper">
                                <button id="back-button-sim">
                                    <img src="/back-arrow.png" alt="Back Button"></img>
                                </button>
                                <div id="airport-title">{selectedAirport}</div>
                                <div id="sim-title">Flight Simulator</div>
                            </div>
                            <div id='fbo-title-sim'>{selectedFBO ? selectedFBO.FBO_Name : 'Select an FBO'}</div>
                        </div>
                    </div>
                    <div className='header-segment-small'>
                        <div >{selectedAirport} Capacity</div>
                        <div>{takenSpace}/{totalSpace}</div>
                        <div>FBO Capacity</div>
                        {selectedFBO && (
                            <div>{selectedFBO.Parking_Space_Taken}/{selectedFBO.Total_Space}</div>
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
                    <div className='header-segment-small'>
                        <label htmlFor="dropdown">Tail Number</label>
                        <select id="dropdown" name="dropdown">
                            {/* {fleetData.map((data, index) => (
                                <option key={index}>{data.acid}</option>
                            ))} */}
                            <option>N244QS</option>
                         
                        </select>
                        <label htmlFor="dropdown">FBO</label>
                        <select id="dropdown" name="dropdown" onChange={handleFBOChange} value={selectedFBO ? selectedFBO.FBO_Name : ''}>
                            {fboData.map((data, index) => (
                                <option key={index}>{data.FBO_Name}</option>
                            ))}
                        </select>
                    </div>
                    <div className='header-segment-small'>
                        <label htmlFor="datetime">Arrival Time</label>
                        <input type="datetime-local" id="time" name="time"></input>
                        <label htmlFor="local-datetime">Local Time</label>
                        <input type="text" id="local-datetime" readOnly value={localTime}></input>
                    </div>
                    <div className='header-segment-large'>
                        <div id="plane-info-wrapper">
                            <div className="plane-info-section">
                                <div className="plane-section-title">Spots Required</div>
                                <div className="plane-section-status">1</div>
                            </div>
                            <div className="plane-info-section">
                                <div className="plane-section-title">Type Name</div>
                                <div className="plane-section-status">CL-650S</div>
                            </div>
                            <div className="plane-info-section">
                                <div className="plane-section-title">Cabin Size</div>
                                <div className="plane-section-status">Large</div>
                            </div>
                            <div className="plane-info-section">
                                <div className="plane-section-title">Current Location</div>
                                <div className="plane-section-status">KEGE</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="main-wrapper">
                    <div id="planes-table">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Tail Number</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                    <th>Next Event</th>
                                </tr>
                            </thead>
                            <tbody>
                                {arrivingPlanes.map((val, key) => (
                                    <tr key={key}>
                                        <td className="status-wrapper">
                                            <div className="status-box blue-color"></div>
                                        </td>
                                        
                                        <td>{val.acid}</td> {/* Tail # */}
                                        <td>Arriving</td> {/* Status  */}
                                        <td>CL-650</td> {/*plane type */}
                                        <td>{val.eta}</td> {/* next event */}
                                    </tr>
                                ))}
                                {departingPlanes.map((val, key) => (
                                    <tr key={key}>
                                        <td className="status-wrapper">
                                            <div className="status-box yellow-color"></div>
                                        </td>
                                        <td>{val.acid}</td> {/* Tail # */}
                                        <td>Departing</td> {/* Status  */}
                                        <td>cc</td> {/*plane type */}
                                        <td>{new Date(val.etd).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}, {new Date(val.etd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                                    </tr>
                                ))}

                                
                            </tbody>
                        </table>
                    </div>
                    <div id="alerts-center">
                        <div id="alerts-title">ALERTS</div>
                        <div>Move Recommendations</div>
                        <div id="rec-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tail Number</th>
                                        <th>Status</th>
                                        <th>Next Event</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recs.map((val, key) => (
                                        <React.Fragment key={key}>
                                            <tr className="expandable-row">
                                                <td className="alert-wrapper">
                                                    <div className="alert-box green-color"></div>
                                                    <span>{val.tailNumber}</span>
                                                </td>
                                                <td>{val.status}</td>
                                                <td className='alert-wrapper'>
                                                    <span>{val.nextEvent}</span>
                                                    <div onClick={() => toggleRow(key)} className={expandedRow === key ? 'up-arrow' : 'down-arrow'}></div>
                                                </td>
                                            </tr>
                                            {expandedRow === key && (
                                                <tr className="expanded-content active">
                                                    <td colSpan="5">{val.recString}</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulatorComponent;