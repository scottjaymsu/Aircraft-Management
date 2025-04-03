import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/FlightTable.css';
import '../styles/Capacities.css';

const Capacities = ({ id, spacesLeft }) => {
    const [spacesAvailable, setSpacesAvailable] = useState({
        'Light': 0,
        'Mid-Size': 0,
        'Super Mid-Size': 0,
        'Large': 0,
        'Long Range Large': 0
    });

    const [aircraftAverages, setAircraftAverages] = useState([]);
    const [fboInfo, setFboInfo] = useState([]);
    const [selectedFBO, setSelectedFBO] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

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
        if (aircraftAverages.length > 0) {
            const updatedSpacesAvailable = { ...spacesAvailable };
            const totalAverage = aircraftAverages.reduce((sum, aircraft) => sum + aircraft.average_parking_area, 0) / aircraftAverages.length;

            Object.keys(updatedSpacesAvailable).forEach((type) => {
                const averageOfType = aircraftAverages.find(avg => avg.size === type);

                updatedSpacesAvailable[type] = averageOfType && averageOfType.average_parking_area > 0
                    ? Math.floor((spacesLeft * totalAverage) / averageOfType.average_parking_area)
                    : 0;
            });

            setSpacesAvailable(updatedSpacesAvailable);
        }
    }, [aircraftAverages, spacesLeft]);

    const fetchFBOData = useCallback(() => {
        axios
            .get(`http://localhost:5001/airports/getParkingCoordinates/${id}`)
            .then((response) => {
                if (Array.isArray(response.data) && response.data.length > 0) {
                    const fboData = response.data.map((lot) => ({
                        name: lot.FBO_Name || "Unknown",
                        spaces_left: lot.Total_Space - Math.min(lot.spots_taken, lot.Total_Space)
                    }));
                    setFboInfo(fboData);
                } else {
                    console.warn("Empty or unexpected FBO data response");
                    setFboInfo([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching FBO data >:(", error);
            });
    }, [id]);

    useEffect(() => {
        fetchFBOData();
    }, [fetchFBOData]);

    return (
        <div className='table-container'>
            <div className='fbo-selector'>
                <caption>
                    Open Parking <br></br>
                    by Aircraft Type
                </caption>
                <button className='fbo-button' onClick={() => setShowDropdown(!showDropdown)}>
                    {selectedFBO ? selectedFBO : "Select FBO"}
                </button>
                    {showDropdown && (
                    <ul className="dropdown-menu">
                        {fboInfo.length > 0 ? (
                            fboInfo.map((fbo, index) => (
                                <li key={index} onClick={() => {
                                    setSelectedFBO(fbo.name);
                                    setShowDropdown(false);
                                }}>
                                    {fbo.name}
                                </li>
                            ))
                        ) : (
                            <li>No FBOs available</li>
                        )}
                    </ul>
                )}
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
