import React, { useState, useEffect, useCallback } from 'react';
import ReactDom from 'react-dom';
import axios from 'axios';
import '../styles/FlightTable.css';
import '../styles/Capacities.css';

const Capacities = ({ id }) => {
    const [aircraftAverages, setAircraftAverages] = useState([]);
    const [fboInfo, setFboInfo] = useState([]);
    const [selectedFBO, setSelectedFBO] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [area, setArea] = useState(0);
    const [fboAreas, setFboAreas] = useState({});

    const [spacesAvailable, setSpacesAvailable] = useState({
        'Light': 0,
        'Mid-Size': 0,
        'Super Mid-Size': 0,
        'Large': 0,
        'Long Range Large': 0
    });

    // store fbos and areas
    useEffect(() => {
        const fetchFboData = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/airportData/getAllFboCapacities/${id}`);
                const fboMap = {};

                // Build map of FBO to remaining area
                response.data.forEach(item => {
                    fboMap[item.fbo] = parseFloat(item.area_remaining);
                });

                setFboAreas(fboMap);

                // Set fboInfo with objects that have a `name` key
                const fboNames = response.data.map(item => ({ name: item.fbo }));
                setFboInfo(fboNames);
            } catch (error) {
                console.error('Error fetching FBO capacities:', error);
            }
        };

        fetchFboData();
    }, [id]);


    const toggleDropdown = () => {
        setShowDropdown((prev) => !prev);
    };

    
    // get selected fbo area
    useEffect(() => {
        if (selectedFBO) {
            setArea(fboAreas[selectedFBO]);
        }
    }, [selectedFBO, fboAreas]);

    // get aircraft averages
    useEffect(() => {
        const fetchAircraftAverages = async () => {
            try {
                const response = await fetch('http://localhost:5001/airports/getAircraftAverages');
                const data = await response.json();
                setAircraftAverages(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchAircraftAverages();
    }, []);

    useEffect(() => {
        if (aircraftAverages.length > 0 && selectedFBO && area > 0) {
            const updatedSpacesAvailable = { ...spacesAvailable };

            Object.keys(updatedSpacesAvailable).forEach((type) => {
                const averageOfType = aircraftAverages.find(avg => avg.size === type);

                updatedSpacesAvailable[type] = averageOfType && averageOfType.average_parking_area > 0
                    ? Math.floor(area / averageOfType.average_parking_area)
                    : 0;
            });

            setSpacesAvailable(updatedSpacesAvailable);
        }
    }, [aircraftAverages, selectedFBO, area]);

    return (
        <div className='table-container'>
            <div className='fbo-selector'>
                <caption>
                    Open Parking <br></br>
                    by Aircraft Type
                </caption>
                <div className='dropdown-wrapper'>
                    <button className="fbo-button" onClick={toggleDropdown}>
                    {selectedFBO ? selectedFBO : "Select FBO"}
                   
                    </button>
                    {showDropdown && (
                        <ul className="dropdown-menu">
                            {fboInfo.length > 0 ? (
                                fboInfo.map((fbo, index) => (
                                    <li
                                        key={index}
                                        onClick={() => {
                                            setSelectedFBO(fbo.name);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {fbo.name}
                                    </li>
                                ))
                            ) : (
                                <li>No FBOs available</li>
                            )}
                        </ul>
                    )}
                </div>
                
            </div>
            <table>
                <thead>
                    <tr>
                        <th className='center-content'>Aircraft Type</th>
                        <th className='center-content'>Spaces Available</th>
                    </tr>
                </thead>
                <tbody className='flight-table-container'>
                    {Object.entries(spacesAvailable).map(([type, spaces]) => (
                        <tr key={type}>
                            <td className='center-content'>{type}</td>
                            <td className='center-content'>{spaces}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Capacities;
