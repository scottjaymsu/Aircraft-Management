import React from 'react';
import '../styles/FlightTable.css';

const Capacities = ({id}) => {
    // Spaces available for each plane size
    const spacesAvailable = {
        'Light': 0,
        'Mid-Size': 0,
        'Super Mid-Size': 0,
        'Large': 0,
        'Long Range Large': 0
    };

    return (
        <div className='table-container'>
            <table>
                <caption>Open Parking by Aircraft</caption>
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