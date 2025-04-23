import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent } from "./card";
import { getStatusClass } from "../utils/helpers";
import { useNavigate } from "react-router-dom";
import "../styles/SummaryPage.css";

export default function FBOSection({id}) {
  const [FBOList, setFBOList] = useState([]);
  const [isEditingFBO, setIsEditingFBO] = useState(false);
  const [originalPriorities, setOriginalPriorities] = useState([]);
  const navigate = useNavigate();
  const [fboCapacities, setFboCapacities] = useState({});

  useEffect(() => {
    const fetchFboCapacities = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/airportData/getAllFboCapacities/${id}`);
        const data = response.data;

        // Convert array to map { fbo: percentage_occupied }
        const fboMap = {};
        data.forEach(entry => {
          const percentageOccupied = parseFloat(entry.percentage_occupied);
          // round to nearest integer
          fboMap[entry.fbo] = Math.round(percentageOccupied); 
        });

        setFboCapacities(fboMap);
        console.log("FBO Capacities:", fboMap);
      } catch (error) {
        console.error("Failed to fetch FBO capacities:", error);
      }
    };

    fetchFboCapacities();
  }, [id]);

  /**
   * Fetches FBO data from the server and updates the state
   * The data includes FBO name, parking taken, total parking, status, and priority
   */
  const fetchFBOData = useCallback(() =>{
    axios
      .get(`http://localhost:5001/airports/getParkingCoordinates/${id}`)
      .then((response) => {
        const data = response.data;
        const fboData = data.map((lot) =>({
          id: lot.id,
          name: lot.FBO_Name,
          parking_taken: Math.min(lot.spots_taken, lot.Total_Space),
          total_parking: lot.Total_Space,
          status: "Open",
          priority: lot.Priority,
        }));
        setFBOList(fboData);
        if (isEditingFBO){
          setOriginalPriorities(fboData.map((fbo) => fbo.priority));
        }
      })
      .catch((error) =>{
        console.error("Error fetching FBO data >:(", error);
      });
  }, [id, isEditingFBO]);

  useEffect(() =>{
    fetchFBOData();
  }, [fetchFBOData]);

  /**
   * Handles the toggle between edit and done mode for FBO priorities
   * In edit mode, the user can change the priority of each FBO
   */
  const handleToggleEditFBO = () =>{
    if (isEditingFBO){
      const currentPriorities = FBOList.map((fbo) => fbo.priority);
      const uniquePriorities = new Set(currentPriorities);
      if (uniquePriorities.size !== currentPriorities.length){
        alert("There are duplicate priorities. Please ensure each FBO has a unique priority.");
        return;
      }
      const originalPayload = originalPriorities.join(",");
      const currentPayload = currentPriorities.join(",");
      if (originalPayload === currentPayload){
        setIsEditingFBO(false);
        return;
      }
      const payload = FBOList.map((fbo) =>({
        id: fbo.id,
        priority: fbo.priority,
      }));

      console.log("Updating with payload:", payload);

      axios
        .patch("http://localhost:5001/airportsPriority/updateParkingPriorities", payload)
        .then((response) =>{
          console.log("Priorities updated:", response.data.message);
          setIsEditingFBO(false);
          fetchFBOData();
        })
        .catch((error) =>{
          if (error.response) {
            console.error("Error updating priorities:", error.response.data);
          } else {
            console.error("Error updating priorities:", error.message);
          }
          alert("Error updating priorities >:(");
        });
    } else{
      setOriginalPriorities(FBOList.map((fbo) => fbo.priority));
      setIsEditingFBO(true);
    }
  };

  /**
   * Handles the change in priority for a specific FBO
   * Updates the state with the new priority value
   */
  const handlePriorityChange = (index, newPriority) =>{
    setFBOList((prevFBOs) =>{
      const updatedFBOs = [...prevFBOs];
      updatedFBOs[index] ={
        ...updatedFBOs[index],
        priority: newPriority,
      };
      return updatedFBOs;
    });
  };

  const handleAddFBO = () =>{
    navigate(`/fboPage/${id}`);
  };

  const handleRemoveFBO = (fboId) =>{
    if (!window.confirm("Are you sure you want to remove this FBO?")){
      return;
    }
    axios
      .delete(`http://localhost:5001/airports/fbo/deleteFBO/${fboId}`)
      .then((response) => {
        console.log("FBO deleted:", response.data.message);
        axios
          .get(`http://localhost:5001/airports/getParkingCoordinates/${id}`)
          .then((response) => {
            const data = response.data;
            const fboData = data.map((lot) =>({
              id: lot.id,
              name: lot.FBO_Name,
              parking_taken: lot.Total_Space,
              total_parking: lot.Total_Space,
              status: "Open",
              priority: lot.Priority,
            }));
            setFBOList(fboData);
            if (isEditingFBO){
              setOriginalPriorities(fboData.map((fbo) => fbo.priority));
            }
          })
          .catch((error) =>{
            console.error("Error re-fetching FBO data after deletion:", error);
          });
      })
      .catch((error) =>{
        console.error("Error deleting FBO:", error);
        alert("Error deleting FBO");
      });
  };

  const handleEditFBO = (fboId) =>{
    navigate(`/editFBO/${id}/${fboId}`);
  };

  return (
    <Card className="card-content flex-3">
      <CardContent>
        <div className="fbo-container">
          <div
            className="fbo-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2>FBOs</h2>
            <button onClick={handleToggleEditFBO} className="edit-button">
              {isEditingFBO ? "Done" : "Edit"}
            </button>
          </div>
          <table className="info-table">
            <thead>
              <tr>
                <th>FBO</th>
                <th>Status</th>
                <th>Priority</th>
                {isEditingFBO && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {FBOList.map((fbo, index) => (
                <tr key={index}>
                  <td>{fbo.name}</td>
                  <td>
                    {fboCapacities[fbo.name] != null && !isNaN(fboCapacities[fbo.name])?
                      <span className={getStatusClass(fboCapacities[fbo.name])}>
                        {fboCapacities[fbo.name]}%
                      </span>
                      : "\u00A0"}
                  </td>
                  <td>
                    {isEditingFBO ? (
                      <select
                        value={fbo.priority}
                        onChange={(e) => handlePriorityChange(index, parseInt(e.target.value))}
                      >
                        {Array.from({ length: FBOList.length }, (_, i) => i + 1).map((val) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </select>
                    ) : (
                      fbo.priority
                    )}
                  </td>
                  {isEditingFBO && (
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                        <button
                          onClick={() => handleEditFBO(fbo.id)}
                          className="fbo-action-button"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveFBO(fbo.id)}
                          className="fbo-action-button"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {isEditingFBO && (
            <div style={{marginTop: "10px", textAlign: "center"}}>
              <button onClick={handleAddFBO} className="fbo-action-button">
                Add FBO
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
