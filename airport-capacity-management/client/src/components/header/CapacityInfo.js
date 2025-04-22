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
    <div className="header-segment-small">
      <div>{`Airport Capacity`}</div>
      <div>{capacity !== null ? `${capacity}%` : "0%"}</div>

      {fboCapacity != null && (
        <>
          <div>FBO Capacity</div>
          <div>{`${fboCapacity}%`}</div>
        </>
      )}
    </div>
  );
};

export default CapacityInfo;
