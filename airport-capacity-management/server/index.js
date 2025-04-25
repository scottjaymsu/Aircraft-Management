const express = require('express');
const app = express();
const cors = require('cors');
const simulatorRoutes = require('./routes/simulatorRoutes');
const airportSummaryRoutes = require('./routes/airportSummaryRoutes');
const airportDataRoutes = require('./routes/airportDataRoutes');
const flightDataRoutes = require('./routes/flightDataRoutes');
const fboCapacityRoutes = require('./routes/fboCapacityRoutes');
const batchFileRoutes = require('./routes/batchFileRoutes');
const alertRoutes = require('./routes/alertRoutes');
const mapRoutes = require('./routes/mapRoutes');
const parkingPriorityRoutes = require('./routes/parkingpriorityRoutes');
const fboRoutes = require('./routes/fboRoutes');
const { spawn } = require('child_process');

const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use('/simulator', simulatorRoutes);
app.use('/airports', airportSummaryRoutes);
app.use('/airportData', airportDataRoutes);
app.use('/flightData', flightDataRoutes);
app.use('/fboinfo', fboCapacityRoutes);
app.use('/batch', batchFileRoutes);
app.use('/map', mapRoutes);
app.use('/alerts', alertRoutes);
app.use('/airportsPriority', parkingPriorityRoutes);
app.use('/airports/fbo', fboRoutes);

// Start SSH Tunnel
const sshTunnelCommand = `ssh`;
const sshTunnelArgs = [
  '-v',
  '-i', `"netjets-db-manager-key 1.pem"`,
  '-N',
  '-L',
  '50173:netjets-planes-and-airports.czkio0gye9rr.us-east-2.rds.amazonaws.com:3306',
  'ec2-user@ec2-3-16-169-179.us-east-2.compute.amazonaws.com'
];

const sshTunnel = spawn(sshTunnelCommand, sshTunnelArgs, { shell: true });

sshTunnel.stdout.on('data', (data) => {
  console.log(`SSH Tunnel: ${data}`);
});

sshTunnel.stderr.on('data', (data) => {
  console.error(`SSH Tunnel Error: ${data}`);
});

sshTunnel.on('close', (code) => {
  if (code === 0) {
    console.log('SSH Tunnel established successfully');
  } else {
    console.log(`SSH Tunnel process exited with code ${code}`);
  }
});

// Start the Express server after SSH tunnel is established

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});