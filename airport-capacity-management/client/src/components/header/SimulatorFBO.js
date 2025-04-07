/**
 * Selected FBO listed over main table of Simulator
 */
const SimulatorFBO = ({ selectedFBO }) => (
    <div id='fbo-title-sim'>{selectedFBO?.FBO_Name || selectedFBO || 'Select an FBO'}</div>
  );
  
  export default SimulatorFBO;