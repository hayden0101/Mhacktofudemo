const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in your .env file."
    );
    process.exit(1);
}


if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in your .env file");
    process.exit(1)
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.5-flash" // Need to check for the key again but it should be about this for the cheapest option


const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Open the homepage when visiting http://localhost:3000
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

// Generate assignment join codes such as TOFU482
function generateAssignmentCode() {
    const number = crypto.randomInt(100, 1000);
    return `TOFU${number}`;
}

// GET: Load all assignments
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

// POST: Create a new assignment
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
            error: "Please provide a title, instructions, and question."
        });
    }

    try {
        let assignment = null;
        let insertError = null;

        // Retry if the generated join code already exists.
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateAssignmentCode();

            const { data, error } = await supabase
                .from("assignments")
                .insert({
                    code,
                    title: title.trim(),
                    instructions: instructions.trim(),
                    question: question.trim()
                })
                .select("*")
                .single();

            if (!error) {
                assignment = data;
                break;
            }

            insertError = error;

            if (error.code !== "23505") {
                throw error;
            }
        }

        if (!assignment) {
            throw insertError || new Error(
                "Could not generate a unique assignment code."
            );
        }

        res.status(201).json({
            message: "Assignment published successfully!",
            assignment
        });
    } catch (error) {
        console.error("Error publishing assignment:", error.message);

        res.status(500).json({
            error: "Unable to publish assignment."
        });
    }
});


/* DELETE: Remove an assignment and its associated submissions */
app.delete("/api/assignments/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("assignments")
            .delete()
            .eq("id", req.params.id)
            .select("id")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                error: "Assignment not found."
            });
        }

        return res.json({
            message: "Assignment deleted successfully."
        });

    } catch (error) {
        console.error("Error deleting assignment:", error.message);

        return res.status(500).json({
            error: "Unable to delete assignment."
        });
    }
});

// GET: Find an assignment by its join code
app.get("/api/assignments/:code", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const { data, error } = await supabase
            .from("assignments")
            .select("*")
            .eq("code", code)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                error: "Assignment not found. Please check the code."
            });
        }

        res.json({ assignment: data });
    } catch (error) {
        console.error("Error finding assignment:", error.message);

        res.status(500).json({
            error: "Unable to find assignment."
        });
    }
});

// POST: Save a student's answer and activity counters
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
        // Confirm that the assignment exists.
        const { data: assignment, error: lookupError } = await supabase
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

        // Save the response and tracked activity.
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
            .select("*")
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

// GET: Retrieve submissions for a teacher's assignment
app.get("/api/assignments/:id/submissions", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("submissions")
            .select(`
                id,
                student_name,
                answer,
                submitted_at,
                paste_count,
                tab_leave_count,
                ai_question_count
            `)
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

// Limit the amount of time for a message to be sent
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15, // 15 messages per minute per IP
    message: { error: "You're sending messages too quickly. Please wait a moment." }
});

// POST: Ask the AI guide a question about an assignment
app.post("/api/chat", chatLimiter, async (req, res) => {
    const { code, message, history = [], draft = "" } = req.body;

    if (
        typeof code !== "string" ||
        typeof message !== "string" ||
        !message.trim()
    ) {
        return res.status(400).json({
            error: "Assignment code and message are required."
        });
    }

    try {
        // Look up the assignment on the server so the client can't change it
        const { data: assignment, error } = await supabase
            .from("assignments")
            .select("title, instructions, question")
            .eq("code", code.trim().toUpperCase())
            .maybeSingle();

        if (error) throw error;

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

    // This information is a placeholder at the moment as to just try and learn the logic of the program
        const systemInstruction = `You are a study guide helping a student with a writing assignment.

Assignment title: ${assignment.title}
Teacher's instructions: ${assignment.instructions}
Question: ${assignment.question}

Rules:
- Help the student work out HOW to approach the question: suggest structure, key ideas to consider, and guiding questions.
- Do NOT write the answer or full paragraphs for them, even if they ask directly. Offer hints and approaches instead.
- If they share their draft, give specific feedback (clarity, structure, evidence) without rewriting it.
- Stay on topic for this assignment.
- Keep replies short and encouraging. Use plain text only, with no markdown formatting.`;

        // Rebuild history from trusted fields only and cap its size
        const past = Array.isArray(history)
            ? history.slice(-20).map(m => ({
                role: m.role === "model" ? "model" : "user",
                parts: [{ text: String(m.text).slice(0, 4000) }]
            }))
            : [];

        const question = message.trim().slice(0, 2000);
        const draftText = String(draft).trim().slice(0, 8000);

        const userText = draftText
            ? `Student's current draft:\n"""\n${draftText}\n"""\n\nStudent's question: ${question}`
            : question;

        // Retry temporary Gemini service errors using exponential backoff.
        let response;
        let lastError;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                response = await ai.models.generateContent({
                    model: GEMINI_MODEL,
                    contents: [
                        ...past,
                        { role: "user", parts: [{ text: userText }] }
                    ],
                    config: {
                        systemInstruction
                    }
                });

                // The request succeeded, so exit the retry loop.
                break;

            } catch (error) {
                lastError = error;

                const errorText =
                    `${error.message || ""} ${JSON.stringify(error)}`;

                const isTemporary =
                    /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL/i
                        .test(errorText);

                // Don't retry errors that are unlikely to resolve on their own.
                if (!isTemporary || attempt === 2) {
                    throw error;
                }

                // Wait approximately 1 second, then 2 seconds before retrying.
                const delayMs =
                    1000 * (2 ** attempt) + Math.random() * 300;

                console.warn(
                    `Gemini request failed (attempt ${attempt + 1}/3). ` +
                    `Retrying in ${Math.round(delayMs)} ms.`
                );

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        if (!response) {
            throw lastError || new Error("Gemini did not return a response.");
        }

        res.json({
            reply: response.text || "I couldn't come up with a response to that. Try rephrasing your question."
        });
    } catch (error) {
        console.error("Error in chat:", error.message);

        res.status(500).json({
            error: "The AI assistant is unavailable right now."
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`TOFU server running at http://localhost:${PORT}`);
});