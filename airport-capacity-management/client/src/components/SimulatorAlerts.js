import React, { useState, useEffect, use } from "react";
import axios from "axios";
import "../styles/Simulator.css";

const SimulatorAlerts = ({ fbo, id }) => {
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState("");
    const [fboData, setFboData] = useState([]);
    const [expandedRows, setExpandedRows] = useState({}); 
    const [nearestAirport, setNearestAirport] = useState(null);

    useEffect(() => {
        setAlerts([]);
        setError("");
        axios
            .get(`http://localhost:5001/alerts/getAlert/${id}/${fbo}`)
            .then((response) => {
                const filteredAlerts = response.data.filter(
                    (alert) => alert.status !== "SCHEDULED" && alert.status !== "MAINTENANCE"
                );
                setAlerts(filteredAlerts);
            })
            .catch((err) => {
                setError(err.message);
                console.error("Error fetching alert information:", err);
            });
    }, [id, fbo]);

    useEffect(() => {
        axios
            .get(`http://localhost:5001/alerts/getFBOs/${id}`)
            .then((response) => {
                setFboData(response.data);
            })
            .catch((err) => {
                setError(err.message);
                console.error("Error fetching FBO data:", err);
            });
    }, [id]);

    useEffect(() => {
        axios
            .get(`http://localhost:5001/simulator/getRecommendations/${id}`)
            .then((response) => {
                if (response.data && response.data.length > 0) {
                    // Get the first recString entry
                    setNearestAirport(response.data[0].recString); 
                }
            })
            .catch((err) => {
                setError(err.message);
                console.error("Error fetching nearest airport:", err);
            });
    }, [id]);

    const fboPriority = fboData.find((fboItem) => fboItem.FBO_Name === fbo)?.Priority;

    let rec = null;
    for (const fboItem of fboData) {
        if (fboItem.parked_planes_count < fboItem.Total_Space && fboItem.Priority > fboPriority) {
            rec = fboItem.FBO_Name;
            break;
        }
    }

    if (rec === null) {
        rec = nearestAirport;
    }    

    const toggleRow = (acid) => {
        setExpandedRows((prev) => ({
            // Preserve the previous rows' states
            ...prev, 
            // Toggle the clicked row's expanded state based on acid
            [acid]: !prev[acid], 
        }));
    };

    return (
        <div id="alerts-center">
            <div id="alerts-title">
                Operational Recommendations 
                <div id="sort-by">
                    <span id="sort-by-text">Sort By...</span>
                    <button className="reset-button" onClick={() => setAlerts([...alerts].sort((a, b) => new Date(a.eta) - new Date(b.eta)))} >
                        Time Grounded
                    </button>
                    <button className="reset-button" onClick={() => setAlerts([...alerts].sort((a, b) => a.parkingArea - b.parkingArea))}>
                        Size
                    </button>
                </div>
            </div>
            <div id="rec-table">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tail Number</th>
                                <th>Jet Type</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.length > 0 ? (
                                alerts
                                    // Filter out alerts with unknown acid
                                    .filter((alert) => alert.acid) 
                                    .map((alert) => (
                                        <React.Fragment key={alert.acid}>
                                            <tr onClick={() => toggleRow(alert.acid)} style={{ cursor: "pointer" }}>
                                                <td>
                                                    <div className="alert-box green-color"></div>
                                                    <span>{alert.acid}</span>
                                                </td>
                                                <td>{alert.plane_type || "Unknown"}</td>
                                                <td>{alert.size || "Unknown"}</td>
                                            </tr>
                                            {expandedRows[alert.acid] && (
                                                <tr>
                                                    <td colSpan="3">
                                                        <div>
                                                            <strong>Recommendation:</strong>
                                                            <p>{rec ? `Move to ${rec}` : "No recommendation available"}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: "center" }}>No recommendations available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SimulatorAlerts;
