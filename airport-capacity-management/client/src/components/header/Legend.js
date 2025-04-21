/**
 * Segment for the time and reset button
 * Dispayed as a part of the header for the simulator component
 */
const Legend = () => (
    <div className='header-segment-small'>
      {["Arriving", "Departing", "Parked", "Maintenance"].map((label, idx) => (
        <div className='legend-row' key={label}>
          <div className={`legend-square ${["blue", "yellow", "green", "red"][idx]}-color`} />
          <div>{label}</div>
        </div>
      ))}
    </div>
  );
  
  export default Legend;
  