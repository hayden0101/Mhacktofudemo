<<<<<<< Updated upstream
=======
const joinForm = document.getElementById("join-form");
const joinCodeInput = document.getElementById("join-code");
const joinButton = document.getElementById("join-button");
const joinSection = document.getElementById("join-section");

const assignmentSection = document.getElementById("assignment-section");
const studentWorkspace = document.getElementById("student-workspace");
const assignmentTitle = document.getElementById("assignment-title");
const assignmentInstructions = document.getElementById(
    "assignment-instructions"
);
const assignmentQuestion = document.getElementById("assignment-question");

const answerForm = document.getElementById("answer-form");
const studentNameInput = document.getElementById("student-name");
const studentAnswerInput = document.getElementById("student-answer");
const submitButton = document.getElementById("submit-button");

const statusMessage = document.getElementById("status-message");

// Current assignment and activity tracking
let currentAssignment = null;

let pasteCount = 0;
let tabLeaveCount = 0;
let aiQuestionCount = 0;
let responseSubmitted = false;

// Display status messages
function showStatus(message, color = "#222") {
    statusMessage.textContent = message;
    statusMessage.style.color = color;
}

// Track paste events in the student's answer textbox
studentAnswerInput.addEventListener("paste", () => {
    if (currentAssignment && !responseSubmitted) {
        pasteCount++;
    }
});

// Track when the student leaves the browser tab after joining
document.addEventListener("visibilitychange", () => {
    if (
        document.hidden &&
        currentAssignment &&
        !responseSubmitted
    ) {
        tabLeaveCount++;
    }
});

// Join an assignment using the teacher's code
joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const code = joinCodeInput.value.trim().toUpperCase();

    if (!code) {
        showStatus("Please enter an assignment code.", "red");
        return;
    }

    joinButton.disabled = true;
    showStatus("Looking up assignment...");

    try {
        const response = await fetch(
            `/api/assignments/${encodeURIComponent(code)}`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to find that assignment."
            );
        }

        if (!result.assignment) {
            throw new Error("Assignment information was not returned.");
        }

        currentAssignment = result.assignment;

        // Display the assignment information
        assignmentTitle.textContent = currentAssignment.title;
        assignmentInstructions.textContent =
            currentAssignment.instructions;
        assignmentQuestion.textContent = currentAssignment.question;

        // Reset form and activity counters for this assignment
        answerForm.reset();

        pasteCount = 0;
        tabLeaveCount = 0;
        aiQuestionCount = 0;
        responseSubmitted = false;

        // Show the assignment and the two-column workspace
        assignmentSection.hidden = false;
        studentWorkspace.hidden = false;
        joinSection.hidden = true;

        showStatus("");
    } catch (error) {
        console.error("Error joining assignment:", error);
        showStatus(error.message, "red");
    } finally {
        joinButton.disabled = false;
    }
});

// Submit the student's response and activity counters
answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentAssignment) {
        showStatus("Please join an assignment first.", "red");
        return;
    }

    const studentName = studentNameInput.value.trim();
    const answer = studentAnswerInput.value.trim();

    if (!studentName || !answer) {
        showStatus("Please provide your name and a response.", "red");
        return;
    }

    submitButton.disabled = true;
    showStatus("Submitting your response...");

    try {
        const response = await fetch("/api/submissions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assignmentId: currentAssignment.id,
                studentName,
                answer,
                pasteCount,
                tabLeaveCount,
                aiQuestionCount
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to submit your response."
            );
        }

        responseSubmitted = true;

        showStatus(
            result.message || "Response submitted successfully!",
            "green"
        );

        // Prevent edits or another submission after success
        studentNameInput.disabled = true;
        studentAnswerInput.disabled = true;
        submitButton.disabled = true;
    } catch (error) {
        console.error("Error submitting response:", error);
        showStatus(error.message, "red");
        submitButton.disabled = false;
    }
});
>>>>>>> Stashed changes
