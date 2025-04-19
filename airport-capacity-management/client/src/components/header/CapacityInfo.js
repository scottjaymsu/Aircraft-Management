/**
 * Total airport Capacity and individual FBO Capacities
 * Of simulator component
 */
const CapacityInfo = ({ capacity, fboCapacity }) => {
 
    return (
      <div className='header-segment-small'>
        <div>{`Airport Capacity`}</div>
        <div>{capacity !== null ? `${capacity}%` : "0%"}</div>
        <div>FBO Capacity</div>
        <div>{fboCapacity != null ? `${fboCapacity}%` : "\u00A0"}</div> 
      </div>
    );
  };
  
  export default CapacityInfo;
  