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

// ------ Using Node.js Crypto ------
// Temporary storage in server memory
const assignments = [];

// Create an assignment
app.post("/api/assignments", (req, res) => {
    const { title, instructions, question } = req.body;

    // Validate the form data
    if (
        typeof title !== "string" ||
        typeof instructions !== "string" ||
        typeof question !== "string" ||
        !title.trim() ||
        !instructions.trim() ||
        !question.trim()
    ) {
        return res.status(400).json({
            error: "Please fill in all assignment fields."
        });
    }

    // Generate a simple join code
    const code = "TOFU" + crypto.randomInt(100, 1000);

    const assignment = {
        id: crypto.randomUUID(),
        code,
        title: title.trim(),
        instructions: instructions.trim(),
        question: question.trim(),
        createdAt: new Date().toISOString()
    };

    // Store the assignment until the server restarts
    assignments.push(assignment);

    // Send the new assignment back to the teacher page
    res.status(201).json({
        message: "Assignment published successfully!",
        assignment
    });
});

// Retrieve an assignment by its join code
app.get("/api/assignments/:code", (req, res) => {
    const code = req.params.code.toUpperCase();

    const assignment = assignments.find(
        item => item.code === code
    );

    if (!assignment) {
        return res.status(404).json({
            error: "Assignment not found. Check the code and try again."
        });
    }

    res.json({ assignment });
});


app.listen(PORT, () => {
    console.log(`TOFU is running at http://localhost:${PORT}`);
});
