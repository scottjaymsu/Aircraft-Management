import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";
import "../styles/Simulator.css";
import Table from '../components/Table';

/* This is the tab that opens up in place of the recommendation tab in the simulator page.
The purpose of this area of the website is for users to simulate future availability at airports by selecting a batch number of airplanes
that they want to determine if there will be space at the airport at a designated time that they choose. If there is space, it will direct them
to the specific FBO that will be able to accomodate the plane. If not, it will inform the user that there will be no space for this airplane.*/
const SimulationTab = ({ fbo, id }) => {

        const { airportCode } = useParams();
        const [fleetData, setFleetData] = useState([]);
        const [planeTimes, setPlaneTimes] = useState({});
        const [selectedPlanes, setSelectedPlanes] = useState([]);
        const [simulationStatus, setSimulationStatus] = useState("");
        const [simulationResult, setSimulationResult] = useState({});
        const [time, setTime] = useState('');
        const [searchQuery, setSearchQuery] = useState('');
    
        // Fetching all static data for the simulator
        useEffect(() => {            
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
        }, [airportCode]);
    

        // When a plane from NetJets fleet is selected from dropdown
        const handleTailNumberChange = (event) => {
            const selectedTailNumbers = Array.from(event.target.selectedOptions, option => option.value);
            setSelectedPlanes(prevSelectedPlanes => {
                const updatedSelectedPlanes = new Set(prevSelectedPlanes);
                selectedTailNumbers.forEach(tailNumber => updatedSelectedPlanes.add(tailNumber));
                return Array.from(updatedSelectedPlanes);
            });
        };

        /* When a user selects a time for the row that contains a specific acid, this will set the time associated with the tail number */
        /*const handleTimeChange = (tailNumber, time) => {
            setPlaneTimes(prevState => ({
                ...prevState,
                [tailNumber]: time
            }));
        };*/
        const handleTimeChange = (e) => {
            console.log("Time: ", time);
            setTime(e.target.value);
        }

        const filteredFleetData = fleetData.filter(plane =>
            plane.acid.toLowerCase().includes(searchQuery.toLowerCase())
        );

        /* Population of the table. It will filter through the entire fleetData, and if the list of selected Planes is included, it will
        populate the metadata of that plane on the table. This also sets up the user input for the time selection and the column to display the FBO */
        const tableRows = fleetData.filter(plane => selectedPlanes.includes(plane.acid)).map(plane => {
            const fboName = simulationResult[plane.acid] ? simulationResult[plane.acid].fbo_name : '';
            const time = planeTimes[plane.acid] || '';
            return [
                plane.acid,
                plane.plane_type,
                plane.size,
                /*<input
                    key={plane.acid}
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(plane.acid, e.target.value)}
                    className='time-input'
                />,*/
                fboName
            ];
        });

        const tableHeaders = ["Tail Number", "Plane Type", "Size", "FBO Name"];

        /* When the user clicks the RUN SIMULATION button (tbh, the button is just for show since it can do this without user input).
        Sends request to backend which is where we're doing all the calculations for determining if there is space. The responses depend on what's
        returned. If it has a success, it will set the Result in the columns. If not, the simulation status is set to failed. If there is any kind
        of error during the simulation, it will specify that as well */
        const runSimulation = async () => {
            try {
                const simulationData = {
                    selectedPlanes,
                    time,
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
            <div className="header-segment-small">
                    <label htmlFor="search">Search Tail Numbers</label>
                    <input
                        type="text"
                        id="search"
                        placeholder="Search by Tail Number"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {/* Airplane Selector Table */}
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
                    <div className="time-input-section">
                        <label htmlFor="time">Select Time:</label>
                        <input
                            id="time"
                            type="time"
                            value={time}
                            onChange={handleTimeChange}
                            className="time-input"/>
                    </div>
                     {/* Airplane Simulator Table */}
                    <Table
                        headers={tableHeaders}
                        rows={tableRows}
                        title="Selected Planes"
                        className="planes-table sim-table"
                    />
                     {/* Simulation Status and Simulator Button */}
                    {simulationStatus && <p>{simulationStatus}</p>}
                    <button className="run-simulation-button" onClick={runSimulation}>Run Simulation</button>
                </div>  
            </div>
        </div>
    );
};

export default SimulationTab;