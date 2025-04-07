/**
 * Title Section of Simulator Header
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