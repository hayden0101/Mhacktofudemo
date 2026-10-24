const assignmentForm = document.getElementById("assignment-form");
const statusMessage = document.getElementById("status-message");

const publishedAssignment = document.getElementById("published-assignment");
const assignmentCode = document.getElementById("assignment-code");
const publishedTitle = document.getElementById("published-title");
const assignmentBlock = document.getElementById("assignmentblock");

// ------------------------------------
// 1. Load assignments from the server
// ------------------------------------

async function loadAssignments() {
    try {
        const response = await fetch("/api/assignments");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to load assignments."
            );
        }

        // Clear the current list before rebuilding it
        assignmentBlock.replaceChildren();

        // Show a message if there are no assignments
        if (result.assignments.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No assignments published yet.";
            assignmentBlock.appendChild(emptyMessage);
            return;
        }

        // Create a card for each existing assignment
        result.assignments.forEach((assignment) => {
            const card = document.createElement("div");
            card.className = "text-item";

            const title = document.createElement("h3");
            title.textContent = assignment.title;

            const code = document.createElement("p");
            code.textContent = "Join Code: " + assignment.code;

            const instructions = document.createElement("p");
            instructions.textContent = assignment.instructions;

            card.append(title, code, instructions);
            assignmentBlock.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading assignments:", error);
        assignmentBlock.textContent =
            "Unable to load assignments. Please refresh the page.";
    }
}

// ------------------------------------
// 2. Publish a new assignment
// ------------------------------------

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

        // Display the success message
        statusMessage.textContent = result.message;
        statusMessage.style.color = "green";

        // Display the join code for the newly published assignment
        assignmentCode.textContent = result.assignment.code;
        publishedTitle.textContent = result.assignment.title;
        publishedAssignment.hidden = false;

        // Clear the form after successful publishing
        assignmentForm.reset();

        // Refresh the assignment list from the server
        await loadAssignments();

    } catch (error) {
        statusMessage.textContent = error.message;
        statusMessage.style.color = "red";

        console.error("Error publishing assignment:", error);
    }
});

// ------------------------------------
// 3. Load assignments when page opens
// ------------------------------------

loadAssignments();
