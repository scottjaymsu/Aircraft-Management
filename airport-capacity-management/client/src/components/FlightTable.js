import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/FlightTable.css';

/**
 * Flight table
 * States hold arriving or departing flights info
 * @param id - faa designator of airport that flights are arriving or departing from
 * @param flightType - type of flight (arriving or departing)
 * @returns component
 */
function FlightTable({ id, flightType }) {
    const timeInterval = 3000000; // 5 minutes - refresh interval
    const [flights, setFlights] = useState([]);
    const [error, setError] = useState('');
    const [timeZoneAbbr, setTimeZoneAbbr] = useState('UTC');

    /* We need to fetch the timezone of the airport here so that the arriving and departing times can match the airport timezone */
    useEffect(() => {
        const fetchTimeZone = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/airportData/getCurrentTime/${id}`);
                if (response.data && response.data.timeZoneAbbr) {
                    setTimeZoneAbbr(response.data.timeZoneAbbr);
                }
            } catch (error) {
                console.error('Error fetching time zone:', error);
            }
        };
        fetchTimeZone();
    }, [id]);

    // Fetch arriving or departing flights based on the flightType
    const fetchFlights = useCallback(() => {
        const url = flightType === 'arriving' 
            ? `http://localhost:5001/flightData/getArrivingFlights/${id}`
            : `http://localhost:5001/flightData/getDepartingFlights/${id}`;

        axios.get(url)
            .then((response) => {
                console.log(`Fetched ${flightType} flights:`, response.data);

                // Filter out flights with null or 0 parkingArea
                const filteredFlights = response.data.filter(flight => flight.parkingArea !== null && flight.parkingArea > 0);

                // Format the date and time of the flights 
                const sortedFlights = filteredFlights.sort((a, b) => new Date(a[flightType === 'arriving' ? 'eta' : 'etd']) - new Date(b[flightType === 'arriving' ? 'eta' : 'etd']));
                setFlights(sortedFlights);
            })
            .catch((err) => {
                setError(`Error fetching ${flightType} flights`);
                console.error(`Error fetching ${flightType} flights:`, err);
            });
    }, [id, flightType]);

    // Fetch arriving or departing flights when component mounts
    useEffect(() => {
        fetchFlights();

        // Refresh every interval of time
        const interval = setInterval(fetchFlights, timeInterval);

        return () => clearInterval(interval);
    }, [fetchFlights]);

    // Format the date to a more readable format
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return dateStr ? date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', timeZone: timeZoneAbbr}) : "N/A";
    };

    // Format the time to a more readable format
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return dateStr ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timeZoneAbbr }) : "";
    };

    // Key for the date and time wording based on the flightType
    const dateTimeKey = flightType === 'arriving' ? 'eta' : 'etd';

    return (
        <div className='table-container'>
            <table>
                {/* Title based on flight type */}
                <caption>{flightType === 'arriving' ? 'Arriving Flights' : 'Departing Flights'}</caption>
                <thead>
                    <tr>
                        <th>Tail #</th>
                        <th>Type</th>
                        <th>Area (ft²)</th>
                        <th>Size</th>
                        <th>{flightType === 'arriving' ? 'Arrival' : 'Departure'} Date/Time</th>
                    </tr>
                </thead>

                <tbody className='flight-table-container'>
                    {flights.map((flight, index) => (
                        <tr key={index}>
                            <td>{flight.acid}</td>
                            <td>{flight.plane_type ? flight.plane_type : 'N/A'}</td>
                            <td>{flight.parkingArea ? Math.round(flight.parkingArea) : 'N/A'}</td>
                            <td>{flight.size ? flight.size : 'N/A'}</td>
                            <td>
                                <span className="date">{formatDate(flight[dateTimeKey])}</span>
                                <br/>
                                <span className="time">{formatTime(flight[dateTimeKey])}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default FlightTable;
