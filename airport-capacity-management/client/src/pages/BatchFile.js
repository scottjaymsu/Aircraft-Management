import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/BatchFile.css";
import Table from "../components/Table";
import Modal from "../components/Modal";

function BatchFile() {
  // Track active tab
  const [activeTab, setActiveTab] = useState("Airport");

  // Airport Data
  const [airportData, setAirportData] = useState([]);
  const [existingAirports, setExistingAirports] = useState([]);
  const [airportsLoading, setAirportsLoading] = useState(true);
  const [insertedAirports, setInsertedAirports] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // FBO Data
  const [fboData, setFboData] = useState([]);
  const [existingFBOs, setExistingFBOs] = useState([]);
  const [fboLoading, setFboLoading] = useState(true);
  const [insertedFBOs, setInsertedFBOs] = useState([]);
  const [showFboModal, setShowFboModal] = useState(false);

  // Map for FBO header keys
  // Keys are different than headers in the database
  const fboHeaderKeyMap = {
    "Airport Code": "Airport_Code",
    "FBO Name": "FBO_Name",
    "Total Space": "Total_Space",
    "IATA": "iata_code",
    "Priority": "priority",
    "Coordinates": "coordinates",
    "Parking Space Taken": "Parking_Space_Taken",
    "Area ft2": "Area_ft2",
  };

  // For inserting airport data
  const headers = [
    "IDENT",
    "Name",
    "Latitude",
    "Longitude",
    "Airport Size",
    "Country",
    "IATA",
    "Remove Airport",
  ];

  // For inserting FBO data
  const fboHeaders = [
    "Airport Code",
    "FBO Name",
    "Total Space",
    "IATA",
    "Priority",
    "Coordinates",
    "Parking Space Taken",
    "Area ft2",
    "Remove FBO",
  ];

  const navigate = useNavigate();

  /* This handles the File Upload and parses the data. If the file does not contain seven attributes for every airport, then it will be rejected
  to ensure erroneous data isn't added to the database. */
  const handleAirportFileUpload = (event) => {
    if (event.target.files[0]) {

      //If a user doesn't upload a csv we shouldn't let that go through...
      if (!event.target.files[0].name.endsWith('.csv')) {
        alert("Only CSV files will be accepted.");
        return;
      }

      setAirportData([]);
      setExistingAirports([]);
      setAirportsLoading(true);

      Papa.parse(event.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          /* If the csv file does not have seven columns for each row, it will cause errors in determining specific data. 
          We will prompt the user to correct this error because all of the seven rows will be needed for data insertion anyways. */
          const columnCount = 7;
          const invalidRows = results.data.filter((row) => Object.keys(row).length !== columnCount);
          if (invalidRows.length > 0) {
            setAirportsLoading(false);
            alert("The uploaded CSV contains incorrect data. Please reupload with all columns filled out.");
            return;
          }
          setAirportData(results.data);
          try {
            const response = await axios.post(
              "http://localhost:5001/batch/getExistingAirports",
              results.data
            );
            if (response.status === 200) {
              setExistingAirports(response.data);
              setAirportsLoading(false);
            }
          } catch (error) {
            console.error("Error sending data to the backend:", error);
          }
        },
      });
    }
  };

  // Handle FBO CSV upload
  const handleFBOFileUpload = (event) => {
    if (event.target.files[0]) {

      //If a user doesn't upload a csv we shouldn't let that go through...
      if (!event.target.files[0].name.endsWith('.csv')) {
        alert("Only CSV files will be accepted.");
        return;
      }

      setFboData([]);
      setExistingFBOs([]);
      setFboLoading(true);

      Papa.parse(event.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
           /* If the csv file does not have seven columns for each row, it will cause errors in determining specific data. 
          We will prompt the user to correct this error because all of the seven rows will be needed for data insertion anyways. */
          const columnCount = 8;
          const invalidRows = results.data.filter((row) => Object.keys(row).length !== columnCount);
          if (invalidRows.length > 0) {
            setFboLoading(false);
            alert("The uploaded CSV contains incorrect data. Please reupload with all columns filled out.");
            return;
          }
          setFboData(results.data);
          try {
            const response = await axios.post(
              "http://localhost:5001/batch/getExistingFBOs",
              results.data
            );
            if (response.status === 200) {
              setExistingFBOs(response.data);
              setFboLoading(false);
            }
          } catch (error) {
            console.error("Error sending data to the backend:", error);
          }
        },
      });
    }
  };

  /* This will upload the airport into the database. If any of the data is invalid for the latitude and longitude*/
  const handleAirportParse = async () => {
    const validAirportData = airportData.filter((airport) => {
      const latitude = airport["latitude_deg"];
      const longitude = airport["longitude_deg"];
      const airport_size = airport["airport_size"];

      const validAirportSizes = ["large_airport", "medium_airport", "small_airport"];
      const invalidAirportSize = !validAirportSizes.includes(airport_size);

      const latlongInvalid =
        !latitude ||
        parseFloat(latitude) < -90 ||
        parseFloat(latitude) > 90 ||
        !longitude ||
        parseFloat(longitude) < -180 ||
        parseFloat(longitude) > 180;

      return !(latlongInvalid || invalidAirportSize);
    });

    try {
      const response = await axios.post(
        "http://localhost:5001/batch/insertAirport",
        validAirportData
      );
      if (response.status === 200) {
        setInsertedAirports(response.data.insertedAirports);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error sending data to the backend:", error);
    }
  };

  // Insert or update FBO data in DB
  const handleFBOParse = async () => {
    const validFBOData = fboData.filter((fbo) => {
      const fboName = fbo["FBO_Name"];
      const totalSpace = fbo["Total_Space"];
      const priority = fbo["priority"];
      const coordinates = fbo["coordinates"];

      const fboNameInvalid = !fboName || fboName.length === 0;
      const totalSpaceInvalid = !totalSpace || isNaN(totalSpace);
      const priorityInvalid = !priority || isNaN(priority);
      const coordinatesInvalid =
        coordinates && !coordinates.startsWith("POLYGON");

      return !(
        fboNameInvalid ||
        totalSpaceInvalid ||
        priorityInvalid ||
        coordinatesInvalid
      );
    });

    if (validFBOData.length === 0) {
      alert("No valid FBO data to insert.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5001/batch/insertFBO",
        validFBOData
      );
      if (response.status === 200) {
        setInsertedFBOs(response.data.insertedFBOs);
        setShowFboModal(true);
      }
    } catch (error) {
      console.error("Error sending data to the backend:", error);
    }
  };

  // Deletion from the Airport table
  const handleDeletion = (index) => {
    const updatedData = [...airportData];
    updatedData.splice(index, 1);
    setAirportData(updatedData);
  };

  // Deletion from the FBO table
  const handleFboDeletion = (index) => {
    const updatedData = [...fboData];
    updatedData.splice(index, 1);
    setFboData(updatedData);
  };

  // Format rows for Airport table
  const getFormattedRows = () => {
    return airportData.map((airport, index) => {
      const values = Object.values(airport);
      values.push(
        <button className="delete" onClick={() => handleDeletion(index)}>
          Delete
        </button>
      );
      return values;
    });
  };
  const getFormattedFBORows = () => {
    return fboData.map((fbo, index) => {
      const rowValues = fboHeaders.slice(0, -1).map((header) => {
        const key = fboHeaderKeyMap[header];
        let val = fbo[key];
  
        if (header === "Coordinates" && typeof val === "string") {
          val = (
            <div
              style={{
                maxWidth: "300px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                fontSize: "0.85em",
                fontFamily: "monospace",
              }}
            >
              {val}
            </div>
          );
        }
  
        return val || "—";
      });
  
      rowValues.push(
        <button className="delete" onClick={() => handleFboDeletion(index)}>
          Delete
        </button>
      );
      return rowValues;
    });
  };
  

  /* The way we set up our table, we can pass props to the rows to color them a certain way. Since we want to let users know
  if the data they uploaded will accurately get added, the best way to do this is to color ways and allow users to hover over the rows
  to determine if their data is correct. */
  const getRowProps = (row) => {
    const ident = row[0];
    const isExisting = existingAirports.some((a) => a.ident === ident);
    const airport_size = row[4];
    const validAirportSizes = ["large_airport", "medium_airport", "small_airport"];
    const invalidAirportSize = !validAirportSizes.includes(airport_size);

    /* Let the user know each reason as to why the airport may not be valid OR if it already exists. */
    let title = "";
    if (isExisting) {
      title +=
        "CAUTION: Airport already exists in the database. This will update existing data.";
    }
    if (invalidAirportSize) {
      title += "Invalid Airport Size (Valid options: small_airport, medium_airport, large_airport)"
    }

    /* Color the row based on if there is an issue (red means it can't be inserted, yellow means it will overwrite current data) */
    return {
      style: invalidAirportSize
        ? { backgroundColor: "rgb(239 181 181)" }
        : isExisting
          ? { backgroundColor: "#efd092" }
          : {},
      title: title.trim(),
    };
  };

  // Row styling for FBOs
  const getFboRowProps = (row) => {
    const airportCode = row[0];
    const fboName = row[1];
    const airportFbos = existingFBOs[airportCode] || [];
    const isExisting = airportFbos.includes(fboName);
    const fboNameInvalid = !fboName || fboName.length === 0;
    const totalSpace = row[2];
    const priority = row[4];
    const totalSpaceInvalid = !totalSpace || isNaN(totalSpace);
    const priorityInvalid = !priority || isNaN(priority);

    let title = "";

    if (fboNameInvalid) {
      title += "Invalid FBO Name.\n";
    }
    if (isExisting) {
      title +=
        "CAUTION: FBO already exists in the database. This will update existing data.";
    }
    if (totalSpaceInvalid) {
      title += "Invalid Total Space (must be a number).\n";
    }
    if (priorityInvalid) {
      title += "Invalid Priority (must be a number).\n";
    }


    return {
      style:
        fboNameInvalid
          ? { backgroundColor: "rgb(239 181 181)" }
          : isExisting
            ? { backgroundColor: "#efd092" }
            : {},
      title: title.trim(),
    };
  };

  return (
    <div className="batch-container">
      <div className="top-bar-header">
        {/* Top bar with back arrow */}
        <div className="top-bar">
          <img
            src="/back-arrow.png"
            alt="Back Arrow"
            className="back-arrow"
            onClick={() => navigate(-1)}
          />
          <div className="title-section">
            <div className="batch-title">Batch File Upload</div>
            <div className="batch-subtitle">
            Upload a CSV/Batch File containing {activeTab} data, then click "Add All {activeTab}s" to save them.
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-button left ${activeTab === "Airport" ? "active" : ""}`}
            onClick={() => setActiveTab("Airport")}
          >
            Airport Data Upload
          </button>
          <button
            className={`tab-button right ${activeTab === "FBO" ? "active" : ""}`}
            onClick={() => setActiveTab("FBO")}
          >
            FBO Data Upload
          </button>
        </div>
      </div>

      {/* AIRPORT TAB CONTENT */}
      {activeTab === "Airport" && (
        <div className="upload-box">
          {/* Top row with left-aligned "Download/Choose" and right-aligned "Add All" */}
          <div className="top-row">
            <div className="left-buttons">
              <label
                htmlFor="exampleAirportFile"
                className="upload-button example-button"
              >
                <a
                  href="/example_airport_batch.csv"
                  download="example_airport_batch.csv"
                >
                  Download Example
                </a>
              </label>

              <label htmlFor="airportFile" className="upload-button">
                Choose File
              </label>
              <input
                type="file"
                accept=".csv"
                id="airportFile"
                style={{ display: "none" }}
                onChange={handleAirportFileUpload}
              />
            </div>

            <button className="parse-button" onClick={handleAirportParse}>
              Add All Airports
            </button>
          </div>

          {/* Table below the row */}
          <div className="table-container-box">
            {!airportsLoading ? (
              <Table
                headers={headers}
                rows={getFormattedRows()}
                title="Airports in the Uploaded File"
                className="airport-table"
                getRowProps={getRowProps}
              />
            ) : (
              <Table
                headers={headers}
                rows={[["Please upload a batch file for data insertion"]]}
                title="Airports in the Uploaded File"
                className="airport-table"
              />
            )}
          </div>

          {/* Modal for Airport insertion */}
          {showModal && (
            <Modal
              title="Insertion Successful"
              message={
                <>
                  <p>Inserted/Updated Airports: {insertedAirports.join(", ")}</p>
                  <button
                    onClick={() => navigate("/")}
                    style={{ marginTop: "10px", cursor: "pointer" }}
                  >
                    Go to Homepage
                  </button>
                </>
              }
            />
          )}
        </div>
      )}

      {/* FBO TAB CONTENT */}
      {activeTab === "FBO" && (
        <div className="upload-box">
          {/* Top row with left-aligned "Download/Choose" and right-aligned "Add All" */}
          <div className="top-row">
            <div className="left-buttons">
              <label htmlFor="exampleFboFile" className="upload-button">
                <a href="/example_fbo_batch.csv" download="example_fbo_batch.csv">
                  Download Example
                </a>
              </label>

              <label htmlFor="fboFile" className="upload-button">
                Choose File
              </label>
              <input
                type="file"
                accept=".csv"
                id="fboFile"
                style={{ display: "none" }}
                onChange={handleFBOFileUpload}
              />
            </div>

            <button className="parse-button" onClick={handleFBOParse}>
              Add All FBOs
            </button>
          </div>

          {/* Table below the row */}
          <div className="table-container-box">
            {!fboLoading ? (
              <Table
                headers={fboHeaders}
                rows={getFormattedFBORows()}
                title="FBOs in the Uploaded File"
                className="airport-table"
                getRowProps={getFboRowProps}
              />
            ) : (
              <Table
                headers={fboHeaders}
                rows={[["Please upload a batch file for data insertion"]]}
                title="FBOs in the Uploaded File"
                className="airport-table"
              />
            )}
          </div>

          {/* Modal for FBO insertion */}
          {showFboModal && (
            <Modal
              title="Insertion Successful"
              message={
                <>
                  <p>Inserted/Updated FBOs: {insertedFBOs.join(", ")}</p>
                  <button
                    onClick={() => navigate("/")}
                    style={{ marginTop: "10px", cursor: "pointer" }}
                  >
                    Go to Homepage
                  </button>
                </>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

export default BatchFile;
