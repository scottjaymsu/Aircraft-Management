import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";
// import "../styles/SummaryPage.css";
import "../styles/Simulator.css";
import Table from '../components/Table';

// For Alerts Center on right of Simulator Page
const SimulationTab = ({ fbo, id }) => {

        const timeInterval = 30000000;
        const { airportCode } = useParams();
        const [fboData, setFboData] = useState([]);
        const [fleetData, setFleetData] = useState([]);
        const [searchTerm, setSearchTerm] = useState('');

        const [planeTimes, setPlaneTimes] = useState({});
    
    
        // Data for all flight plans this airport 
        const [allPlanes, setAllPlanes] = useState([]);
    
        const [selectedFBO, setSelectedFBO] = useState("All FBOs");
        const [localTime, setLocalTime] = useState(new Date().toLocaleString());

        const [selectedPlanes, setSelectedPlanes] = useState([]);
        const [simulationStatus, setSimulationStatus] = useState("");
        const [simulationResult, setSimulationResult] = useState({});
        // Fetch all planes at the airport
        // To pupulate the table with all planes associated with this airport
        const fetchAllPlanes = useCallback(async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getAllPlanes/${airportCode}`);
                if (Array.isArray(response.data)) {
                    setAllPlanes(response.data);
                } else {
                    console.error("Invalid response for getAllPlanes:", response.data);
                    // Fallback to an empty array
                    setAllPlanes([]);
                }
            } catch (error) {
                console.error('Error fetching all planes:', error);
                setAllPlanes([]);
            }
        }, [airportCode]);
    
    
        // Fetching all static data for the simulator
        useEffect(() => {
            // Get all FBOs at the airport
            const getAirportFBOs = async () => {
                try {
                    console.log(`Fetching data for location: ${airportCode}`);
                    const response = await axios.get(`http://localhost:5001/simulator/getAirportFBOs/${airportCode}`);
                    setFboData(response.data);
                } catch (error) {
                    console.error('Error fetching airport FBOs:', error);
                }
            };
    
            //Get ALL NetJets tail numbers, current location, cabin size, spots required 
            const getNetjetsFleet = async () => {
                try {
                    const response = await axios.get('http://localhost:5001/simulator/getNetjetsFleet');
                    setFleetData(response.data);
                } catch (error) {
                    console.error('Error fetching NetJets fleet:', error);
                }
            };

    
            getNetjetsFleet();
            getAirportFBOs();
            fetchAllPlanes();
    
            // For Automatic Refresh 
            const interval = setInterval(fetchAllPlanes, timeInterval);
            return () => clearInterval(interval); 
    
        }, [airportCode, fetchAllPlanes, timeInterval]);
    
        // Constant Updates time in GMT
        // Currently just our time but can change individual airport times 
        useEffect(() => {
            const interval = setInterval(() => {
                const now = new Date();
                // Month/Day/YEAR Hour:Minute:Second GMT
                const formattedDate = now.toLocaleString('en-US', {
                    timeZone: 'GMT',
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }) + ' GMT';
                setLocalTime(formattedDate);
            }, 1000);
    
            return () => clearInterval(interval);
        }, []);
    
        // Switches to selected FBO when selected from the dropdown
        // Planes assigned to that FBO will only be shown when selected
        const handleFBOChange = (event) => {
            const selectedFBOName = event.target.value;
            if (selectedFBOName === "All FBOs") {
                setSelectedFBO("All FBOs"); 
            } else {
                const selectedFBO = fboData.find(fbo => fbo.FBO_Name === selectedFBOName);
                setSelectedFBO(selectedFBO ? selectedFBO.FBO_Name : "All FBOs"); 
            }
        };
        // Filter planes based on selected FBO
        const filteredPlanes = selectedFBO === "All FBOs" 
            ? allPlanes 
            : allPlanes.filter(plane => plane.FBO_name === selectedFBO);
    
        // When a plane from NetJets fleet is selected from dropdown
        const handleTailNumberChange = (event) => {
            const selectedTailNumbers = Array.from(event.target.selectedOptions, option => option.value);
            setSelectedPlanes(selectedTailNumbers);
        };

        const handleTimeChange = (tailNumber, time) => {
            setPlaneTimes(prevState => ({
                ...prevState,
                [tailNumber]: time
            }));
        };
    
        // Filtered fleet data for dropdown 
        const filteredFleetData = fleetData.filter(plane =>
            plane.acid.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const tableRows = fleetData.filter(plane => selectedPlanes.includes(plane.acid)).map(plane => {
            const fboName = simulationResult[plane.acid] ? simulationResult[plane.acid].fbo_name : '';
            const time = planeTimes[plane.acid] || '';
            return [
                plane.acid,
                plane.plane_type,
                plane.size,
                <input
                    key={plane.acid}
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(plane.acid, e.target.value)}
                    className='time-input'
                />,
                fboName
            ];
        });
        const tableHeaders = ["Tail Number", "Plane Type", "Size", "Time", "FBO Name"];

        const runSimulation = async () => {
            try {
                const simulationData = {
                    selectedPlanes,
                    airportCode
                };
                const response = await axios.post('http://localhost:5001/simulator/runSimulation', simulationData);
                if(response.data.success) {
                    setSimulationResult(response.data.data);
                    console.log("Simulation result: ", response.data.data)
                }
                else {
                    setSimulationStatus("Simulation failed.")
                }
            } catch (error) {
                setSimulationStatus("Error running simulation.");
                console.log("Error during simulation");
            }
        }

    return (
        <div id="alerts-center" className="add-bottom">
            <div id="alerts-title">SIMULATION</div>
            <div className=" alerts-simulator">
                     <div className='header-segment-small'>
                     <label htmlFor="dropdown">Tail Numbers (Select Multiple)</label>
                
                     <select
                         multiple
                         className="dropdown"
                         name="dropdown"
                        onChange={handleTailNumberChange}
                        value={selectedPlanes}
                        size={10}>
                        {filteredFleetData.map((data, index) => (
                            <option key={index} value={data.acid}>{data.acid}</option>
                        ))}
                    </select>
                    <Table
                        headers={tableHeaders}
                        rows={tableRows}
                        title="Selected Planes"
                        className="planes-table sim-table"
                    />
                    {simulationStatus && <p>{simulationStatus}</p>}
                    <button className="run-simulation-button" onClick={runSimulation}>Run Simulation</button>
               
                </div>
                
            </div>

        </div>
    );
};

export default SimulationTab;