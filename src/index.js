require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");







//const app1 = express();
//app1.use(expressLogger);


// app1.get('/', (req, res) => {
//   logger.debug('Calling res.send');
//   res.send('Hello World');
//  });
// TODO: CRIO_TASK_MODULE_UNDERSTANDING_BASICS - Create Mongo connection and get the express app to listen on config.port
let server;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  console.log("Connected to MongoDB");
  server = app.listen(config.port, () => {
    //logger.info('Server running on port %d', config.port);
    console.log(`Listening to port ${config.port}`);
  });
});
