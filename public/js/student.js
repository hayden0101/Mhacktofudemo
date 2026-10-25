const joinForm = document.getElementById("join-form");
const joinCodeInput = document.getElementById("join-code");
const joinButton = document.getElementById("join-button");

const joinSection = document.getElementById("join-section");
const assignmentSection = document.getElementById("assignment-section");
const assignmentTitle = document.getElementById("assignment-title");
const assignmentInstructions = document.getElementById("assignment-instructions");
const assignmentQuestion = document.getElementById("assignment-question");

const answerForm = document.getElementById("answer-form");
const studentNameInput = document.getElementById("student-name");
const studentAnswerInput = document.getElementById("student-answer");
const submitButton = document.getElementById("submit-button");

const statusMessage = document.getElementById("status-message");

let currentAssignment = null;

// Display status messages to the student.
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#c62828" : "#16803c";
}

// Join an assignment using the teacher's code.
joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const code = joinCodeInput.value.trim().toUpperCase();

    if (!code) {
        showStatus("Please enter an assignment code.", true);
        return;
    }

    joinButton.disabled = true;
    showStatus("Looking up assignment...");

    try {
        const response = await fetch(
            `/api/assignments/${encodeURIComponent(code)}`
        );

        const responseText = await response.text();

        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            console.error("Server returned non-JSON:", responseText);

            throw new Error(
                `Server returned an unexpected response (HTTP ${response.status}). Check the server terminal.`
            );
        }

        if (!response.ok) {
            throw new Error(
                result.error || "Could not find that assignment."
            );
        }

        if (
            !result.assignment ||
            !result.assignment.id ||
            !result.assignment.title
        ) {
            throw new Error("The assignment data is incomplete.");
        }

        // Save the assignment so the student can submit a response.
        currentAssignment = result.assignment;

        // Display the teacher's assignment information.
        assignmentTitle.textContent = currentAssignment.title;
        assignmentInstructions.textContent =
            currentAssignment.instructions;
        assignmentQuestion.textContent =
            currentAssignment.question;

        // Show the assignment and hide the join form.
        assignmentSection.hidden = false;
        joinSection.hidden = true;

        // Reset the answer form for the newly joined assignment.
        answerForm.reset();
        studentAnswerInput.disabled = false;
        studentNameInput.disabled = false;
        submitButton.disabled = false;
        submitButton.textContent = "Submit Answer";

        showStatus("Assignment loaded successfully!");

        // Bring the assignment into view.
        assignmentSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        console.error("Error joining assignment:", error);

        showStatus(error.message || "Unable to load assignment.", true);
    } finally {
        joinButton.disabled = false;
    }
});

// Submit the student's response to the server.
answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentAssignment) {
        showStatus("Please join an assignment first.", true);
        return;
    }

    const studentName = studentNameInput.value.trim();
    const answer = studentAnswerInput.value.trim();

    if (!studentName || !answer) {
        showStatus("Please enter your name and response.", true);
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
                answer
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to submit your response."
            );
        }

        showStatus("Your response was submitted successfully!");

        studentAnswerInput.disabled = true;
        studentNameInput.disabled = true;
        submitButton.textContent = "Submitted";

    } catch (error) {
        console.error("Error submitting response:", error);

        showStatus(
            error.message || "Unable to submit your response.",
            true
        );

        submitButton.disabled = false;
    }
});