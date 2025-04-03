import React, { useState, useEffect } from 'react';
import '../styles/FlightTable.css';

const Capacities = ({id, spacesLeft}) => {
    // Spaces available for each plane size
    const [spacesAvailable, setSpacesAvailable] = useState({
        'Light': 0,
        'Mid-Size': 0,
        'Super Mid-Size': 0,
        'Large': 0,
        'Long Range Large': 0
    });

    const [aircraftAverages, setAircraftAverages] = useState([]);

    // Get average for each aircraft size 
    useEffect(() => {
        // Fetch data when the component mounts
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
        // Calculate spaces after the data has been fetched
        if (aircraftAverages.length > 0) {
            const updatedSpacesAvailable = {...spacesAvailable};

            // Average area of all aircraft
            const totalAverage = aircraftAverages.reduce((sum, aircraft) => sum + aircraft.average_parking_area, 0) / aircraftAverages.length;

            // Iterate over aircraft types 
            Object.keys(updatedSpacesAvailable).forEach((type) => {
                const averageOfType = aircraftAverages.find(avg => avg.size === type);

                updatedSpacesAvailable[type] = averageOfType && averageOfType.average_parking_area > 0 
                    ? Math.floor((spacesLeft * totalAverage) / averageOfType.average_parking_area) 
                    : 0;
            });

            setSpacesAvailable(updatedSpacesAvailable);  // Update the state with the new spaces available
        }
    }, [aircraftAverages, spacesLeft]);

    return (
        <div className='table-container'>
            <table>
                <caption>Open Parking by Aircraft Type</caption>
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
