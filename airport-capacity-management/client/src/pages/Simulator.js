import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Simulator.css';

import SimulatorHeader from '../components/SimulatorHeader';
import SimulatorAllPlanes from '../components/SimulatorAllPlanes';
import SimulatorAlerts from '../components/SimulatorAlerts';
import SimulationTab from '../components/SimulationTab';

const SimulatorComponent = () => {
    // INT for refresh
    const timeInterval = 30000000; // 5 minutes 
    const { airportCode } = useParams();
    const [expandedRow, setExpandedRow] = useState(null);
    const [fboData, setFboData] = useState([]);
    const [fleetData, setFleetData] = useState([]);
    const [selectedPlaneType, setSelectedPlaneType] = useState('');
    const [selectedPlaneLocation, setSelectedPlaneLocation] = useState('');
    const [selectedPlaneSize, setSelectedPlaneSize] = useState('');
    const [selectedSpots, setSelecteedSpots] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');


    // Data for all flight plans this airport 
    const [allPlanes, setAllPlanes] = useState([]);

    //
    const [totalSpace, setTotalSpace] = useState(0);
    const [takenSpace, setTakenSpace] = useState(0);
    const [selectedFBO, setSelectedFBO] = useState("All FBOs");
    const [selectedAirport, setSelectedAirport] = useState(null);
    const [localTime, setLocalTime] = useState(new Date().toLocaleString());

    // Recommendation Data being stored
    // Processed in Controller
    const [recs, setRecs] = useState([]);
    const [showSimulationTab, setShowSimulationTab] = useState(false);

    // When the user clicks the "Show Simulation Tab" button, it will open the SimulationTab component
    const handleSimulationTabClick = () => {
        setShowSimulationTab((prevState) => !prevState);
    }

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


    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    // Fetching all static data for the simulator
    useEffect(() => {
        // Get all FBOs at the airport
        const getAirportFBOs = async () => {
            try {
                console.log(`Fetching data for location: ${airportCode}`);
                const response = await axios.get(`http://localhost:5001/simulator/getAirportFBOs/${airportCode}`);
                setFboData(response.data);
                const totalRow = response.data[0];
                setTotalSpace(totalRow.Total_Space || 0);
                setTakenSpace(totalRow.Parking_Space_Taken || 0);

                // Set default FBO to first one in list
                setSelectedFBO("All FBOs");
                setSelectedAirport(response.data[0].Airport_Code);
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

        // Get reccomendations to populate from rec engine
        const getRecommendations = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/simulator/getRecommendations/${airportCode}`);
                setRecs(response.data);

                console.log('Recommendations:', response.data);
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            }
        };

        getNetjetsFleet();
        getAirportFBOs();
        fetchAllPlanes();
        getRecommendations();

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
        const selectedTailNumber = event.target.value;
        setSearchTerm(selectedTailNumber);
        const selectedPlane = fleetData.find(plane => plane.acid === selectedTailNumber);
        setSelectedPlaneType(selectedPlane && selectedPlane.plane_type ? selectedPlane.plane_type: 'Unavailable');
        setSelectedPlaneLocation(selectedPlane && selectedPlane.current_location ? selectedPlane.current_location: 'N/A');
        setSelectedPlaneSize(selectedPlane && selectedPlane.size ? selectedPlane.size: 'Unavailable');
        setSelecteedSpots(selectedPlane && selectedPlane.numberSpots ? selectedPlane.numberSpots: '1'); 
        // For autofilling dropdown
        setSearchTerm(event.target.value); 
    };

    // Filtered fleet data for dropdown 
    const filteredFleetData = fleetData.filter(plane =>
        plane.acid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    

    return (
        <div>
            <div id="simulator-grid">
                {/* 
                    Top Segment of Dashboard With capacity info
                    and dropdowns for selecting planes and FBOs
                */}
                <SimulatorHeader
                    selectedAirport={selectedAirport}
                    selectedFBO={selectedFBO}
                    takenSpace={takenSpace}
                    totalSpace={totalSpace}
                    searchTerm={searchTerm}
                    handleTailNumberChange={handleTailNumberChange}
                    handleFBOChange={handleFBOChange}
                    filteredFleetData={filteredFleetData}
                    fboData={fboData}
                    localTime={localTime}
                    selectedSpots={selectedSpots}
                    selectedPlaneType={selectedPlaneType}
                    selectedPlaneSize={selectedPlaneSize}
                    selectedPlaneLocation={selectedPlaneLocation}
                />
    
                <div id="main-wrapper">
                    {/* 
                        Table of all planes at the airport
                     */}
                    <SimulatorAllPlanes
                        allPlanes={filteredPlanes}
                        selectedAirport={selectedAirport}
                    />

                    {/* 
                        Our Recommendations for the Aiport 
                        and Capacity Movement 
                     */}
                     <div>
                     <button onClick={handleSimulationTabClick} id="simulation-tab-button">
                        {showSimulationTab ? "Hide Simulation Tab": "Show Simulation Tab"}
                    </button>
                    {showSimulationTab ? (
                        <SimulationTab
                        fbo={selectedFBO}
                        id={airportCode}
                    />) : (
                    <SimulatorAlerts
                        fbo={selectedFBO}
                        id={airportCode}
                    />)
                }
                     </div>
                </div>
            </div>
        </div>
    );
};

export default SimulatorComponent;