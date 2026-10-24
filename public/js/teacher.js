const assignmentblock = document.getElementById("assignmentblock");
const textInput = document.getElementById("textInput");
const addBtn = document.getElementById("addBtn");

function addText() {
  const textValue = textInput.value.trim();

  if (textValue !== "") {
    const newItem = document.createElement("div");
    newItem.classList.add("text-item");
    newItem.textContent = textValue;

    assignmentblock.appendChild(newItem);
    textInput.value = "";
    assignmentblock.scrollTop = assignmentblock.scrollHeight;
  }
}

addBtn.addEventListener("click", addText);

textInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    addText();
  }
});
