import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/BatchFile.css";
import Table from "../components/Table";
import Modal from "../components/Modal";

function BatchFile() {
  // Track active tab
  const [activeTab, setActiveTab] = useState("airport");

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

  // For inserting airport data
  const headers = [
    "IDENT",
    "Name",
    "Latitude",
    "Longitude",
    "Airport Size",
    "Country",
    "Region",
    "Municipality",
    "IATA",
    "Remove Airport",
  ];

  // For inserting FBO data
  const fboHeaders = [
    "Airport Code",
    "FBO_Name",
    "Total Space",
    "IATA",
    "Priority",
    "Coordinates",
    "Parking_Space_Taken",
    "Area_ft2",
  ];

  const navigate = useNavigate();

  // Handle Airport CSV upload
  const handleAirportFileUpload = (event) => {
    if (event.target.files[0]) {
      setAirportData([]);
      setExistingAirports([]);
      setAirportsLoading(true);

      Papa.parse(event.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
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
      setFboData([]);
      setExistingFBOs([]);
      setFboLoading(true);

      Papa.parse(event.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
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

  // Insert or update Airport data in DB
  const handleAirportParse = async () => {
    const validAirportData = airportData.filter((airport) => {
      const ident = airport["ident"];
      const latitude = airport["latitude_deg"];
      const longitude = airport["longitude_deg"];
      const iata = airport["iata_code"];

      const identInvalid =
        !ident || ident.length !== 4 || ident[0] !== "K" || !latitude;
      const latlongInvalid =
        !latitude ||
        parseFloat(latitude) < -90 ||
        parseFloat(latitude) > 90 ||
        !longitude ||
        parseFloat(longitude) < -180 ||
        parseFloat(longitude) > 180;
      const iataInvalid = !iata || iata.length !== 3;

      return !(identInvalid || latlongInvalid || iataInvalid);
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
      const airportCode = fbo["Airport_Code"];
      const fboName = fbo["FBO_Name"];
      const totalSpace = fbo["Total_Space"];
      const iata = fbo["iata_code"];
      const priority = fbo["priority"];
      const coordinates = fbo["coordinates"];

      const airportCodeInvalid =
        !airportCode || airportCode.length !== 4 || airportCode[0] !== "K";
      const fboNameInvalid = !fboName || fboName.length === 0;
      const totalSpaceInvalid = !totalSpace || isNaN(totalSpace);
      const iataInvalid = !iata || iata.length !== 3;
      const priorityInvalid = !priority || isNaN(priority);
      const coordinatesInvalid =
        coordinates && !coordinates.startsWith("POLYGON");

      return !(
        airportCodeInvalid ||
        fboNameInvalid ||
        totalSpaceInvalid ||
        iataInvalid ||
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

  // Format rows for FBO table
  const getFormattedFBORows = () => {
    return fboData.map((fbo, index) => {
      const values = Object.values(fbo);
      values.push(
        <button className="delete" onClick={() => handleFboDeletion(index)}>
          Delete
        </button>
      );
      return values;
    });
  };

  // Row styling for Airports
  const getRowProps = (row) => {
    const ident = row[0];
    const isExisting = existingAirports.some((a) => a.ident === ident);

    // Simple checks
    const identInvalid = !ident || ident.length !== 4 || ident[0] !== "K";

    let title = "";
    if (identInvalid) {
      title += "Invalid IDENT (Should be four characters beginning with a K)\n";
    }
    if (isExisting) {
      title +=
        "CAUTION: Airport already exists in the database. This will update existing data.";
    }

    return {
      style: identInvalid
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
    const isExisting = existingFBOs.some((f) => f.FBO_Name === fboName);

    const airportCodeInvalid =
      !airportCode || airportCode.length !== 4 || airportCode[0] !== "K";
    const fboNameInvalid = !fboName || fboName.length === 0;

    let title = "";
    if (airportCodeInvalid) {
      title +=
        "Invalid Airport Code (Should be four characters beginning with a K)\n";
    }
    if (fboNameInvalid) {
      title += "Invalid FBO Name.\n";
    }
    if (isExisting) {
      title +=
        "CAUTION: FBO already exists in the database. This will update existing data.";
    }

    return {
      style:
        airportCodeInvalid || fboNameInvalid
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
              Upload CSV/Batch Files to insert or update data.
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "airport" ? "active" : ""}`}
            onClick={() => setActiveTab("airport")}
          >
            Airport Data Upload
          </button>
          <button
            className={`tab-button ${activeTab === "fbo" ? "active" : ""}`}
            onClick={() => setActiveTab("fbo")}
          >
            FBO Data Upload
          </button>
        </div>
      </div>

      {/* AIRPORT TAB CONTENT */}
      {activeTab === "airport" && (
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
                    onClick={() => navigate("/map")}
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
      {activeTab === "fbo" && (
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
                    onClick={() => navigate("/map")}
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
