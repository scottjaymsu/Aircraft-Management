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
const CapacityInfo = ({ currentPopulation, overallCapacity, fbo }) => {
    const airportCap = currentPopulation && overallCapacity
      ? `${((currentPopulation / overallCapacity) * 100).toFixed(0)}%`
      : '';
  
    // Calculate FBO capacity as percentage
    const fboCap = fbo?.[0]?.parking_taken && fbo?.[0]?.total_parking
      ? `${((fbo[0].parking_taken / fbo[0].total_parking) * 100).toFixed(0)}%`
      : '0%';
  
    return (
      <div className='header-segment-small'>
        <div>{`Airport Capacity`}</div>
        <div>{airportCap}</div>
        <div>FBO Capacity</div>
        <div>{fboCap}</div>
        
      </div>
    );
  };
  
  export default CapacityInfo;
  