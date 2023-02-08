const mongoose = require("mongoose");


mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB);

mongoose.connection.on("connected", () => {
    console.log("Database is connected");
})

mongoose.connection.on("error", () => {
    console.log("Database is nnot connected");
})