
require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Check that the Supabase credentials exist
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env"
    );
}

// Connect to Supabase from the server
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

// Get all assignments
app.get("/api/assignments", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("assignments")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ assignments: data });
    } catch (error) {
        console.error("Error loading assignments:", error.message);
        res.status(500).json({
            error: "Unable to load assignments."
        });
    }
});

// Create an assignment
app.post("/api/assignments", async (req, res) => {
    const { title, instructions, question } = req.body;

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

    try {
        let code;
        let exists = true;

        // Generate a code that is not already in use
        while (exists) {
            code = "TOFU" + Math.floor(100 + Math.random() * 900);

            const { data, error } = await supabase
                .from("assignments")
                .select("id")
                .eq("code", code)
                .maybeSingle();

            if (error) throw error;

            exists = Boolean(data);
        }

        const newAssignment = {
            id: crypto.randomUUID(),
            code,
            title: title.trim(),
            instructions: instructions.trim(),
            question: question.trim()
        };

        const { data, error } = await supabase
            .from("assignments")
            .insert(newAssignment)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Assignment published successfully!",
            assignment: {
                ...data,
                createdAt: data.created_at
            }
        });
    } catch (error) {
        console.error("Error publishing assignment:", error.message);
        res.status(500).json({
            error: "Unable to publish assignment. Please try again."
        });
    }
});

// Retrieve one assignment by its join code
app.get("/api/assignments/:code", async (req, res) => {
    const code = req.params.code.toUpperCase();

    try {
        const { data, error } = await supabase
            .from("assignments")
            .select("*")
            .eq("code", code)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                error: "Assignment not found. Check the code and try again."
            });
        }

        res.json({
            assignment: {
                ...data,
                createdAt: data.created_at
            }
        });
    } catch (error) {
        console.error("Error retrieving assignment:", error.message);
        res.status(500).json({
            error: "Unable to retrieve assignment."
        });
    }
});

// POST submit student response
app.post("/api/submissions", async (req, res) => {
    const {
        assignmentId,
        studentName,
        answer,
        pasteCount = 0,
        tabLeaveCount = 0,
        aiQuestionCount = 0
    } = req.body;

    if (
        typeof assignmentId !== "string" ||
        typeof studentName !== "string" ||
        typeof answer !== "string" ||
        !studentName.trim() ||
        !answer.trim()
    ) {
        return res.status(400).json({
            error: "Please provide your name and a response."
        });
    }

    const counts = [pasteCount, tabLeaveCount, aiQuestionCount];

    if (
        !counts.every(
            count => Number.isInteger(count) && count >= 0
        )
    ) {
        return res.status(400).json({
            error: "Activity counts must be non-negative integers."
        });
    }

    try {
        const { data: assignment, error: lookupError } =
            await supabase
                .from("assignments")
                .select("id")
                .eq("id", assignmentId)
                .maybeSingle();

        if (lookupError) throw lookupError;

        if (!assignment) {
            return res.status(404).json({
                error: "Assignment not found."
            });
        }

        const { data, error } = await supabase
            .from("submissions")
            .insert({
                assignment_id: assignmentId,
                student_name: studentName.trim(),
                answer: answer.trim(),
                paste_count: pasteCount,
                tab_leave_count: tabLeaveCount,
                ai_question_count: aiQuestionCount
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Response submitted successfully!",
            submission: data
        });

    } catch (error) {
        console.error("Error saving submission:", error.message);
        res.status(500).json({
            error: "Unable to save your response."
        });
    }
});

// GET submissions for a specific assignment
app.get("/api/assignments/:id/submissions", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("submissions")
            .select("id, student_name, answer, submitted_at, paste_count, tab_leave_count, ai_question_count")
            .eq("assignment_id", req.params.id)
            .order("submitted_at", { ascending: false });

        if (error) throw error;

        res.json({ submissions: data });
    } catch (error) {
        console.error("Error loading submissions:", error.message);
        res.status(500).json({
            error: "Unable to load student submissions."
        });
    }
});


app.listen(PORT, () => {
    console.log(`TOFU is running at http://localhost:${PORT}`);
});