const express = require('express')
const app = express()
const cors = require('cors');
const batchFileRoutes = require('./routes/batchFileRoutes');
const recEngineRoutes = require('./routes/recEngineRoutes');

const port = 5000

app.use(cors());
app.use(express.json({limit: '100mb'}));

app.use('/batch', batchFileRoutes);
app.use('/rec', recEngineRoutes);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})