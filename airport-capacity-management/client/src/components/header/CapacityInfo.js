/**
 * Total airport Capacity and individual FBO Capacities
 * Of simulator component
 */
const CapacityInfo = ({ capacity, fbo }) => {
    const fboCap = fbo?.[0]?.parking_taken && fbo?.[0]?.total_parking
      ? `${((fbo[0].parking_taken / fbo[0].total_parking) * 100).toFixed(0)}%`
      : '0%';
  
    return (
      <div className='header-segment-small'>
        <div>{`Airport Capacity`}</div>
        <div>{capacity !== null ? `${capacity}%` : "\u00A0"}</div>
        <div>FBO Capacity</div>
        <div>{fboCap}</div>
        
      </div>
    );
  };
  
  export default CapacityInfo;
  