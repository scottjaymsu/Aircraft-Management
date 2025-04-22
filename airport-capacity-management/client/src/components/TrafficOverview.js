import React, { useState, useEffect } from "react";
import axios from "axios";
import { toZonedTime } from 'date-fns-tz';
import { addHours } from 'date-fns';
import {
    ReferenceLine,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

import "../styles/TrafficOverview.css";
import "../styles/colors.css";


// Round down the minutes and seconds of a date to the start of the hour
const roundDownHour = (date) => {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
};

// Add hours to a date
//const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
// Generate a timeline (array of hourly Date objects) between start and end
const generateTimeline = (start, end) => {
    const timeline = [];
    let current = new Date(start);
    while (current <= end) {
        timeline.push(new Date(current));
        current = addHours(current, 1);
    }
    return timeline;
};

// Filter flights that fall between start and end
const filterFlightsByRange = (flights, dateKey, start, end) => {
    return flights.filter((flight) => {
        if (!flight[dateKey]) return false;
        const flightDate = new Date(flight[dateKey]);
        return flightDate >= start && flightDate <= end;
    });
};

// Get the effective time (rounded down) for a flight, put into local timezone
// For departures, use the logged time; for arrivals, add 1 hour
const getEffectiveTime = (flight, key, isArrival = false, timeZoneAbbr) => {
    
    const date = new Date(flight[key]);
    const localDate = toZonedTime(date, timeZoneAbbr);
    const effective = isArrival ? addHours(localDate, 1) : localDate;
    return roundDownHour(effective).toISOString();
};

const getChartArrivalTime = (flight, timeZoneAbbr) => {
    const date = new Date(flight.eta);
    const localDate = toZonedTime(date, timeZoneAbbr);
    return roundDownHour(localDate).toISOString();
};

// Add up all planes
const getTotalPlanes = (arrivingFlights, departingFlights, maintenancePlanes, parkedPlanes) => {
    const totalArriving = arrivingFlights.length;
    const totalDeparting = departingFlights.length;
    const totalMaintenance = maintenancePlanes.length;
    const totalParked = parkedPlanes.length;

    return totalArriving + totalDeparting + totalMaintenance + totalParked;
}

/**
 * Component to display traffic information in a graph
 * x-axis displays time intervals
 * y-axis displays quantitative information for
 * departing/arriving flights, planes in maintenance, and
 * parked aircrafts
 * @param id - faa designator of airport that
 * flights are departing from
 * @returns component
 */
export default function TrafficOverview({ id }) {
    // The day selection offset in days relative to today - 0 = today
    const [dayOffset, setDayOffset] = useState(0);
    const [departingFlights, setDepartingFlights] = useState([]);
    const [arrivingFlights, setArrivingFlights] = useState([]);
    const [maintenancePlanes, setMaintenancePlanes] = useState([]);
    const [parkedPlanes, setParkedPlanes] = useState([]);
    const [error, setError] = useState("");
    const [capacityLimit, setCapacityLimit] = useState(0);
    const [showLegend, setShowLegend] = useState(false);
    const [timeZoneAbbr, setTimeZoneAbbr] = useState('UTC');

    

    // Calculate the currently selected date
    const selectedDate = new Date();
    selectedDate.setDate(selectedDate.getDate() + dayOffset);

    // Toggle legend visibility
    const toggleLegend = () => {
        setShowLegend(prev => !prev);
    };

    // Fetch departing flights by faa designator when component mounts
    useEffect(() => {
        // Fetch departing flights by airport
        axios
            .get(`http://localhost:5001/flightData/getDepartingFlights/${id}`)
            .then((response) => {
                setDepartingFlights(response.data);
                console.log("Departing flights:", response.data);
            })
            .catch((err) => {
                setError(err);
                console.error("Error fetching departing flights:", error);
            });
    }, [id]);

    useEffect(() => {
        const fetchTimeZone = async () => {
            try {
                const response = await axios.get(`http://localhost:5001/airportData/getCurrentTime/${id}`);
                if (response.data && response.data.timeZone) {
                    setTimeZoneAbbr(response.data.timeZone);
                }
            } catch (error) {
                console.error('Error fetching time zone:', error);
            }
        };
        fetchTimeZone();
    }, [id]);

    // Fetch arriving flights by faa designator when component mounts
    useEffect(() => {
        // Fetch arriving flights by airport
        axios
            .get(`http://localhost:5001/flightData/getArrivingFlights/${id}`)
            .then((response) => {
                setArrivingFlights(response.data);
                console.log("Arriving flights:", response.data);
            })
            .catch((err) => {
                setError(err);
                console.error("Error fetching arriving flights:", error);
            });
    }, [id]);

    // Fetch airport capacity limit
    useEffect(() => {
        axios
            .get(`http://localhost:5001/airportData/getOverallCapacity/${id}`)
            .then((response) => {
                console.log("Airport capacity limit:", response.data);
                setCapacityLimit(response.data.totalCapacity);
            })
            .catch((err) => {
                setError(err);
                console.error("Error fetching airport capacity limit:", error);
            });
    }, [id]);

    // Fetch parked planes by faa designator when component mounts
    useEffect(() => {
        // Fetch parked planes by airport
        axios
            .get(`http://localhost:5001/airportData/getParkedPlanes/${id}`)
            .then((response) => {
                setParkedPlanes(response.data);
                console.log("Parked planes:", response.data);
            })
            .catch((err) => {
                setError(err);
                console.error("Error fetching parked planes:", error);
            });
    }, [id]);

    // Fetch maintenance planes by faa designator when component mounts
    useEffect(() => {
        axios
            .get(`http://localhost:5001/flightData/getMaintenancePlanes/${id}`)
            .then((response) => {
                setMaintenancePlanes(response.data);
            })
            .catch((err) => {
                setError(err);
                console.error("Error fetching maintenance planes:", error);
            });
    }, [id]);


    // --- Navigation Handlers ---
    const handlePrev = () => {
        if (dayOffset > -1) {
            setDayOffset((prev) => prev - 1);
        }
    };
    const handleNext = () => {
        if (dayOffset < 1) {
            setDayOffset((prev) => prev + 1);
        }
    };
    const handleToday = () => {
        setDayOffset(0);
    };

    // --- Simulation Setup ---
    // Define start and end of the selected day
    const startOfSelectedDay = new Date(selectedDate);
    startOfSelectedDay.setHours(0, 0, 0, 0);
    const endOfSelectedDay = new Date(selectedDate);
    endOfSelectedDay.setHours(24, 0, 0, 0);

    // Use current time (rounded down) as the baseline
    const baselineTime = roundDownHour(new Date());
    const baselineParkedCount = parkedPlanes.length; // current parked count at time of load

    // To simulate accurately for the selected day, simulation range covers both the baseline and the full day
    const simulationStart =
        baselineTime < startOfSelectedDay ? baselineTime : startOfSelectedDay;
    const simulationEnd =
        baselineTime > endOfSelectedDay ? baselineTime : endOfSelectedDay;

    // Generate a timeline for the simulation range (hourly intervals)
    const timeline = generateTimeline(simulationStart, simulationEnd);

    // --- Compute Effective Adjustments ---
    // Initialize objects to hold effective departures and arrivals for each time slot
    // in the timeline. Each key is an ISO string of the time, and the value is the count.
    const effectiveDepartures = {};
    const effectiveArrivals = {}; // used for parked adjustments (delayed by 1 hour)
    const chartArrivals = {}; // used for chart display (actual arrival time)

    timeline.forEach((time) => {
        const iso = time.toISOString();

        effectiveDepartures[iso] = 0;
        effectiveArrivals[iso] = 0;
        chartArrivals[iso] = 0;
    });

    // Get all departures and arrivals within the simulation range.
    const simDepartures = filterFlightsByRange(
        departingFlights,
        "etd",
        simulationStart,
        simulationEnd
    );
    const simArrivals = filterFlightsByRange(
        arrivingFlights,
        "eta",
        simulationStart,
        simulationEnd
    );

    // Group departures and arrivals into our timeline buckets
    simDepartures.forEach((flight) => {
        const timeStr = getEffectiveTime(flight, "etd", false, timeZoneAbbr);
        if (effectiveDepartures[timeStr] !== undefined) {
            effectiveDepartures[timeStr] += 1;
        }
    });

    // FOR PARKED ADJUSTMENTS: Group arrivals into our timeline buckets
    simArrivals.forEach((flight) => {
        const timeStr = getEffectiveTime(flight, "eta", true, timeZoneAbbr);
        if (effectiveArrivals[timeStr] !== undefined) {
            effectiveArrivals[timeStr] += 1;
        }
    });

    // For chart "Arriving" count, use the actual arrival time (no delay)
    simArrivals.forEach((flight) => {
        const chartTimeStr = getChartArrivalTime(flight, timeZoneAbbr);
        if (chartArrivals[chartTimeStr] !== undefined) {
            chartArrivals[chartTimeStr] += 1;
        }
    });

    // Now compute adjustments per hour as: (arrivals - departures)
    const adjustments = {};
    timeline.forEach((time) => {
        const iso = time.toISOString();
        adjustments[iso] =
            (effectiveArrivals[iso] || 0) - (effectiveDepartures[iso] || 0);
    });

    // --- Compute Cumulative Parked Count ---
    // Propagate forward and backward along the timeline
    const cumulativeParked = {};
    // Find baseline index in timeline.
    const baselineIndex = timeline.findIndex(
        (time) => time.toISOString() === baselineTime.toISOString()
    );
    // Forward simulation
    let cumulative = baselineParkedCount;
    for (let i = baselineIndex; i < timeline.length; i++) {
        const timeStr = timeline[i].toISOString();
        cumulative += adjustments[timeStr] || 0;
        cumulativeParked[timeStr] = cumulative;
    }
    // Backward simulation
    cumulative = baselineParkedCount;
    for (let i = baselineIndex - 1; i >= 0; i--) {
        const nextTimeStr = timeline[i + 1].toISOString();
        cumulative -= adjustments[nextTimeStr] || 0;
        cumulativeParked[timeline[i].toISOString()] = cumulative;
    }

    // --- Build Chart Data ---
    const chartData = timeline
        .filter((time) => time >= startOfSelectedDay && time <= endOfSelectedDay)
        .map((time) => {
            const iso = time.toISOString();
            let hourLabel;
            if (time.getTime() === endOfSelectedDay.getTime()) {
                hourLabel = "24:00";
            } else {
                hourLabel = time.getHours().toString().padStart(2, "0") + ":00";
            }
            return {
                category: hourLabel,
                Arriving: chartArrivals[iso] || 0,
                Departing: effectiveDepartures[iso] || 0,
                Parked: cumulativeParked[iso] || 0,
            };
        });

    // --- Generate tick labels for the x-axis (every 4 hours) ---
    const tickTimes = timeline
        .filter((time) => time >= startOfSelectedDay && time <= endOfSelectedDay)
        .filter((time) =>
            time.getTime() === endOfSelectedDay.getTime() || time.getHours() % 4 === 0
        )
        .map((time) => {
            if (time.getTime() === endOfSelectedDay.getTime()) {
                return "24:00";
            } else {
                return time.getHours().toString().padStart(2, "0") + ":00";
            }
        });


    // Title: "Today" if current day, otherwise show the date string
    const title = dayOffset === 0 ? "Today" : selectedDate.toDateString();

    // Upper limit of the Y-axis
    const roundedCapacityLimit = Math.round((parkedPlanes.length + 5) / 10) * 10;

    // Render the chart with navigation buttons and title
    return (
        <div>
            {/* Navigation buttons */}
            <div
                style={{
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <button
                    onClick={handlePrev}
                    disabled={dayOffset === -1}
                    className="graph-nav"
                >
                    &lt;
                </button>
                <button onClick={handleToday} className="graph-nav">
                    Today
                </button>
                <button
                    onClick={handleNext}
                    disabled={dayOffset === 1}
                    className="graph-nav"
                >
                    &gt;
                </button>
            </div>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <strong>{title}</strong>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" ticks={tickTimes} />
                    <YAxis domain={[0, roundedCapacityLimit]} />
                    <Tooltip />

                    {/* Add a dotted blue reference line at the capacity limit */}
                    <ReferenceLine
                        y={capacityLimit}
                        stroke="#010F31"
                        strokeDasharray="3 3"
                        label={{
                            value: `Capacity Limit: ${capacityLimit}`,
                            position: "top",
                            fontWeight: "bold",
                            fill: "#010F31",
                        }}
                        strokeWidth={3}
                    />

                    <Area
                        type="monotone"
                        dataKey="Departing"
                        stackId="1"
                        stroke="rgb(228,147,67)"
                        fill="rgb(228,147,67)"
                    />
                    <Area
                        type="monotone"
                        dataKey="Parked"
                        stackId="1"
                        stroke="rgb(133,181,178)"
                        fill="rgb(133,181,178)"
                    />
                    <Area
                        type="monotone"
                        dataKey="Arriving"
                        stackId="1"
                        stroke="rgb(88,120,163)"
                        fill="rgb(88,120,163)"
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <button onClick={toggleLegend} className="graph-nav">
                    {showLegend ? "Hide Legend" : "Show Legend"}
                </button>
            </div>

            {showLegend && (
                <div
                    className="legend"
                    style={{
                        textAlign: "center",
                        marginBottom: "1rem",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                    }}
                >
                    <span style={{ marginRight: "10px", display: "inline-flex", alignItems: "center" }}>
                        <span
                            style={{
                                display: "inline-block",
                                width: "12px",
                                height: "12px",
                                backgroundColor: "rgb(228,147,67)",
                                marginRight: "5px",
                            }}
                        ></span>
                        Departing
                    </span>
                    <span style={{ marginRight: "10px", display: "inline-flex", alignItems: "center" }}>
                        <span
                            style={{
                                display: "inline-block",
                                width: "12px",
                                height: "12px",
                                backgroundColor: "rgb(133,181,178)",
                                marginRight: "5px",
                            }}
                        ></span>
                        Parked
                    </span>
                    <span style={{ marginRight: "10px", display: "inline-flex", alignItems: "center" }}>
                        <span
                            style={{
                                display: "inline-block",
                                width: "12px",
                                height: "12px",
                                backgroundColor: "rgb(88,120,163)",
                                marginRight: "5px",
                            }}
                        ></span>
                        Arriving
                    </span>
                </div>
            )}

        </div>
    );

}

export { 
    roundDownHour, 
    addHours, 
    generateTimeline, 
    filterFlightsByRange, 
    getEffectiveTime, 
    getChartArrivalTime 
  };