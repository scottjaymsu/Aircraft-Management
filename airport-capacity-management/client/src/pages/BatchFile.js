import React, { useState } from 'react';
import Papa from "papaparse";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import '../styles/BatchFile.css'
import Table from '../components/Table';
import Modal from '../components/Modal';

function BatchFile() {
  const [airportData, setAirportData] = useState([]);
  const [existingAirports, setExistingAirports] = useState([]);
  const [airportsLoading, setAirportsLoading] = useState(true);
  const [insertedAirports, setInsertedAirports] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const headers = ["IDENT", "Name", "Latitude", "Longitude", "Airport Size", "IATA", "Remove Airport"]

  const navigate = useNavigate();

  // When a user submits the csv file, it will set all the useState data to what it needs to be, and it also makes a request to get all the airports
  // that already exist with ident's that were in the user's file. We need to make it clear if data of that airport already exists so they can delete it
  // if it's not necessary
  const handleAirportFileUpload = (event) => {
    if (event.target.files[0]) {
      setAirportData([]);
      setExistingAirports([]);
      setAirportsLoading(true);

      Papa.parse(event.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async function (results) {
          setAirportData(results.data);
          try {
            const response = await axios.post('http://localhost:5001/batch/getExistingAirports', results.data);
            
            if (response.status === 200) {
              setExistingAirports(response.data);
              setAirportsLoading(false);
            }
          } catch (error) {
            console.error('Error sending data to the backend:', error);
          }
        },
      }
    )
  }};

    //When a user actually presses the submit button, it will insert (or update) the airports in the database that were specified in the csv file
    // Currently, this opens a modal that prompts the user to return to the homepage after showing them what airports were inserted. May get more specific with it later on
    const handleAirportParse = async () => {
      const validAirportData = airportData.filter((airport) => {
        const ident = airport["ident"];
        const latitude = airport["latitude_deg"];
        const longitude = airport["longitude_deg"];
        const iata = airport["iata_code"];

        const identInvalid = !ident || ident.length !== 4 || ident[0] !== 'K' || !latitude || !Number.isFinite(parseFloat(latitude));
        const latlongInvalid = !latitude || !Number.isFinite(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90 || !longitude || !Number.isFinite(parseFloat(longitude)) || parseFloat(longitude) > 180 || parseFloat(longitude) < -180;
        const iataInvalid = !iata || iata.length !== 3;

        return !(identInvalid || latlongInvalid || iataInvalid);
      })
      try {
        console.log(validAirportData);
        const response = await axios.post('http://localhost:5001/batch/insertAirport', validAirportData);
        if (response.status === 200) {
          setInsertedAirports(response.data.insertedAirports);
          setShowModal(true);
        }
      } catch (error) {
        console.error('Error sending data to the backend:', error);
      }
    };

    //When a user clicks the delete button in the table, it will remove the airport from the list of airport data and regenerate the table
    const handleDeletion = (index) => {
      const updatedData = [...airportData];
      updatedData.splice(index, 1);
      setAirportData(updatedData);
    };

    //Formats the values of the current airport data, and adds the delete button functionality (maybe a better way to add the delete button idk?)
    const getFormattedRows = () => {
      return airportData.map((airport, index) => {
        const values = Object.values(airport);
        values.push(<button className="delete" onClick={() => handleDeletion(index)}>Delete</button>);
        return values;
      });
    };

    //Colors the row based on attributes (red if it will not be inserted, yellow if it will overwrite) and generates a hover title to inform users about
    const getRowProps = (row) => {
      const ident = row[0];
      const latitude = row[2];
      const longitude = row[3];
      const iata = row[7];
      const isExisting = existingAirports.some(existing => existing.ident === ident);

      const identInvalid = !ident || ident.length !== 4 || ident[0] !== 'K' || !latitude || !Number.isFinite(parseFloat(latitude));
      const latlongInvalid = !latitude || !Number.isFinite(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90 || !longitude || !Number.isFinite(parseFloat(longitude)) || parseFloat(longitude) > 180 || parseFloat(longitude) < -180;

      let title = '';
      if (identInvalid) {
        title += "Invalid IDENT (Should be four characters beginning with a K)\n"
      }
      if (latlongInvalid) {
        title += "Invalid Latitude or Longitude. (Must be a number between -90 and 90).\n"
      }
      if (isExisting) {
        title += "CAUTION: Airport already exists in the database. Any data uploaded through this csv will update the current data."
      }
      return {
        style: (identInvalid || latlongInvalid) ? { backgroundColor: 'rgb(239 181 181)' } : isExisting ? { backgroundColor: '#efd092' } : {},
        title: title.trim()
      };
    };



  return (
    <div className="batch_container">
      <h1>Airport Data Upload</h1>
      
      {/* The button that users click to upload their csv file batch data */}
      <label htmlFor="airportFile" className="upload-button">Choose File</label>
      <input 
        type="file" 
        accept=".csv" 
        id="airportFile"
        style={{ display: 'none'}}
        onChange={handleAirportFileUpload} 
      />
      {/* The button that users click to download an example csv file */}
      <label htmlFor="exampleFile" className="upload-button">
        <a href="/example_airport_batch.csv" download="example_airport_batch.csv">Download Example File</a>
      </label>

      {/* Generates the table of airport data from user csv file (if user hasn't uploaded yet it will just show a placeholder message to prompt them ) */}
      {!airportsLoading ? ( <Table
        headers={headers}
        rows={getFormattedRows()}
        title="Airports in the Uploaded File"
        className="airport-table"
        getRowProps={getRowProps}
      />) : (
        <Table
        headers={headers}
        rows={[["Please upload a batch file for data insertion"]]}
        title="Airports in the Uploaded File"
        className="airport-table"
      />
      )}

      {/* Modal that populates once the user submits all the airport data to the database (forces them to return home) */}
      {showModal && (
          <Modal 
            title="Insertion Successful" 
            message={<>
              <p>Inserted/Updated Airports: {insertedAirports.join(', ')}</p>
              <button onClick={() => navigate('/')} style={{ marginTop: '10px', cursor: 'pointer' }}>Go to Homepage</button>
              </>} 
          />
        )}
      
      {/* Button for users to click when they want to insert into datbase */}
      <button className="parse-button" onClick={handleAirportParse}>
          Add All Airports
      </button>

    </div>
  );}

export default BatchFile;
