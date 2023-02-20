require("dotenv").config();
const express = require("express");
const app = express();
const cors = require('cors');

const userRouter = require("./router/userRouter");

// Connecting Database
require("./database/conn");

const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors())

app.use("/api/user", userRouter);

app.listen(port, () => {
    console.log(`Server is listen at number ${port}`);
});
