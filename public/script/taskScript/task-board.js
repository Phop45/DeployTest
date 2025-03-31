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


// filter section
document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = "<%= user._id %>"; // Current user ID from the server
  const clearFilter = document.getElementById("clearFilter");
  const filterText = document.getElementById("filterText");

  // Check for filters in the URL and show/hide the clearFilter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("filter")) {
    clearFilter.style.display = "block";
  } else {
    clearFilter.style.display = "none";
  }

  // Filter tasks assigned to the current user
  const assignToMeBtn = document.getElementById("assignToMe");
  if (assignToMeBtn) {
    assignToMeBtn.addEventListener("click", () => {
      const filterTasks = () => {
        document.querySelectorAll(".task.task-item").forEach(task => {
          const assignedUsers = Array.from(task.querySelectorAll(".userProfile img"));
          task.style.display = assignedUsers.some(user => user.dataset.userId === currentUserId)
            ? "block"
            : "none";
        });
      };

      // Initial filtering
      filterTasks();

      // Observe task list for changes and reapply the filter dynamically
      const taskBoard = document.querySelector(".board-container"); // Replace with your task board's container
      const observer = new MutationObserver(() => {
        filterTasks(); // Reapply the filter whenever a change is detected
      });

      // Start observing the task board for DOM changes
      observer.observe(taskBoard, { childList: true, subtree: true });

      // Highlight the active filter
      document.querySelectorAll(".filterItemWrap").forEach(item => item.classList.remove("active"));
      assignToMeBtn.classList.add("active");
    });
  }

  // Filter tasks due this week
  const dueDateWeekBtn = document.getElementById("dueDateWeek");
  if (dueDateWeekBtn) {
    dueDateWeekBtn.addEventListener("click", () => {
      window.location.href = '?filter=dueThisWeek';
    });
  }

  // Filter tasks by priority
  document.querySelectorAll('.priItemOprion').forEach(item => {
    item.addEventListener('click', function () {
      const priority = this.getAttribute("data-label");
      window.location.href = `?filter=priority&priority=${priority}`;

      // Highlight active priority filter
      document.querySelectorAll('.priItemOprion').forEach(option => option.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Filter tasks by assignee
  document.querySelectorAll('.assignee-profile').forEach(item => {
    item.addEventListener('click', function () {
      const assigneeId = this.getAttribute("data-assignee-id");
      window.location.href = `?filter=assignee&assigneeId=${assigneeId}`;

      // Highlight active collaborator
      document.querySelectorAll('.assignee-profile').forEach(option => option.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Highlight active filter (assignToMe, dueDateWeek, priorities, assignees)
  const filter = urlParams.get("filter");
  const priority = urlParams.get("priority");
  const assigneeId = urlParams.get("assigneeId");

  if (filter === "assignToMe") {
    filterText.textContent = "มอบหมายให้ฉัน";
  } else if (filter === "dueThisWeek") {
    filterText.textContent = "ครบกำหนดอาทิตย์นี้";
  } else if (priority) {
    if (priority === "urgent") {
      filterText.textContent = "ความสำคัญ: ด่วน";
    } else if (priority === "normal") {
      filterText.textContent = "ความสำคัญ: ปกติ";
    } else if (priority === "low") {
      filterText.textContent = "ความสำคัญ: ต่ำ";
    }
  } else if (assigneeId) {
    const assigneeProfile = document.querySelector(`.assignee-profile[data-assignee-id="${assigneeId}"]`);
    if (assigneeProfile) {
      const assigneeName = assigneeProfile.querySelector(".customTooltip")?.textContent || "ผู้รับมอบหมาย";
      filterText.textContent = `ผู้รับมอบหมาย: ${assigneeName}`;
    }
  } else {
    filterText.textContent = "กรองข้อมูล";
  }

  if (filter === "assignToMe") {
    const assignToMeElement = document.querySelector(".assignToMe");
    assignToMeElement.classList.add("active");
    const checkIcon = assignToMeElement.querySelector(".check-icon");
    if (checkIcon) {
      checkIcon.style.display = "inline";
    }
  }
  else if (filter === "dueThisWeek") {
    const dueDateWeekElement = document.querySelector(".dueDateWeek");
    dueDateWeekElement.classList.add("active");
    const checkIcon = dueDateWeekElement.querySelector(".check-icon");
    if (checkIcon) {
      checkIcon.style.display = "inline";
    }
  }
  else if (priority) {
    document.querySelectorAll(".priItemOprion").forEach(option => {
      if (option.getAttribute("data-label") === priority) {
        option.classList.add("active");
      }
    });
  }
  else if (assigneeId) {
    document.querySelectorAll(".assignee-profile").forEach(profile => {
      if (profile.getAttribute("data-assignee-id") === assigneeId) {
        const assigneeImage = profile.querySelector(".assigneeImage");
        const fallbackProfile = profile.querySelector(".fallback-profile-filter");

        // Add active class to both assigneeImage and fallback-profile-filter
        if (assigneeImage) assigneeImage.classList.add("active");
        if (fallbackProfile) fallbackProfile.classList.add("active");
      }
    });
  }
  else if (filter === "unAssign") {
    filterText.textContent = "ไม่มีผู้รับมอบหมาย";
    const unAssignElement = document.querySelector(".unAssign");
    unAssignElement.classList.add("active");
    const checkIcon = unAssignElement.querySelector(".check-icon");
    if (checkIcon) {
      checkIcon.style.display = "inline";
    }
  }
});

// filter trigger
document.addEventListener("DOMContentLoaded", () => {
  const filterToggle = document.querySelector(".filterToggle");
  const filterDropdown = document.querySelector(".filterDropdown");

  if (filterToggle && filterDropdown) {
    filterToggle.addEventListener("click", () => {
      // Toggle the active class to show/hide the dropdown
      filterDropdown.classList.toggle("active");

      // Position the dropdown dynamically under the toggle
      const toggleRect = filterToggle.getBoundingClientRect();
    });

    // Hide the dropdown when clicking outside of it
    document.addEventListener("click", (event) => {
      if (!filterToggle.contains(event.target) && !filterDropdown.contains(event.target)) {
        filterDropdown.classList.remove("active");
      }
    });
  }
});


// drag and drop
// drag and drop
document.addEventListener('DOMContentLoaded', () => {
  // Handle drag start for task items
  document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
  });

  // Handle dragover and drop for columns
  document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
  });

  let draggedTask = null;

  // Handle drag start
  function handleDragStart(event) {
    draggedTask = event.target;
    event.dataTransfer.setData("text/plain", draggedTask.dataset.id);
  }

  // Allow dragover to enable dropping
  function handleDragOver(event) {
    event.preventDefault();
  }

  // Handle drop with role-based logic
  async function handleDrop(event) {
    event.preventDefault();

    if (!draggedTask) return;

    const taskId = draggedTask.dataset.id;
    const currentStatus = draggedTask.dataset.status;
    const targetStatus = event.currentTarget.dataset.status;
    const userRole = event.currentTarget.dataset.role;

    if (!taskId || !currentStatus || !targetStatus || !userRole) {
      console.error("Missing required data attributes for drag-and-drop.");
      return;
    }

    const taskHasIncompleteSubtasks = await checkIncompleteSubtasks(taskId);

    let confirmationMessage = "";
    let newStatus = targetStatus;
    let markSubtasksCompleted = false;

    if (userRole === 'owner' || userRole === 'reporter') {
      if (newStatus === 'finished') {
        confirmationMessage = `คุณต้องการเปลี่ยนสถานะของงานและงานย่อยทั้งหมดเป็นเสร็จสิ้นหรือไม่?`; // "Do you want to mark the task and all subtasks as finished?"
        markSubtasksCompleted = true;
      } else {
        confirmationMessage = "คุณต้องการเปลี่ยนสถานะของงานหรือไม่?";
      }
      showAlert(confirmationMessage, taskId, newStatus, markSubtasksCompleted);
    } 
    else if (userRole === "member") {
      if (currentStatus === "inProgress" && targetStatus !== "inProgress") {
        newStatus = "pending";
        markSubtasksCompleted = true;
      } else if (
        (currentStatus === "pending" || currentStatus === "fix") &&
        targetStatus === "finished"
      ) {
        newStatus = "pending";
        markSubtasksCompleted = true;
      } else if (
        (currentStatus === "pending" || currentStatus === "fix") &&
        targetStatus === "inProgress"
      ) {
        confirmationMessage = "คุณต้องการยกเลิกการส่งงานใช่หรือไม่";
        showAlert(confirmationMessage, taskId, targetStatus, false);
        return;
      }
  
      if (currentStatus === newStatus) return;
  
      if (taskHasIncompleteSubtasks.hasIncompleteSubtasks) {
        confirmationMessage = `<span>คุณยังมีงานย่อยอีก <span id="incompleteCount">${taskHasIncompleteSubtasks.incompleteCount} งาน</span> ที่ยังไม่เสร็จสิ้น</span>` + 
                              `<span>ต้องการทำงานย่อยทั้งหมดให้เสร็จสมบูรณ์แล้ว และส่งงานนี้หรือไม่</span>`;
        markSubtasksCompleted = true;
      } else {
        confirmationMessage = "คุณแน่ใจว่าต้องการส่งงานนี้หรือไม่?";
      }
  
      showAlert(
        confirmationMessage,
        taskId,
        newStatus,
        taskHasIncompleteSubtasks,
        markSubtasksCompleted
      );
    }
  }

  // Check if the task has incomplete subtasks
  async function checkIncompleteSubtasks(taskId) {
    try {
      const response = await fetch(`/task/${taskId}/check-subtasks`);
      const data = await response.json();
  
      // Ensure the response contains the expected fields
      return {
        hasIncompleteSubtasks: data.hasIncompleteSubtasks || false,
        incompleteCount: data.incompleteCount || 0
      };
    } catch (error) {
      console.error("Failed to check subtasks:", error);
      return { hasIncompleteSubtasks: false, incompleteCount: 0 };
    }
  }

  // Show custom alert popup with dynamic message
  function showAlert(message, taskId, newStatus, taskHasIncompleteSubtasks, markSubtasksCompleted) {
      // Set dynamic message for the alert popup with HTML content
      document.getElementById('alertMessage').innerHTML = message;

      // Display alert and overlay
      document.querySelector('.alertPopup').classList.add('show');
      document.getElementById('overlay').classList.add('show-overlay');

      // Cancel button handler
      document.getElementById('cancelBtn').addEventListener('click', () => {
          closeAlert();
      });

      // Confirm button handler
      document.getElementById('confirmBtn').addEventListener('click', () => {
          updateTaskStatus(taskId, newStatus, taskHasIncompleteSubtasks, markSubtasksCompleted);
          closeAlert();
      });

      // Close the alert when the close icon is clicked
      document.getElementById('closeAlert').addEventListener('click', () => {
          closeAlert();
      });
  }


  // Close the alert popup and remove overlay
  function closeAlert() {
    document.querySelector('.alertPopup').classList.remove('show');
    document.getElementById('overlay').classList.remove('show-overlay');
  }

  async function updateTaskStatus(taskId, newStatus, markSubtasksCompleted) {
    try {
      const response = await fetch(`/task/${taskId}/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newStatus,
          markSubtasksCompleted,
        }),
      });

      if (response.ok) {
        console.log("Task and subtasks updated successfully.");
        location.reload();
      } else {
        alert("Failed to update task status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("An error occurred. Please try again.");
    }
  }
});