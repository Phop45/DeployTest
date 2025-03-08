// Close button event ✅
document.getElementById('close_btn').addEventListener('click', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const spacesId = urlParams.get('spacesId');
    window.location.href = `/space/item/${spacesId}/task_list`;
});

// detail Full View Toggles ✅
document.addEventListener('DOMContentLoaded', () => {
    const fullPageView = document.getElementById('fullPageView');
    const openButton = document.querySelector('.description-box .expand-icon');
    const closeButton = document.querySelector('.full-page-view .back-button button');

    function closeFullView() {
        fullPageView.classList.remove('show');
        setTimeout(() => {
            fullPageView.style.display = 'none';
        }, 300);
    }

    function openFullView() {
        fullPageView.style.display = 'block';
        requestAnimationFrame(() => {
            fullPageView.classList.add('show');
        });
    }

    // Event listeners
    if (openButton) {
        openButton.addEventListener('click', openFullView);
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeFullView);
    }
});

// Task Name Update ✅
document.addEventListener('DOMContentLoaded', function () {
    const taskNameText = document.getElementById("taskName-text");
    const taskNameInput = document.getElementById("taskName");
    const saveButton = document.getElementById("saveButton");
    const cancelButton = document.getElementById("cancelButton");
    const notiAlert = document.getElementById("notiAlert");
    const updateForm = document.getElementById("updateName");

    let originalTaskName = taskNameText.textContent.trim();

    if (!updateForm) {
        console.error("Update form not found");
        return;
    }

    // Show input field on task name click
    taskNameText.addEventListener("click", function () {
        taskNameText.style.display = "none";
        taskNameInput.style.display = "block";
        saveButton.style.display = "inline-block";
        cancelButton.style.display = "inline-block";
        taskNameInput.focus();
    });

    // Handle typing in taskName input
    taskNameInput.addEventListener("input", function () {
        taskNameInput.style.color = "#000"; // Change color to black when typing
    });

    // Cancel editing task name
    cancelButton.addEventListener("click", function () {
        taskNameInput.style.display = "none";
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        notiAlert.style.display = "none"; // Hide alert if visible
        taskNameText.style.display = "block";
        taskNameInput.value = originalTaskName; // Reset input value to original text
        taskNameInput.style.color = "#757678"; // Reset color
    });

    // Save task name on Enter key press
    taskNameInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveTaskName();
        }
    });

    // Save task name on button click
    saveButton.addEventListener("click", function (event) {
        event.preventDefault();
        saveTaskName();
    });

    async function saveTaskName() {
        const taskName = taskNameInput.value.trim();

        // If task name hasn't changed, revert to original display
        if (taskName === originalTaskName) {
            taskNameInput.style.display = "none";
            saveButton.style.display = "none";
            cancelButton.style.display = "none";
            taskNameText.style.display = "block";
            notiAlert.style.display = "none";
            return;
        }

        const taskIdElement = updateForm.querySelector("#taskId");

        if (!taskIdElement) {
            console.error("Task ID element not found");
            return;
        }

        const taskId = taskIdElement.value;

        // Validate input
        if (taskName === "" || !isAlphanumeric(taskName)) {
            notiAlert.style.display = "block";
            return;
        }

        // Send update request via fetch
        try {
            const response = await fetch(`/updateName`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ taskId, taskName }),
            });

            if (response.status === 200) {
                location.reload(); 
            } else {
                const errorMessage = await response.text();
                console.error("Error:", errorMessage);
                notiAlert.style.display = "block";
                notiAlert.textContent = errorMessage;
            }
        } catch (error) {
            console.error("Error:", error);
            notiAlert.style.display = "block";
            notiAlert.textContent = "An error occurred while updating the task.";
        }
    }

    // Helper: Check if input is alphanumeric
    function isAlphanumeric(text) {
        return /^[a-zA-Z0-9ก-๙\s]+$/.test(text);
    }
});

//status setion ✅
document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.querySelector('.status-div');
    const dropdownContent = document.querySelector('.dropdown-content');
    const statusText = document.querySelector('.status-text');

    // Mapping statuses to Thai
    const statusMapping = {
        toDo: 'ยังไม่ได้ทำ',
        inProgress: 'กำลังทำ',
        fix: 'แก้ไข',
        finished: 'เสร็จสิ้น',
    };

    // Mapping statuses to colors
    const statusColors = {
        toDo: '#919191',
        inProgress: '#6EACDA',
        fix: '#FF4C4C',
        finished: '#4CAF50',
    };

    // Function to apply styles based on status
    const applyStatusStyles = (status) => {
        const color = statusColors[status] || '#FFFFFF';
        statusDiv.style.backgroundColor = color;
        statusDiv.style.color = '#FFFFFF'; // Ensure text contrast
    };

    // Function to update status text to Thai
    const updateStatusText = (status) => {
        statusText.textContent = statusMapping[status] || status;
    };

    // Initial setup for status display
    const initialStatus = statusDiv.getAttribute('data-status');
    applyStatusStyles(initialStatus);
    updateStatusText(initialStatus);

    const toggleDropdown = () => {
        dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
    };

    // Toggle dropdown visibility
    statusDiv.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent event bubbling
        toggleDropdown();
    });

    // Hide the dropdown if clicked outside of it
    document.addEventListener('click', (event) => {
        if (!statusDiv.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Handle status change
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', function (event) {
            event.preventDefault();
            const newStatus = this.getAttribute('data-status');
            const taskId = statusDiv.getAttribute('data-task-id');

            fetch(`/updateTaskStatus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, newStatus }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update the UI with the new status
                        statusDiv.setAttribute('data-status', newStatus);
                        applyStatusStyles(newStatus);
                        updateStatusText(newStatus);
                        dropdownContent.style.display = 'none'; // Close the dropdown

                        // Optionally refresh the page on success
                        window.location.reload();
                    } else {
                        alert(data.message || 'Failed to update status');
                    }
                })
                .catch(error => {
                    console.error('Error during fetch:', error);
                    alert('An unexpected error occurred.');
                });
        });
    });

    // Apply background color to activity log statuses
    const applyActivityLogStyles = () => {
        const statusElements = document.querySelectorAll('.previous-status, .new-status');
        statusElements.forEach(element => {
            const status = element.dataset.status; // Retrieve the data-status attribute
            const color = statusColors[status] || '#FFFFFF'; // Default to white if no match
            element.style.backgroundColor = color;
            element.style.display = 'inline-block'; 
            element.style.padding = '5px 10px';
            element.style.borderRadius = '5px'; 
            element.style.textAlign = 'center'; 
            element.style.color = '#FFFFFF'; 
        });
    };

    // Apply styles to activity log statuses
    applyActivityLogStyles();
});

// pripriority section ✅
document.addEventListener('DOMContentLoaded', () => {
    const priorityDiv = document.querySelector('.priority-div');
    const dropdownContent = document.querySelector('#priority-dropdown-content');
    
    const priorityMapping = {
        urgent: { color: '#DE350B', icon: 'fa-angles-up', text: 'ด่วน', textColor: '#DE350B' },
        normal: { color: '#FFAB00', icon: 'fa-grip-lines', text: 'ปกติ', textColor: '#FFAB00' },
        low: { color: '#4C9AFF', icon: 'fa-angle-down', text: 'ต่ำ', textColor: '#4C9AFF' },
    };

    // Show dropdown when clicked
    priorityDiv.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
    });

    // Hide dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!priorityDiv.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Handle priority selection
    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', async function (e) {
            e.preventDefault();

            const selectedPriority = this.getAttribute('data-priority');
            const taskId = priorityDiv.getAttribute('data-task-id');

            // Update the displayed priority text, color, and icon
            const priorityData = priorityMapping[selectedPriority];
            document.querySelector('.priority-text').innerHTML = `
                <i class="fa ${priorityData.icon}"></i>
                <span style="color: ${priorityData.textColor};">${priorityData.text}</span>
            `;

            try {
                const response = await fetch('/updateTaskPriority', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId, taskPriority: selectedPriority }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                dropdownContent.style.display = 'none';
                const data = await response.json();
                if (data.success) {
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error updating task priority:', error);
            }
        });
    });
});

// due date section ✅
document.addEventListener('DOMContentLoaded', function () {
    // Function to format date to Thai format
    function formatDateToThai(date) {
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist year

        return `${day} ${month} ${year}`;
    }

    // Initialize Flatpickr when clicking on the dueDateText
    document.getElementById('dueDateText').addEventListener('click', function () {
        const dueDateInput = document.getElementById('dueDateInput');

        flatpickr(dueDateInput, {
            locale: "th", // Use Thai locale
            dateFormat: "Y-m-d", // Date format for the input value
            minDate: "today", // Prevent selection of past dates
            onChange: function (selectedDates, dateStr) {
                const selectedDate = new Date(dateStr);
                document.getElementById('dueDateText').innerText = formatDateToThai(selectedDate); // Update display
                dueDateInput.value = dateStr; // Set the hidden input's value
                updateDueDate(dateStr); // Send the new due date to the server
            }
        });

        // Open the date picker
        dueDateInput._flatpickr.open();
    });

    // Function to send updated due date to server and log activity
    async function updateDueDate(dueDateValue) {
        const taskId = document.querySelector('input[name="taskId"]').value;
        const selectedDate = new Date(dueDateValue);
        const currentDate = new Date();

        // Remove time part from both dates for accurate comparison
        selectedDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        // Check if the selected date is tomorrow
        const isTomorrow = selectedDate.getTime() === new Date(currentDate.getTime() + 86400000).getTime();
        let logMessage = '';

        if (isTomorrow) {
            logMessage = 'วันครบกำหนดของงานถูกเปลี่ยนเป็นวันพรุ่งนี้';
        } else {
            // Format the due date to Thai format for the activity log
            const formattedDueDate = formatDateToThai(selectedDate);
            logMessage = `วันครบกำหนดของงานถูกเปลี่ยนเป็น ${formattedDueDate}`;
        }

        try {
            const response = await fetch('/updateDueDate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ taskId, dueDate: dueDateValue, logMessage }),
            });

            if (!response.ok) {
                throw new Error('Failed to update due date');
            }

            // Auto-refresh the page on success
            window.location.reload();  
        } catch (error) {
            console.error(error);
            alert('Error updating due date. Please try again.');
        }
    }
});

// due time section ✅
document.addEventListener('DOMContentLoaded', () => {
    const dueTimeSelect = document.getElementById('dueTimeSelect');
    const dueTimeForm = document.getElementById('updateDueTimeForm');

    dueTimeSelect.addEventListener('change', async () => {
        const selectedTime = dueTimeSelect.value;

        try {
            const response = await fetch(dueTimeForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskId: dueTimeForm.querySelector('input[name="taskId"]').value,
                    dueTime: selectedTime,
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Reload the page to reflect the changes
                window.location.reload();
            } else {
                console.error('Failed to update due time:', result.message);
                alert('Error updating due time. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating due time. Please try again.');
        }
    });
});

// tags section ✅
document.addEventListener("DOMContentLoaded", () => {
    const tagsDisplay = document.getElementById("tagsDisplay");
    const tagsManagementModal = document.getElementById("tagsManagementModal");

    // Function to toggle the modal's visibility
    const toggleModal = () => {
        if (tagsManagementModal.style.display === "block") {
            tagsManagementModal.style.display = "none"; // Hide modal
        } else {
            tagsManagementModal.style.display = "block"; // Show modal
        }
    };

    // Show or hide the modal when clicking `tagsDisplay`
    tagsDisplay.addEventListener("click", toggleModal);

    // Close the modal when clicking outside it
    window.addEventListener("click", (event) => {
        if (
            !tagsDisplay.contains(event.target) && // Not the tagsDisplay
            !tagsManagementModal.contains(event.target) // Not inside the modal
        ) {
            tagsManagementModal.style.display = "none"; // Hide modal
        }
    });

    // Prevent modal from closing when interacting inside
    tagsManagementModal.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent click propagation
    });

    const newTagInput = document.getElementById("newTagInput");
    const allTagsContainer = document.getElementById("allTagsContainer");
    const showTaskTags = document.querySelector(".showTaskTags");
    const visibleTagsContainer = document.querySelector(".visible-tags");
    const extraTagsIndicator = document.getElementById("extraTagsIndicator");

    const taskId = document.getElementById('task-id').dataset.taskId; 

    // Function to get a random pastel color
    function getRandomPastelColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.random() * 10; // Saturation between 70-80
        const lightness = 85 + Math.random() * 10; // Lightness between 85-95
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // Function to create a new tag
    const createNewTag = async () => {
        const tagName = newTagInput.value.trim();

        if (!tagName) {
            alert("Please enter a tag name.");
            return;
        }

        const tagColor = getRandomPastelColor();

        try {
            const response = await fetch(`/tags/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: tagName,
                    color: tagColor,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                const newTag = result.tag;

                // Add the new tag to the available tags container
                const tagItem = document.createElement("span");
                tagItem.classList.add("tag-item");
                tagItem.style.backgroundColor = newTag.color;
                tagItem.dataset.id = newTag._id;
                tagItem.dataset.tagName = newTag.name.toLowerCase();
                tagItem.innerText = newTag.name;

                allTagsContainer.appendChild(tagItem);
                newTagInput.value = ""; // Clear the input
                console.log("New tag created:", newTag);
            } else {
                console.error("Failed to create tag:", result.message);
            }
        } catch (error) {
            console.error("Error creating tag:", error);
        }
    };

    const createAndAddTagToTask = async (tagName, taskId) => {
        if (!tagName) {
            alert("Please enter a tag name.");
            return;
        }
    
        const tagColor = getRandomPastelColor();
    
        try {
            const response = await fetch(`/tasks/add-tags/${taskId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tags: [
                        {
                            tagName: tagName,
                            color: tagColor,
                        },
                    ],
                }),
            });
    
            const result = await response.json();
    
            if (response.ok) {
                console.log("Tag created and added to task:");
                const tagElement = document.createElement("span");
                tagElement.classList.add("tag-item");
                tagElement.style.backgroundColor = tagColor;
                tagElement.innerText = tagName;
    
                // Create the remove button
                const removeButton = document.createElement("i");
                removeButton.classList.add("fa-solid", "fa-xmark", "remove-tag");
                tagElement.appendChild(removeButton);
    
                // Append the tag to showTaskTags
                showTaskTags.appendChild(tagElement);
    
                // Add the tag to allTagsContainer if it doesn't exist already
                const allTags = allTagsContainer.querySelectorAll(".tag-item");
                const tagExists = [...allTags].some(tag => tag.dataset.tagName === tagName.toLowerCase());
    
                if (!tagExists) {
                    const tagItem = document.createElement("span");
                    tagItem.classList.add("tag-item");
                    tagItem.style.backgroundColor = tagColor; // Use the same color
                    tagItem.dataset.id = result.tag._id;
                    tagItem.dataset.tagName = result.tag.name.toLowerCase();
                    tagItem.innerText = result.tag.name;
    
                    allTagsContainer.appendChild(tagItem);
                }
    
                // Clear the input field
                newTagInput.value = "";
                console.log("New tag added to UI:", tagName);
            } else {
                console.error("Failed to create and add tag:", result.message);
            }
        } catch (error) {
            console.error("Error creating and adding tag:", error);
        }
    };
    
    // Listen for the Enter key to create and add the tag
    newTagInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const tagName = newTagInput.value.trim();

            // Create and add the tag to the task
            createAndAddTagToTask(tagName, taskId);

            // Clear the input field after adding the tag
            newTagInput.value = "";

            // Reset the real-time search logic to show all tags again
            resetTagSearch();
        }
    });

    // Real-time search for tags
    newTagInput.addEventListener("input", () => {
        const searchValue = newTagInput.value.toLowerCase(); // Get the input value and convert to lowercase
    
        // Get all tag elements in the container
        const tagItems = allTagsContainer.querySelectorAll(".tag-item");
    
        tagItems.forEach(tag => {
            const tagName = tag.dataset.tagName; // Get the tag's name from the data attribute
    
            // Show or hide tags based on whether their name includes the search value
            if (tagName.includes(searchValue)) {
                tag.style.display = "inline-block"; // Show the tag
            } else {
                tag.style.display = "none"; // Hide the tag
            }
        });
    });

    const resetTagSearch = () => {
        // Get all tag elements in the container
        const tagItems = allTagsContainer.querySelectorAll(".tag-item");
    
        tagItems.forEach(tag => {
            tag.style.display = "inline-block"; // Ensure all tags are visible again
        });
    };

    // Function to update the visible tags display
    const updateVisibleTags = () => {
        if (!visibleTagsContainer || !extraTagsIndicator) {
            console.error("Error: visibleTagsContainer or extraTagsIndicator is not defined.");
            return;
        }

        const taskTags = [...showTaskTags.children].map(tag => ({
            tagName: tag.dataset.tagName || tag.innerText.trim(),
            color: tag.style.backgroundColor,
        }));

        visibleTagsContainer.innerHTML = '';
        const visibleTags = taskTags.slice(0, 3);
        visibleTags.forEach(tag => {
            const tagElement = document.createElement("span");
            tagElement.classList.add("tag-item");
            tagElement.style.backgroundColor = tag.color;
            tagElement.innerText = tag.tagName;

            visibleTagsContainer.appendChild(tagElement);
        });

        const extraTagsCount = taskTags.length - 3;
        extraTagsIndicator.innerText = extraTagsCount > 0 ? `+${extraTagsCount}` : '';
    };

    // Handle tag selection (on click)
    allTagsContainer.addEventListener("click", async (e) => {
        if (e.target && e.target.classList.contains("tag-item")) {
            const tagElement = e.target;
            const tagName = tagElement.innerText.trim();
            const tagColor = tagElement.style.backgroundColor;
            const tagID = tagElement.dataset.id;

            console.log("Tag clicked:", tagName, tagColor, tagID);
            console.log("Task ID:", taskId);

            // Check if the tag already exists in `showTaskTags`
            const taskTags = [...showTaskTags.children].map(tag => tag.dataset.tagName || tag.innerText.trim());
            if (!taskTags.includes(tagName)) {
                const tagSpan = document.createElement("span");
                tagSpan.classList.add("tag-item");
                tagSpan.style.backgroundColor = tagColor;
                tagSpan.dataset.tagName = tagName;
                tagSpan.dataset.id = tagID;
                tagSpan.innerText = tagName;

                const removeButton = document.createElement("i");
                removeButton.classList.add("fa-solid", "fa-xmark", "remove-tag");
                tagSpan.appendChild(removeButton);

                showTaskTags.appendChild(tagSpan);
                console.log("Added tag to task:", tagName);
                
                tagElement.remove();
                updateVisibleTags();

                try {
                    const response = await fetch(`/tasks/add-tags/${taskId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            tags: [{
                                _id: tagID,
                                tagName: tagName,
                                color: tagColor,
                            }],
                        }),
                    });

                    const result = await response.json();
                } catch (error) {
                    console.error("Error adding tag:", error);
                }
            } else {
                console.log("Tag is already added to the task.");
            }
        }
    });

    // Handle tag removal (on click of the "X" icon)
    showTaskTags.addEventListener("click", async (e) => {
        if (e.target && e.target.classList.contains("remove-tag")) {
            const tagElement = e.target.closest(".tag-item");
            const tagID = tagElement.dataset.id;
            const tagName = tagElement.innerText;
            const tagColor = tagElement.style.backgroundColor;

            console.log("Removing tag:", tagName);

            // Remove tag from task in UI
            tagElement.remove();

            // Update the visible tags display
            updateVisibleTags();

            try {
                const response = await fetch(`/tasks/remove-tag/${taskId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tagId: tagID
                    }),
                });

                const result = await response.json();
                console.log("Tag removed from task:", result);

                // Optionally: Add the removed tag back to the available tags list
                const allTags = document.querySelectorAll("#allTagsContainer .tag-item");
                const tagAlreadyExists = [...allTags].some(tag => tag.dataset.id === tagID);

                if (!tagAlreadyExists) {
                    // Create a tag element and append it to the available tags container
                    const tagItem = document.createElement("span");
                    tagItem.classList.add("tag-item");
                    tagItem.style.backgroundColor = tagColor; // Use the same color
                    tagItem.dataset.id = tagID;
                    tagItem.innerText = tagName;

                    allTagsContainer.appendChild(tagItem);
                    console.log("Tag added back to the available tags list");
                }
            } catch (error) {
                console.error("Error removing tag:", error);
            }
        }
    });

    // Handle creating a new tag when the button is clicked
    const createTagButton = document.getElementById("createTagButton");
    createTagButton.addEventListener("click", createNewTag);
});

// User section
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchAssigned');
    const assignedItems = document.querySelectorAll('.assigned-item');
    const allAssignedContainer = document.getElementById("allAssignedContainer");

    // Search functionality for assigned users
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        assignedItems.forEach(item => {
            const username = item.querySelector('#assignedName').textContent.toLowerCase();
            const email = item.querySelector('#assignedEmail') ? item.querySelector('#assignedEmail').textContent.toLowerCase() : '';
            if (username.includes(query) || email.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Assign user to task functionality
    allAssignedContainer.addEventListener("click", async (e) => {
        const assignedItem = e.target.closest(".assigned-item");

        if (!assignedItem) return;

        const userId = assignedItem.dataset.userId; // Assume userId is stored in the dataset
        const taskId = document.getElementById("task-id").dataset.taskId;

        try {
            const response = await fetch("/tasks/assign-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ taskId, userId }),
            });

            const result = await response.json();

            if (response.ok) {
                alert("User assigned successfully!");
                // Optional: Update UI dynamically
            } else {
                alert(result.error || "An error occurred.");
            }
        } catch (error) {
            console.error("Error assigning user:", error);
            alert("Failed to assign user. Please try again.");
        }
    });

    // Remove user from task functionality
    document.querySelectorAll('.remove-user-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const userId = event.target.dataset.userId;
            const taskId = document.getElementById('task-id').dataset.taskId;

            if (confirm('Are you sure you want to remove this user from the task?')) {
                try {
                    const response = await fetch('/tasks/remove-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ taskId, userId }),
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert(result.message);
                        location.reload(); 
                    } else {
                        alert(result.error);
                    }
                } catch (error) {
                    console.error('Error removing user:', error);
                    alert('An error occurred while removing the user.');
                }
            }
        });
    });
});


// Clear Activity Log ✅
document.getElementById('clearLogsButton').addEventListener('click', async () => {
    const taskId = document.getElementById('clearLogsButton').dataset.taskId;  // Get taskId from button's data attribute

    if (!taskId) {
        console.error('Task ID is missing.');
        return;
    }

    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมทั้งหมด?')) {
        try {
            const response = await fetch(`/tasks/${taskId}/clearLogs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                location.reload(); // Refresh the page after clearing logs
            } else {
                const errorMessage = await response.text();
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            alert('เกิดข้อผิดพลาดในการลบกิจกรรม');
        }
    }
});