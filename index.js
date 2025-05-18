const express = require("express");
const app = express();
const port = process.env.PORT || 3700;
app.enable("trust proxy");

app.use(express.static("dist"));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
