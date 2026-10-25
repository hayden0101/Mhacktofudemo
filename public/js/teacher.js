const assignmentForm = document.getElementById("assignment-form");
const statusMessage = document.getElementById("status-message");

const publishedAssignment = document.getElementById("published-assignment");
const assignmentCode = document.getElementById("assignment-code");
const publishedTitle = document.getElementById("published-title");
const assignmentBlock = document.getElementById("assignmentblock");

// Load assignments from the server
async function loadAssignments() {
    try {
        const response = await fetch("/api/assignments");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to load assignments.");
        }

        assignmentBlock.replaceChildren();

        if (!result.assignments || result.assignments.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No assignments published yet.";
            assignmentBlock.appendChild(message);
            return;
        }

        result.assignments.forEach((assignment) => {
            const card = document.createElement("div");
            card.className = "text-item";

            const title = document.createElement("h3");
            title.textContent = assignment.title;

            const code = document.createElement("p");
            code.textContent = "Join Code: " + assignment.code;

            const instructions = document.createElement("p");
            instructions.textContent = assignment.instructions;

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.textContent = "View Submissions";

            const submissionPanel = document.createElement("div");
            submissionPanel.hidden = true;

            let submissionsLoaded = false;

            async function loadSubmissions() {
                submissionPanel.hidden = false;
                submissionPanel.replaceChildren();

                const loading = document.createElement("p");
                loading.textContent = "Loading student submissions...";
                submissionPanel.appendChild(loading);

                try {
                    const response = await fetch(
                        `/api/assignments/${encodeURIComponent(assignment.id)}/submissions`
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error || "Failed to load submissions."
                        );
                    }

                    submissionsLoaded = true;
                    submissionPanel.replaceChildren();

                    const heading = document.createElement("h4");
                    heading.textContent =
                        `Student Submissions (${result.submissions.length})`;

                    const refreshButton = document.createElement("button");
                    refreshButton.type = "button";
                    refreshButton.textContent = "Refresh Submissions";
                    refreshButton.style.margin = "10px auto";
                    refreshButton.addEventListener("click", loadSubmissions);

                    submissionPanel.append(heading, refreshButton);

                    if (result.submissions.length === 0) {
                        const emptyMessage = document.createElement("p");
                        emptyMessage.textContent =
                            "No students have submitted a response yet.";
                        submissionPanel.appendChild(emptyMessage);
                        return;
                    }

                    result.submissions.forEach((submission) => {
                        const responseCard = document.createElement("div");
                        responseCard.className = "text-item";

                        const student = document.createElement("h4");
                        student.textContent = submission.student_name;

                        const submittedAt = document.createElement("p");
                        const date = new Date(submission.submitted_at);

                        submittedAt.textContent = Number.isNaN(date.getTime())
                            ? "Submission time unavailable"
                            : "Submitted: " + date.toLocaleString();

                        const answerLabel = document.createElement("p");
                        answerLabel.textContent = "Answer:";

                        const answer = document.createElement("p");
                        answer.textContent = submission.answer;
                        answer.style.whiteSpace = "pre-wrap";

                        responseCard.append(
                            student,
                            submittedAt,
                            answerLabel,
                            answer
                        );

                        submissionPanel.appendChild(responseCard);
                    });
                } catch (error) {
                    console.error("Error loading submissions:", error);

                    submissionPanel.replaceChildren();

                    const errorMessage = document.createElement("p");
                    errorMessage.textContent = error.message;
                    errorMessage.style.color = "red";

                    const retryButton = document.createElement("button");
                    retryButton.type = "button";
                    retryButton.textContent = "Try Again";
                    retryButton.addEventListener("click", loadSubmissions);

                    submissionPanel.append(errorMessage, retryButton);
                }
            }

            viewButton.addEventListener("click", async () => {
                if (!submissionPanel.hidden) {
                    submissionPanel.hidden = true;
                    viewButton.textContent = "View Submissions";
                    return;
                }

                viewButton.textContent = "Hide Submissions";

                if (!submissionsLoaded) {
                    await loadSubmissions();
                } else {
                    submissionPanel.hidden = false;
                }
            });

            card.append(
                title,
                code,
                instructions,
                viewButton,
                submissionPanel
            );

            assignmentBlock.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading assignments:", error);

        assignmentBlock.textContent =
            "Unable to load assignments. Please refresh the page.";
    }
}

// Publish a new assignment
assignmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    statusMessage.textContent = "Publishing assignment...";
    statusMessage.style.color = "black";

    const assignmentData = {
        title: document.getElementById("title").value.trim(),
        instructions: document.getElementById("instructions").value.trim(),
        question: document.getElementById("question").value.trim()
    };

    try {
        const response = await fetch("/api/assignments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(assignmentData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to publish assignment."
            );
        }

        statusMessage.textContent = result.message;
        statusMessage.style.color = "green";

        assignmentCode.textContent = result.assignment.code;
        publishedTitle.textContent = result.assignment.title;
        publishedAssignment.hidden = false;

        assignmentForm.reset();

        await loadAssignments();
    } catch (error) {
        statusMessage.textContent = error.message;
        statusMessage.style.color = "red";

        console.error("Error publishing assignment:", error);
    }
});

// Load assignments when the page opens
loadAssignments();
