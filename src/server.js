const express = require("express");
require("dotenv").config();
// const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

const router = require("./routes/router");
const connection = require("./config/dbConnect");

// app.use(express.static(path.join("./src", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/v1/api/", router);
(async () => {
  try {
    await connection();
    app.listen(port, () => {
      console.log(`App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.log("Error while connecting to database");
  }
})();
