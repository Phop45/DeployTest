// Subtask Form Toggles
function cancelSubtaskNew() {
    document.getElementById('subtaskNameInputMainNew').value = '';
    document.getElementById('assigneeInputNew').value = '';
    document.getElementById('dueDateInputNew').value = '';
    document.getElementById('subtaskFormMainNew').style.display = 'none';
    document.getElementById('addSubtaskBtnMainNew').style.display = 'block';
}
function showSubtaskInputMainNew() {
    const subtaskForm = document.getElementById('subtaskFormMainNew');
    const addSubtaskBtn = document.getElementById('addSubtaskBtnMainNew');

    if (subtaskForm.style.display === 'flex') {
        subtaskForm.style.display = 'none';
        addSubtaskBtn.style.display = 'block';
    } else {
        addSubtaskBtn.style.display = 'none';
        subtaskForm.style.display = 'flex';
    }
}

document.getElementById('addSubtaskBtnMainNew').addEventListener('click', showSubtaskInputMainNew);
document.getElementById('cancelSubtaskNew').addEventListener('click', cancelSubtaskNew);

// Check if table has data and toggle visibility
function checkTableData() {
    const subtaskTableBody = document.getElementById('subtaskTableBodyNew');
    const tableContainer = document.getElementById('subtaskTableContainerNew');
    const formMain = document.getElementById('subtaskFormMainNew');

    if (subtaskTableBody.children.length > 0) {
        tableContainer.style.display = 'block';
    } else {
        tableContainer.style.display = 'none';
        formMain.style.display = 'none';
    }
}
checkTableData();

// Initialize Flatpickr for Due Date input and apply Thai date formatting
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('dueDateInputNew');
    const calendarIcon = document.getElementById('calendarIcon');
    const dueDateWrapper = document.getElementById('dueDateWrapper');

    // Retrieve the main task's due date from a hidden input
    const mainTaskDueDate = document.getElementById('dueDateInput').value;
    const maxDate = mainTaskDueDate ? new Date(mainTaskDueDate) : null;

    // Function to format date to Thai format
    function formatDateToThai(date) {
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        return `${date.getDate()} ${thaiMonths[date.getMonth()]}`;
    }

    // Initialize Flatpickr
    const flatpickrInstance = flatpickr(dateInput, {
        dateFormat: "Y-m-d",  // Use ISO date format for backend submission
        locale: "th",  // Thai locale for display
        minDate: "today",  // Disable past dates
        maxDate: maxDate,  // Max date set to the main task's due date
        onChange: function (selectedDates) {
            if (selectedDates.length > 0) {
                const formattedDate = formatDateToThai(selectedDates[0]);
                dueDateWrapper.classList.add('expanded');
                dateInput.value = formattedDate; // Display date in Thai format
                dateInput.setAttribute('data-iso-date', selectedDates[0].toISOString()); // Save ISO date for form submission
            }
        }
    });

    calendarIcon.addEventListener('click', () => flatpickrInstance.open());

    window.addSubtaskNew = function () {
        const subtaskName = document.getElementById('subtaskNameInputMainNew').value.trim();
        const dueDateInput = dateInput.getAttribute('data-iso-date'); // Use ISO date from Flatpickr
        const taskId = document.getElementById('taskId').value;
        const assigneeSelect = document.getElementById('assigneeSelect');
        const assignee = assigneeSelect ? assigneeSelect.value : '';

        if (!subtaskName || !taskId || !dueDateInput || !assignee) {
            alert('All fields are required, including assignee.');
            return;
        }

        const data = {
            subTask: subtaskName,
            dueDate: dueDateInput,  // Send the ISO formatted due date
            taskId: taskId,
            assignee: assignee
        };

        fetch('/addSubtask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.ok ? window.location.reload() : response.json().then(error => alert(error.message)))
        .catch(() => alert('Internal Server Error'));
    };

    const addSubtaskButton = document.getElementById('addSubtaskNew');
    if (addSubtaskButton) addSubtaskButton.addEventListener('click', addSubtaskNew);

    function saveSubtaskState() {
        const subtaskTableBody = document.getElementById('subtaskTableBodyNew');
        const subtasks = Array.from(subtaskTableBody.children).map(subtask => ({
            id: subtask.dataset.subtaskId,
            status: subtask.querySelector('.checkbox').checked
        }));
        localStorage.setItem('subtasks', JSON.stringify(subtasks));
    }

    function loadSubtaskState() {
        const subtasks = JSON.parse(localStorage.getItem('subtasks'));
        if (subtasks) {
            subtasks.forEach(({ id, status }) => {
                const subtaskRow = document.querySelector(`tr[data-subtask-id="${id}"]`);
                if (subtaskRow) {
                    const checkbox = subtaskRow.querySelector('.checkbox');
                    const statusElement = subtaskRow.querySelector('.statusWrape');
                    checkbox.checked = status;
                    subtaskRow.style.opacity = status ? '0.5' : '1';
                    statusElement.textContent = status ? 'finished' : 'inProgress';
                    statusElement.classList.toggle('completed', status);
                }
            });
            sortSubtasks();
        }
    }

    loadSubtaskState();

    document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const subtaskRow = this.closest('tr');
            const subtaskId = subtaskRow.dataset.subtaskId;
    
            // Prevent checkbox change from toggling immediately; we handle the update via the backend
            const isChecked = this.checked;
    
            // Make a PUT request to toggle the status of the subtask
            fetch('/toggleSubtaskStatus', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtaskId })
            })
            .then(response => {
                if (response.status === 403) {
                    alert('You are not authorized to change the status of this subtask.');
                    this.checked = !this.checked; // Revert checkbox state
                    throw new Error('Unauthorized');
                }
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                // Update UI based on the new status
                const statusElement = subtaskRow.querySelector('.statusWrape');
                if (data.subtask.subTask_status === 'finished') {
                    subtaskRow.style.opacity = '0.4'; // Visually indicate completion
                    statusElement.textContent = 'เสร็จสิ้น';
                    statusElement.style.backgroundColor = '#4CAF50'; // Green for completed
                    statusElement.classList.add('completed');
                } else {
                    subtaskRow.style.opacity = '1';
                    statusElement.textContent = 'กำลังทำ';
                    statusElement.style.backgroundColor = '#6EACDA'; // Blue for in progress
                    statusElement.classList.remove('completed');
                }
    
                // Reload the page to ensure the updated state is reflected
                window.location.reload(); 
            })
            .catch(error => console.error('Error:', error));
        });
    });
    

    // Set initial background colors based on the status when the page loads
    document.querySelectorAll('.statusWrape').forEach(statusElement => {
        const status = statusElement.textContent.trim();
        if (status === 'finished') {
            statusElement.style.backgroundColor = '#4CAF50'; // Green for completed
        } else if (status === 'inProgress') {
            statusElement.style.backgroundColor = '#6EACDA'; // Blue for in progress
        }
    });
    
    function sortSubtasks() {
        const subtaskTableBody = document.getElementById('subtaskTableBodyNew');
        const subtasks = Array.from(subtaskTableBody.children);
        const incomplete = subtasks.filter(task => !task.querySelector('.checkbox').checked);
        const completed = subtasks.filter(task => task.querySelector('.checkbox').checked);
        subtaskTableBody.innerHTML = '';
        incomplete.forEach(task => subtaskTableBody.appendChild(task));
        completed.forEach(task => subtaskTableBody.appendChild(task));
    }
});


function deleteSubtask(subtaskId, element) {
    if (confirm('Are you sure you want to delete this subtask?')) {
        fetch(`/deleteSubtask/${subtaskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                // Remove the subtask row from the table
                const row = element.closest('tr');
                row.parentNode.removeChild(row);
            } else {
                return response.json().then(errorData => {
                    alert(`Failed to delete subtask: ${errorData.message}`);
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Internal Server Error');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const subtaskForm = document.getElementById('subtaskForm');
    const addSubtaskInput = document.getElementById('addSubtask');
    const addSubButton = document.getElementById('addSub-btn');
    const mainTaskDueDate = document.getElementById('mainTaskDueDate').value; // Fetch main task's due date
    const taskId = document.getElementById('taskId').value; // Fetch main task's ID

    // Show or hide the subtask form when clicking the button
    addSubButton.addEventListener('click', function(event) {
        console.log('Add Subtask button clicked'); // Debug line
        event.stopPropagation(); // Prevent click from bubbling up

        if (subtaskForm.style.display === 'none' || subtaskForm.style.display === '') {
            subtaskForm.style.display = 'flex'; 
            addSubtaskInput.focus();
            addSubButton.classList.remove('return-animation');
            addSubButton.classList.add('show-animation');

            // Add event listener to hide the form when clicking outside
            document.addEventListener('click', hideFormOnClickOutside);
        } else {
            hideForm(); // If the form is already visible, hide it
        }
    });

    // Hide the form when clicking outside
    function hideFormOnClickOutside(event) {
        if (!subtaskForm.contains(event.target) && !addSubButton.contains(event.target)) {
            hideForm(); // Call the hideForm function
        }
    }

    // Function to hide the subtask form
    function hideForm() {
        subtaskForm.style.display = 'none';
        addSubButton.classList.remove('show-animation');
        addSubtaskInput.value = '';
        document.removeEventListener('click', hideFormOnClickOutside); // Clean up listener
    }
    
    // Handle adding a new subtask on form submission
    const addSubtaskForm = document.getElementById('addSubtaskForm');
    addSubtaskForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const subtaskName = addSubtaskInput.value.trim(); // Get value from input
        const taskId = document.getElementById('taskId').value; // Get task ID
        const mainTaskDueDate = document.getElementById('mainTaskDueDate').value; // Get due date

        if (!subtaskName) {
            console.error('Subtask name cannot be empty.');
            return; // Stop execution if subtask name is empty
        }

        // Prepare data for the new subtask
        const data = {
            taskId: taskId, // Include task ID
            subTask: subtaskName, // Subtask name
            dueDate: mainTaskDueDate // Main task's due date
        };

        // Send POST request to add the subtask
        fetch('/addSubtask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to add subtask');
        })
        .then(subtask => {
            // Optionally log the added subtask
            console.log('Added Subtask:', subtask);
            
            // Reload the page to show new data
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Internal Server Error');
        });
    });


    // Event delegation for renaming and deleting subtasks
    subtaskList.addEventListener('click', (event) => {
        const target = event.target;
        
        // Renaming a subtask
        if (target.classList.contains('rename-subtask')) {
            const listItem = target.closest('.itemDetail');
            const subtaskId = listItem.dataset.subtaskId;
            const newSubtaskName = prompt("Enter new subtask name:");
            if (newSubtaskName) {
                fetch(`/subtask/${subtaskId}/rename`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newName: newSubtaskName })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to rename subtask');
                    }
                    return response.json();
                })
                .then(updatedSubtask => {
                    listItem.querySelector('.subName').textContent = updatedSubtask.subtask_Name; // Update displayed name
                })
                .catch(error => console.error('Error:', error));
            }
        }
        
        // Deleting a subtask
        if (target.classList.contains('delete-subtask')) {
            const listItem = target.closest('.itemDetail');
            const subtaskId = listItem.dataset.subtaskId;
            if (confirm('Are you sure you want to delete this subtask?')) {
                fetch(`/subtask/${subtaskId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (response.ok) {
                        listItem.remove(); // Remove the item from the list
                    } else {
                        throw new Error('Failed to delete subtask');
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        }
    });
});

async function showSubtaskFullView(subtaskId) {
    try {
        const response = await fetch(`/api/subtask/${subtaskId}`);

        if (!response.ok) {
            throw new Error('Failed to fetch subtask details');
        }

        const subtask = await response.json();
        console.log('Fetched subtask:', subtask);

        // Populate the full view with data from the clicked subtask
        document.getElementById('subtaskNameText').textContent = subtask.subtask_Name;

        // Update the status text and background color
        const statusButton = document.getElementById('subtaskStatusText');
        statusButton.textContent = subtask.subTask_status;

        // Update button color based on status
        updateStatusButtonColor(statusButton, subtask.subTask_status);

        // Format the due date to Thai format
        const dueDateElement = document.getElementById('subtaskDueDateText');
        if (subtask.subTask_dueDate) {
            const date = new Date(subtask.subTask_dueDate);
            const thaiFormattedDate = new Intl.DateTimeFormat('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(date);
            dueDateElement.textContent = thaiFormattedDate;
        } else {
            dueDateElement.textContent = '-';
        }

        // Optionally set the description if it exists
        document.getElementById('subtaskDescription').value = subtask.description || '';

        // Set the hidden subtask ID
        document.getElementById('subtaskId').value = subtaskId;

        // Open the full-page view
        openSubtaskFullView();
    } catch (error) {
        console.error('Error fetching subtask details:', error);
    }
}

function closeSubtaskFullView() {
    const fullPageViewSubtask = document.getElementById('fullPageViewSubtask');
    fullPageViewSubtask.classList.remove('show');
    setTimeout(() => {
        fullPageViewSubtask.style.display = 'none';
    }, 300);
}

function openSubtaskFullView() {
    const fullPageViewSubtask = document.getElementById('fullPageViewSubtask');
    const detailSection = document.querySelector('.detail');

    // Scroll to the top of the detail section
    if (detailSection) {
        detailSection.scrollTop = 0;
    }

    // Display the full-page view with animation
    fullPageViewSubtask.style.display = 'block';
    requestAnimationFrame(() => {
        fullPageViewSubtask.classList.add('show');
    });
}

// Toggle status in the full view page
async function toggleSubtaskStatusInFullView() {
    const subtaskId = document.getElementById('subtaskId').value;

    try {
        const response = await fetch('/toggleSubtaskStatus', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subtaskId }),
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        const data = await response.json();

        // Update the status button text and color in the full view page
        const statusButton = document.getElementById('subtaskStatusText');
        statusButton.textContent = data.status;
        updateStatusButtonColor(statusButton, data.status);

        // Sync the change with the corresponding row in the table view
        const subtaskRow = document.querySelector(`tr[data-subtask-id="${subtaskId}"]`);
        if (subtaskRow) {
            const statusElement = subtaskRow.querySelector('.statusWrape');
            subtaskRow.style.opacity = data.status === 'finished' ? '0.4' : '1';
            statusElement.textContent = data.status;

            if (data.status === 'finished') {
                statusElement.classList.add('completed');
            } else {
                statusElement.classList.remove('completed');
            }
        }

        // Save the status to localStorage and re-sort subtasks
        saveSubtaskState();
        sortSubtasks();
    } catch (error) {
        console.error('Error toggling subtask status:', error);
    }
}

// New function to update the subtask
async function updateSubtask() {
    const subtaskId = document.getElementById('subtaskId').value;
    const SubtaskName = document.getElementById('subtaskNameText').textContent; // Get the updated name from the text field
    const subtaskDescription = document.getElementById('subtaskDescription').value; // Get the updated description
    const subtaskStatus = document.getElementById('subtaskStatusText').textContent; // Get the current status

    try {
        const response = await fetch(`/updateSubtask`, {
            method: 'PUT', // Assuming you use PUT for updates
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subtaskId, SubtaskName, subtaskDescription, subtaskStatus }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log(data.message); // Log success message
            location.reload(); // Reload the page to reflect the changes
        } else {
            console.error('Error updating subtask:', data.message);
            alert(data.message); // Show error message to the user
        }
    } catch (error) {
        console.error('Error updating subtask:', error);
        alert('Error updating subtask. Please try again.');
    }
}

// Attach the update function to a button or event
document.getElementById('updateButton').addEventListener('click', updateSubtask);

// Helper function to update the button's background color
function updateStatusButtonColor(button, status) {
    button.style.backgroundColor = status === 'inProgress' ? '#1090e0' : '#4CAF50';
}

// Handle form submission (for other fields like taskName, taskDetail)
document.getElementById('updateTaskForm').addEventListener('submit', async function (event) {
    event.preventDefault(); 

    const formData = new FormData(event.target);
    
    try {
        const response = await fetch('/updateTask', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }

        window.location.reload();  
    } catch (error) {
        console.error('Error updating task:', error);
    }
});

// async function checkWork() {
//     const taskId = document.getElementById('taskId').value;
//     const statusDiv = document.querySelector('.status-div');
//     let currentStatus = statusDiv.getAttribute('data-status'); // Get current status
//     let newStatus, confirmationMessage;

//     if (currentStatus === 'กำลังทำ') {
//         newStatus = 'รอตรวจ'; // Change to 'Pending'
//         confirmationMessage = 'คุณต้องการยืนยันการส่งงานหรือไม่?'; // "You want to confirm the submission?"
//     } else if (currentStatus === 'รอตรวจ') {
//         newStatus = 'กำลังทำ'; // Revert to 'In Progress'
//         confirmationMessage = 'คุณต้องการยกเลิกการส่งงานหรือไม่?'; // "You want to cancel the submission?"
//     } else if (currentStatus === 'แก้ไข') {
//         newStatus = 'รอตรวจ'; // Revert to 'In Progress'
//         confirmationMessage = 'คุณต้องการยืนยันการส่งงานหรือไม่?';
//     } else {
//         console.warn('Unhandled status:', currentStatus);
//         return; // Exit if the status is not handled
//     }

//     // Confirm the action
//     const confirmed = confirm(confirmationMessage);
//     if (!confirmed) return; // Exit if the user cancels the confirmation

//     try {
//         const response = await fetch('/updateTask', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 taskId,
//                 taskStatuses: newStatus // Send the new status to the server
//             })
//         });

//         const data = await response.json();
//         window.location.reload(); 
//         if (response.ok) {
//             // Update the status in the UI
//             document.querySelector('.status-text').textContent = newStatus;
//             statusDiv.setAttribute('data-status', newStatus);
//             console.log(data.message); // Log success message

//             // Optionally, update the background color dynamically
//             updateStatusColor(newStatus);
//         } else {
//             console.error(data.message); // Log error message
//         }
//     } catch (error) {
//         console.error('Error updating task status:', error);
//     }
// }



function toggleSubtaskStatus(subtaskId) {
    fetch('/toggleSubtaskStatus', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            subtaskId: subtaskId
        }),
    })
    .then(response => {
        if (response.ok) {
            window.location.reload();  // Reload the page to reflect the updated subtask status
        } else {
            return response.json().then(error => alert(error.message));
        }
    })
    .catch(error => console.error('Error updating subtask status:', error));
}

function filterContent(contentType) {
    const activityContent = document.getElementById("activityContent");
    const commentContent = document.getElementById("commentContent");

    // Toggle visibility based on the selected button
    if (contentType === "activity") {
        activityContent.style.display = "block";
        commentContent.style.display = "none";
    } else if (contentType === "comment") {
        activityContent.style.display = "none";
        commentContent.style.display = "block";
    }

    // Optional: Add active class for styling
    document.querySelectorAll('.selectMessage div').forEach(button => {
        button.classList.remove('active');
    });
    if (contentType === "activity") {
        document.querySelector('.showActivity').classList.add('active');
    } else if (contentType === "comment") {
        document.querySelector('.showComment').classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sendTaskButton = document.querySelector('.sendTask');
    const statusDiv = document.querySelector('.status-div');

    const checkAndHideSendTask = () => {
        const currentStatus = statusDiv.getAttribute('data-status');
        if (currentStatus === 'pending') {
            sendTaskButton.style.display = 'none'; // Hide the button
        } else {
            sendTaskButton.style.display = 'block'; // Show the button if not pending
        }
    };

    // Initial check
    checkAndHideSendTask();

    // Optional: Add a listener for status changes
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', function () {
            const newStatus = this.getAttribute('data-status');
            statusDiv.setAttribute('data-status', newStatus);
            checkAndHideSendTask(); // Recheck visibility after status update
        });
    });
});

async function checkWork(taskId) {
    try {
        const button = document.getElementById("sendTask");
        if (button) {
            button.disabled = true;
            button.innerText = "กำลังส่ง...";
        }

        const response = await fetch(`/task/${taskId}/send-to-approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Unhandled status: ${response.statusText}`);
        }

        const result = await response.json();
        alert('ส่งงานสำเร็จ!');
        window.location.reload();
    } catch (error) {
        console.error('Error sending task for approval:', error.message);
        alert(`Failed to send task for approval: ${error.message}`);
    } finally {
        const button = document.getElementById("sendTask");
        if (button) {
            button.disabled = false;
            button.innerText = "ส่งงาน";
        }
    }
}

// description section
document.addEventListener('DOMContentLoaded', function () {
    const updateTaskDescription = async (textarea) => {
        const newDescription = textarea.value.trim();
        const taskId = textarea.getAttribute('data-task-id');

        try {
            const response = await fetch('/updateTaskDescription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, taskDetail: newDescription }),
            });

            const data = await response.json();
            if (data.success) {
                console.log('Task description updated successfully');
            } else {
                console.error('Error updating description:', data.message);
            }
        } catch (error) {
            console.error('Request error:', error);
        }
    };

    // Attach blur event to both textareas
    const descriptionMainView = document.getElementById('taskDescription');
    const descriptionFullView = document.getElementById('taskDescriptionFullView');

    if (descriptionMainView) {
        let initialMainDescription = descriptionMainView.value;
        descriptionMainView.addEventListener('blur', () => {
            if (descriptionMainView.value !== initialMainDescription) {
                updateTaskDescription(descriptionMainView);
                initialMainDescription = descriptionMainView.value;
            }
        });
    }

    if (descriptionFullView) {
        let initialFullDescription = descriptionFullView.value;
        descriptionFullView.addEventListener('blur', () => {
            if (descriptionFullView.value !== initialFullDescription) {
                updateTaskDescription(descriptionFullView);
                initialFullDescription = descriptionFullView.value;
            }
        });
    }
});

// subtask section
document.getElementById('addSubtaskNew').addEventListener('click', () => {
    const assigneeSelect = document.getElementById('assigneeSelect');
    const subtaskForm = document.getElementById('subtaskFormMainNew');

    if (!assigneeSelect.value) {
        alert('Please select an assignee.');
    } else if (subtaskForm.checkValidity()) {
        console.log("Submitting with assignee:", assigneeSelect.value);
        subtaskForm.submit();
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const customDropdown = document.getElementById('customDropdown');
    const dropdownSelected = document.getElementById('dropdownSelected_assign');
    const dropdownOptions = document.getElementById('dropdownOptions');
    const assigneeSelect = document.getElementById('assigneeSelect'); // Hidden input

    // Toggle dropdown visibility
    dropdownSelected.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the event from bubbling up
        const isVisible = dropdownOptions.style.display === 'block';
        dropdownOptions.style.display = isVisible ? 'none' : 'block';
    });

    // Handle option selection
    dropdownOptions.querySelectorAll('.dropdown-option-assign').forEach(option => {
        option.addEventListener('click', function () {
            const userId = this.getAttribute('data-value');
            const userName = this.querySelector('span').textContent;
            const userAvatar = this.querySelector('img').src;

            // Update the selected value
            dropdownSelected.innerHTML = `
                <img src="${userAvatar}" alt="${userName} Profile" class="user-avatar" />
            `;

            // Set the value in the hidden input for form submission
            assigneeSelect.value = userId;

            // Close the dropdown
            dropdownOptions.style.display = 'none';
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!customDropdown.contains(event.target)) {
            dropdownOptions.style.display = 'none';
        }
    });
});

// Update visibility of the checkTaskButton based on checkbox status
function updateCheckTaskButtonVisibility() {
    const checkboxes = document.querySelectorAll('#subtaskTableBodyNew .checkbox');
    const allChecked = checkboxes.length > 0 && [...checkboxes].every((checkbox) => checkbox.checked);
    const hasSubtasks = checkboxes.length > 0;
    const detailSection = document.querySelector('.detail');

    // Ensure .checkTask exists before trying to modify it
    const checkTaskButton = document.querySelector('.checkTask');

    if (checkTaskButton) {  // Check if the button exists
        // Show button if all checkboxes are checked or if there are no subtasks
        if (allChecked || !hasSubtasks) {
            checkTaskButton.style.display = 'block';
            if (detailSection) {  // Check if the detailSection exists before scrolling
                detailSection.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            checkTaskButton.style.display = 'none'; // Hide the button if not all subtasks are checked
        }
    }
}


// Attach listeners to all checkboxes (to respond to changes)
function addCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#subtaskTableBodyNew .checkbox');
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', updateCheckTaskButtonVisibility);
    });
}

// Initialize everything when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    addCheckboxListeners();
    updateCheckTaskButtonVisibility(); // Initial check to ensure the button's visibility is correct
});

// Optional: Use MutationObserver for dynamically added checkboxes (if subtasks are dynamically rendered)
const observer = new MutationObserver(() => {
    addCheckboxListeners();  // Re-attach event listeners when new checkboxes are added
    updateCheckTaskButtonVisibility(); // Recheck visibility
});

// Observe changes in the DOM within the subtask table
observer.observe(document.querySelector('#subtaskTableBodyNew'), {
    childList: true, // Observe addition/removal of subtasks
    subtree: true    // Observe all descendants of the container
});