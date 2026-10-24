const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Allow the server to receive JSON requests
app.use(express.json());

// Serve files from the public folder
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

app.listen(PORT, () => {
    console.log(`TOFU is running at http://localhost:${PORT}`);
});
