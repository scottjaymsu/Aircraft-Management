import React from 'react';
import '../styles/Simulator.css';
import '../styles/Scrollable.css';
import axios from 'axios';

// List of all planes currently at the airport 
const SimulatorAllPlanes = ({ allPlanes, selectedAirport }) => {

    /* This is run when a user clicks on the colored square next to a plane to put them into maintenance (or take them out). If the plane is already in maintenance, it will prompt the user to remove from maintenance. If not, it will prompt to add to maintenance. */
    const handleMaintenanceClick = async (acid, status) => {
        if (status !== "Maintenance") {
            const confirm = window.confirm("Would you like to add this plane to maintenance?");
            if (confirm) {
                try {
                    const response = await axios.get(`http://localhost:5001/simulator/addMaintenance/${acid}?airport=${selectedAirport}`);
                    if (response.status === 200) {
                        console.log("Plane added to maintenance");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        } else {
            const confirmRemove = window.confirm("Do you want to remove this plane from maintenance?");
            if (confirmRemove) {
                try {
                    const response = await axios.get(`http://localhost:5001/simulator/removeMaintenance/${acid}`);
                    if (response.status === 200) {
                        console.log("Plane removed from maintenance");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }
    return (
        <div id="planes-table">
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Tail Number</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Next Event</th>
                    </tr>
                </thead>
            </table>
            <div className = "scrollable-tbody">
                <table>
                    <tbody>
                        {allPlanes?.map((val, key) => (
                            <tr
                                key={val.acid || key}
                            >
                                <td className="status-wrapper">
                                    <div className={`status-box ${val.status === 'Arriving' ? 'blue-color' : val.status === 'Departing' ? 'yellow-color' : val.status === 'Parked' ? 'green-color' : 'red-color'}`}
                                        onClick={() => handleMaintenanceClick(val.acid, val.status)}></div>
                                </td>
                                <td>
                                    {val.acid || "Unknown"}</td> {/* Tail # */}
                                <td>{val.status}</td> {/* Status  */}
                                <td>{val.plane_type ? val.plane_type : 'Unavailable'}</td> {/*plane type */}
                                <td>{val.size ? val.size : 'Unknown'}</td>
                                <td>
                                    {val.event ? new Intl.DateTimeFormat('en-US', {
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }).format(new Date(val.event)) : "TBD"}
                                </td> {/* next event */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
                
 
        </div>

    );
};

export default SimulatorAllPlanes;