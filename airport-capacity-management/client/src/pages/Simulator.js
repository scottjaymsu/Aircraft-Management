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
    const [planeTypes, setPlaneTypes] = useState([]);
    const [planeSizes, setPlaneSizes] = useState([]);
    const [fleetData, setFleetData] = useState([]);
    const [selectedPlaneType, setSelectedPlaneType] = useState('');
    const [selectedPlaneLocation, setSelectedPlaneLocation] = useState('');
    const [selectedPlaneSize, setSelectedPlaneSize] = useState('');
    const [selectedSpots, setSelecteedSpots] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');


    // Data for all flight plans this airport 
    const [allPlanes, setAllPlanes] = useState([]);


    const [totalSpace, setTotalSpace] = useState(0);
    const [takenSpace, setTakenSpace] = useState(0);
    // Filter based on selected FBO
    const [selectedFBO, setSelectedFBO] = useState("All FBOs");
    // Filter based on selected plane type
    const [selectedPlaneTypeFilter, setSelectedPlaneTypeFilter] = useState("All Types");
    // Filter based on selected plane size
    const [selectedPlaneSizeFilter, setSelectedPlaneSizeFilter] = useState("All Sizes");

    const [selectedTailNumber, setSelectedTailNumber] = useState('');

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

        // Get all plane types
        const getPlaneTypes = async () => {
            try {
                const response = await axios.get('http://localhost:5001/simulator/getPlaneTypes');
                setPlaneTypes(response.data);
            } catch (error) {
                console.error('Error fetching plane types:', error);
            }
        };
        // Get all plane sizes
        const getPlaneSizes = async () => {
            try {
                const response = await axios.get('http://localhost:5001/simulator/getPlaneSizes');
                setPlaneSizes(response.data);
            } catch (error) {
                console.error('Error fetching plane sizes:', error);
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

        getPlaneTypes();
        getPlaneSizes();
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
    const handleFBOChange = (selectedFBOName) => {
        if (selectedFBOName === "All FBOs") {
          setSelectedFBO("All FBOs");
        } else {
          const selectedFBO = fboData.find(fbo => fbo.FBO_Name === selectedFBOName);
          setSelectedFBO(selectedFBO ? selectedFBO.FBO_Name : "All FBOs");
        }
      };
      

    // Filter planes based on selected plane type
    const handlePlaneTypeFilterChange = (event) => {
        setSelectedPlaneTypeFilter(event.target.value);

    };

    // Filter planes based on selected plane size
    const handlePlaneSizeFilterChange = (event) => {
        setSelectedPlaneSizeFilter(event.target.value);
    };
    
    const filteredPlanes = allPlanes.filter(plane => {
        const matchesFBO = selectedFBO === "All FBOs" || plane.FBO_name === selectedFBO;
        const matchesType = selectedPlaneTypeFilter === "All Types" || plane.plane_type === selectedPlaneTypeFilter;
        const matchesSize = selectedPlaneSizeFilter === "All Sizes" || plane.size === selectedPlaneSizeFilter;
        const matchesTail = selectedTailNumber === '' || plane.acid === selectedTailNumber;
        return matchesFBO && matchesType && matchesSize && matchesTail;
    });
    

    const handleTailNumberChange = (selectedTailNumber) => {
        setSearchTerm(selectedTailNumber);
        setSelectedTailNumber(selectedTailNumber); // this is what controls the filter
      
        if (!selectedTailNumber) {
          // If cleared, also reset plane info state
          setSelectedPlaneType('');
          setSelectedPlaneLocation('');
          setSelectedPlaneSize('');
          setSelecteedSpots('');
          return;
        }
      
        const selectedPlane = allPlanes.find(plane => plane.acid === selectedTailNumber);
      
        setSelectedPlaneType(selectedPlane?.plane_type || 'Unavailable');
        setSelectedPlaneLocation(selectedPlane?.FBO_name || 'N/A');
        setSelectedPlaneSize(selectedPlane?.size || 'Unavailable');
        setSelecteedSpots(selectedPlane?.numberSpots || '1');
      };
     
    // Reset all filters to default values
    // This is called when the user clicks the "Reset Filters" button
    const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTailNumber('');
    setSelectedPlaneTypeFilter('All Types');
    setSelectedPlaneSizeFilter('All Sizes');
    setSelectedPlaneType('');
    setSelectedPlaneLocation('');
    setSelectedPlaneSize('');
    setSelecteedSpots('');
    setSelectedFBO('All FBOs'); // optional, only include if you want to reset FBO too
    };
    
    
    const filteredTailNumbers = allPlanes.filter(plane =>
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
                    fboData={fboData}
                    localTime={localTime}
                    planeTypes={planeTypes}
                    selectedPlaneTypeFilter={selectedPlaneTypeFilter}
                    handlePlaneTypeFilterChange={handlePlaneTypeFilterChange}
                    planeSizes={planeSizes}
                    selectedPlaneSizeFilter={selectedPlaneSizeFilter}
                    handlePlaneSizeFilterChange={handlePlaneSizeFilterChange}
                    tailNumberOptions={filteredTailNumbers}
                    handleResetFilters={handleResetFilters}
        

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
                     <button className="run-simulation-button" onClick={handleSimulationTabClick} id="simulation-tab-button">
                        {showSimulationTab ? "Show Recommendation Tab": "Show Simulation Tab"}
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