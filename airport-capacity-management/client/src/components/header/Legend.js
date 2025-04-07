/**
 * Segment for the time and reset button
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
  