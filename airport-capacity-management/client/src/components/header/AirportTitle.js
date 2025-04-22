/**
 * Title Section of Simulator Header
 * 
 * Props:
 * - selectedAirport: The currently selected airport
 * - handleBackClick: Function to handle back button click
 */
const AirportTitle = ({ selectedAirport, handleBackClick }) => (
  <div id="title-wrapper">
    <button id="back-button-sim">
      <img onClick={handleBackClick} src="/back-arrow.png" alt="Back Button" />
    </button>
    <div id="airport-title">{selectedAirport || "N/A"}</div>
    <div id="sim-title">Flight Simulator</div>
  </div>
);

export default AirportTitle;