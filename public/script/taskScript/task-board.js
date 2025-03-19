const newTaskBtn = document.getElementById('new-task-btn');
const sidebarPopup = document.getElementById('sidebar-popup');
const closeTaskBtn = document.getElementById('close-task-btn');
const overlay = document.getElementById('overlay');

newTaskBtn.addEventListener('click', (event) => {
  event.preventDefault();
  sidebarPopup.classList.add('show-sidebar');
  overlay.classList.add('show-overlay');
});

closeTaskBtn.addEventListener('click', () => {
  sidebarPopup.classList.remove('show-sidebar');
  overlay.classList.remove('show-overlay');
});

overlay.addEventListener('click', () => {
  sidebarPopup.classList.remove('show-sidebar');
  overlay.classList.remove('show-overlay');
});

function clearFields() {
  document.querySelector('.add-form').reset();
}

function validateForm() {
  var taskName = document.getElementById("taskName").value;

  if (taskName.trim() === "" || !isAlphanumeric(taskName.charAt(0))) {
    document.getElementById("notiAlert").style.display = "block";
    return false;
  }
  return true;
}
function isAlphanumeric(char) {
  return /^[a-zA-Z0-9ก-๙]+$/.test(char);
}
document.getElementById("taskName").addEventListener("focus", function () {
  document.getElementById("notiAlert").style.display = "none";
});
document.addEventListener('DOMContentLoaded', function () {
  const dueDateInput = document.getElementById('dueDate');

  // Function to format the date to "day month" in Thai
  function formatDateToThai(date) {
    const options = { day: 'numeric', month: 'long' };
    return new Date(date).toLocaleDateString('th-TH', options);
  }

  // Event listener for when the user selects a date
  dueDateInput.addEventListener('change', function () {
    const selectedDate = this.value;
    if (selectedDate) {
      // Update the placeholder with the formatted date
      this.placeholder = formatDateToThai(selectedDate);
    }
  });
});

async function confirmDeleteTask(taskId, spaceId) {
  try {
    // Fetch the number of subtasks for the task
    const response = await fetch(`/task/getSubtaskCount/${spaceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: [taskId] }) // Pass taskIds as an array
    });

    const data = await response.json();
    const subtaskCount = data.subtaskCount || 0;

    // Show confirmation alert with subtask count
    const confirmMessage = `คุณต้องการลบงานนี้หรือไม่? งานนี้มี ${subtaskCount} งานย่อยที่จะถูกลบด้วย`;

    if (confirm(confirmMessage)) {
      // Proceed with deletion if confirmed
      const deleteResponse = await fetch(`/task/deleteTasks/${spaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [taskId] }) // Pass taskIds as an array
      });

      if (deleteResponse.ok) {
        alert('งานและงานย่อยถูกลบเรียบร้อยแล้ว');
        location.reload(); // Reload the page to reflect changes
      } else {
        const errorData = await deleteResponse.json();
        alert(`ไม่สามารถลบงานได้: ${errorData.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาด');
  }
}

function filterTasks() {
  const input = document.getElementById("filterTaskInput").value.toLowerCase();
  const taskItems = document.querySelectorAll(".task-item");

  taskItems.forEach((taskItem) => {
    const taskName = taskItem.querySelector(".taskname").innerText.toLowerCase();

    if (taskName.includes(input)) {
      taskItem.style.display = ""; // Show the task
    } else {
      taskItem.style.display = "none"; // Hide the task
    }
  });

  // Update counts for each status column
  const statusCategories = ['toDo', 'inProgress', 'fix', 'finished'];
  statusCategories.forEach((status) => {
    const columnTasks = document.querySelectorAll(`#tasks-${status} .task-item:not([style*="display: none"])`);
    const countElement = document.querySelector(`[data-status-count="${status}"]`);
    if (countElement) {
      countElement.innerText = columnTasks.length;
    }
  });
}


function showInputForm(triggerElement) {
  const form = triggerElement.nextElementSibling; // The form is the next sibling
  const triggerAdd = triggerElement; // The clicked triggerAdd

  // Show the form and hide triggerAdd
  form.style.display = "block";
  triggerAdd.style.display = "none";

  // Automatically focus on the input field
  const inputField = form.querySelector("#underInput");
  if (inputField) {
    inputField.focus();
  }

  // Add a listener to detect clicks outside the form
  document.addEventListener("click", handleClickOutsideForm);

  function handleClickOutsideForm(event) {
    if (!form.contains(event.target) && event.target !== triggerAdd) {
      // Hide the form and show triggerAdd if clicking outside
      form.style.display = "none";
      triggerAdd.style.display = "block";

      // Remove the click listener
      document.removeEventListener("click", handleClickOutsideForm);
    }
  }
}


// Submit the form when the Enter key is pressed
function submitForm(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.target.submit();
  }
}

// Prevent Enter key submission while in the input field
const inputField = document.querySelector('input[name="taskName"]');
inputField.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    inputField.form.submit(); // Submit the form when Enter is pressed
  }
});

function toggleTagDropdown(taskId) {
  const dropdown = document.getElementById(`tag-dropdown-${taskId}`);
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
  }
}

function getRandomPastelColor() {
  const hue = Math.floor(Math.random() * 360);
  const pastel = `hsl(${hue}, 100%, 85%)`;
  return pastel;
}

document.addEventListener('DOMContentLoaded', function () {
  const tags = document.querySelectorAll('.tag');
  tags.forEach(tag => {
    tag.style.backgroundColor = getRandomPastelColor();
  });

  const categoryToggle = document.querySelector('#categoryToggle');
  const categoryDropdown = document.querySelector('#categoryDropdown');
  const currentCategory = document.querySelector('#currentCategory');
  const categoryInput = document.querySelector('#category');

  categoryToggle.addEventListener('click', function () {
    categoryDropdown.style.display = categoryDropdown.style.display === 'none' ? 'block' : 'none';
  });

  categoryDropdown.addEventListener('click', function (event) {
    const selectedOption = event.target.closest('.category-option');
    if (selectedOption) {
      const selectedCategory = selectedOption.getAttribute('data-category');
      currentCategory.textContent = selectedOption.textContent;
      categoryInput.value = selectedCategory;
      categoryDropdown.style.display = 'none';
    }
  });
});