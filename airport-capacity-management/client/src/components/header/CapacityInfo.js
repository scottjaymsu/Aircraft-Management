/**
 * Total airport Capacity and individual FBO Capacities
 * Of Simulator component
 * Displays in the Header of the simulator component 
 * 
 * Props:
 * - currentPopulation: Number of planes currently at the airport
 * - overallCapacity: Overall capacity of the airport
 * - fbo: Array of FBO data
 */
const CapacityInfo = ({ capacity, fboCapacity }) => {
 
    return (
      <div className='header-segment-small'>
        <div>
          {capacity !== null ? `Airport Capacity` : "\u00A0"}
        </div>
        <div>{capacity !== null ? `${capacity}%` : "\u00A0"}</div>
        <div>
          {fboCapacity != null ? `FBO Capacity` : "\u00A0"}
        </div>
        <div>{fboCapacity != null ? `${fboCapacity}%` : "\u00A0"}</div> 
      </div>
    );
  };
  
  export default CapacityInfo;
  