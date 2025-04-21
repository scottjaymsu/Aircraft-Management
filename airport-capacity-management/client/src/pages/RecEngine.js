import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Table from '../components/Table.js';
import '../styles/RecEngine.css'
// TODO I dont think we actually use this page might me able to be deleted 
function RecEngine() {
  const { iata_code } = useParams();
  const [airportInformation, setAirportInformation] = useState(null);
  const [departingFlights, setDepartingFlights] = useState([]);
  const [currentPlanes, setCurrentPlanes] = useState([[]]);
  const [allCurrentPlanes, setAllCurrentPlanes] = useState([[]])
  const [selectedSimulationPlane, setSelectedSimulationPlane] = useState(null);
  const [selectedPlaneInformation, setSelectedPlaneInformation] = useState(null);
  const [selectedFBO, setSelectedFBO] = useState(null);
  const [selectedFBOInformation, setSelectedFBOInformation] = useState(null);

  // I tried making this a useRef and no matter what it gave me errors? I should follow-up, but for now i'm making these useStates TODO
  const [allPlanes, setAllPlanes] = useState([]);
  const [airportFBOs, setAirportFBOs] = useState([]);
  
  // Initial loading of the needed elements when the scren first renders, am I supposed to structure it as just one full useEffect? TODO
  useEffect(() => {
    const getAirportInformation = async() => {
      try {
        const response = await axios.get(`http://localhost:5001/rec/getAirportInformation/${iata_code}`);
        setAirportInformation(response.data[0]);
      } catch (error) {
        console.error("Error fetching tthe FBOs at this airport: ", error);
      }
    }
    const getDepartingFlights = async () => {
        try {
            const response = await axios.get(`http://localhost:5001/rec/upcomingDepartingFlights/${iata_code}/NetJets`);
            setDepartingFlights(response.data);
        } catch (error) {
            console.error("Error fetching departing flights: ", error);
        }
    };
    //Is it better to split these up into two api requests or store them all in one object and sort them when using? TODO
    const getPlanesAtAirport = async () => {
        try {
            const response = await axios.get(`http://localhost:5001/rec/getPlanesAtAirport/${iata_code}/NetJets`);
            setCurrentPlanes(response.data);
        } catch (error) {
            console.error("Error fetching departing flights: ", error);
        }
        try {
          const response = await axios.get(`http://localhost:5001/rec/getPlanesAtAirport/${iata_code}`);
          setAllCurrentPlanes(response.data);
          console.log(response.data);
      } catch (error) {
          console.error("Error fetching departing flights: ", error);
      }
    };
    const getAllPlanes = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/rec/getAllPlanes`);
        setAllPlanes(response.data);
      } catch (error) {
        console.error("error fetching all planes in netjets fleet");
      }
    }
    const getAirportFBOs = async() => {
      try {
        const response = await axios.get(`http://localhost:5001/rec/getAirportFBOs/${iata_code}`);
        setAirportFBOs(response.data);
      } catch (error) {
        console.error("Error fetching tthe FBOs at this airport: ", error);
      }
    }
    getAirportInformation();
    getDepartingFlights();
    getPlanesAtAirport();
    getAllPlanes();
    getAirportFBOs();
  }, [iata_code]);

  //I guess you can't store objects as values in HTML select elements, so I stored the tail number and in here make a request
  //To get detailed information about the plane based on it's tail number (runs when a user selects a new plane to view)
  useEffect(() => {
    const getPlaneInformation = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/rec/getPlaneInformation/${selectedSimulationPlane}`);
        setSelectedPlaneInformation(response.data[0]);
      } catch (error) {
        console.error("error fetching all planes in netjets fleet");
      }
    }
    getPlaneInformation();
  }, [selectedSimulationPlane]);

  //Do we need two useStates, one for the selected FBO and one for the selected FBO Information? === TODO
  useEffect(() => {
    const getFBOInformation = async () => {
      try {
        console.log(selectedFBO);
        const response = await axios.get(`http://localhost:5001/rec/getFBOInformation/${selectedFBO}`);
        setSelectedFBOInformation(response.data[0]);
      } catch (error) {
        console.error("error fetching all planes in netjets fleet");
      }
    }
    getFBOInformation();
  }, [selectedFBO]);

  //select functions for when users select on one fo the drodpwons
  const selectPlane = (event) => {
    setSelectedSimulationPlane(event.target.value);
  }
  const selectFBO = (event) => {
    setSelectedFBO(event.target.value);
  }

  return (
    <div className="rec-engine">

      {/* Page Header - Information related to the airport */}
      {airportInformation && (
        <div className="airport-info">
          <h1>{iata_code}</h1>
          <p className="airport-name">{airportInformation.name}</p>
          <p className="airport-municipality">{airportInformation.municipality}</p>
        </div>
      )}
      <div className="information-container">
        <div className="capacity-container">
        {/* Airport Capacity Information, conditionall color based on capaicty status */}
        {airportInformation && (
          <div className="capacity-info"
          style={{
            background: airportInformation.capacity > allCurrentPlanes.length ? "#B69C68" :
                        airportInformation.capacity < allCurrentPlanes.length ? "#EA8A95" : "#B2AEB0"              
          }}> 
          <p className="capacity-title">{airportInformation.name} Capacity</p>
            <p className="capacity-total">Capacity: {airportInformation.capacity}</p>
            <p className="capacity-load">Current Load: {allCurrentPlanes.length}</p>
          </div>
        )}

        {/* FBO Capacity Information, conditionall color based on capaicty status; If no FBO is selected it will state that */}
        {selectedFBOInformation && (
          <div className="capacity-info"
          style={{
            background: selectedFBOInformation.capacity > currentPlanes.length ? "#B69C68" :
                        selectedFBOInformation.capacity < currentPlanes.length ? "#EA8A95" : "#B2AEB0"              
          }}>
            <p className="capacity-title">{selectedFBOInformation.name} Capacity</p>
            <p className="capacity-total">Capacity: {selectedFBOInformation.capacity}</p>
            <p className="capacity-load">Current Load: {currentPlanes.length}</p>
          </div>
        )}
        {!selectedFBOInformation && (
          <div className="capacity-info"
          style={{
            background: "#B2AEB0"              
          }}>
            <p className="capacity-title">No FBO Selected</p>
          </div>
        )}
      </div>
      <div className="selection-container">
        {/* Tail Number Selection */}
        <div className="selection-button">
          <label>Select a Plane: </label>
          <select
          onChange={selectPlane}
          value={selectedSimulationPlane}
          className="select">
            <option value="">Select a plane</option>
            {allPlanes.map((plane, index) => (
              <option key={index} value={plane.tail_number}>
                {plane.tail_number} - {plane.ICAO_code}
              </option>
            ))}
          </select>
        </div>
      
        
        {/* FBO selection.. not sure where this is affecting our screen yet but it exists */}
        <div className="selection-button">
          <label>Select an FBO: </label>
          <select
          onChange={selectFBO}
          value={selectedFBO}
          className="select">
            <option value="">Select an FBO</option>
            {airportFBOs.map((fbo, index) => (
              <option key={index} value={fbo.id}>
                {fbo.operator}
              </option>
            ))}
          </select>
        </div>
        </div>

        {/* Updating information about plane with new selection (only renders when a selection has been made or else i get an error) */}
        {selectedPlaneInformation && (
          <div className="plane-info-container">
            <p className="top-left">{selectedPlaneInformation.type_name}</p>
            <p className="top-right">Sort Measure: {selectedPlaneInformation.sort_measure}</p>
            <p className="bottom-left">Cabin Size: {selectedPlaneInformation.cabin_size}</p>
            <p classname="bottom-right">Tail Number: {selectedPlaneInformation.tail_number}</p>
          </div>
        )}
      </div>


      {/* Table of current Planes at the Airport [mock data atm] */}
      <div className="airplane-table">
        <Table headers={Object.keys(currentPlanes[0])}  rows={currentPlanes.map((plane) => [plane.tail_number, plane.ICAO_code, plane.status, plane.departure_standardized_time])} title="Airplanes at Airport"
          className="airplane-table-style"/>
      </div>
      
      {/* List of all Departing Flights for the current day */}
      <h3>Departing Flights</h3>
      {departingFlights.length > 0 ? (
        <ul>
          {departingFlights.map((flight, index) => (
            <li key={index}>
              {flight.flight_id} - {flight.arrival_iata} at {flight.departure_time}
            </li>
          ))}
        </ul>
      ) : (
        <p>No departing flights available.</p>
      )}

    </div>
  );
}

export default RecEngine;
