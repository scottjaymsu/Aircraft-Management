import '../../styles/SimulatorTableFilters.css';
/**
 * Segment for the time and reset button
 * Props: 
 * - localTime: The current local time
 * - handleResetFilters: Function to reset filters
 */
const SimulatorTime = ({ localTime, handleResetFilters }) => (
    <div className="sim-time-wrapper" style={{ marginRight: "15px" }}>
    <div className="sim-time-row">
      <div className="sim-time-group">
        <label className="custom-select-label" htmlFor="local-datetime">Local Time</label>
        <input
          type="text"
          id="local-datetime"
          readOnly
          value={localTime || "Loading..."}
          className="custom-select-input"
        />
      </div>
      <button className="reset-button" onClick={handleResetFilters}>
        Reset Filters
      </button>
    </div>
  </div>
);
  
  export default SimulatorTime;
  