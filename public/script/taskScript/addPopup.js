// Handle submit button click inside form
document.getElementById('submitTaskBtn').addEventListener('click', async function (event) {
    event.preventDefault(); // Prevent default form submission

    const taskNameInput = document.getElementById('taskName');
    const taskNameValue = taskNameInput.value.trim();
    const nameAlert = document.getElementById('nameAlert');

    const taskDetailInput = document.getElementById('taskDetail');
    const taskDetailValue = taskDetailInput.value.trim();
    const detailAlert = document.getElementById('detailAlert');

    // Validation
    const minLength = 3;
    const maxLength = 100;
    const validCharsRegex = /^[a-zA-Z0-9\s\-_.ก-ฮ]+$/;

    if (!taskNameValue) {
        nameAlert.innerText = 'กรุณากรอกชื่อของงาน!';
        nameAlert.style.color = 'red';
        return;
    }
    if (taskNameValue.length < minLength) {
        nameAlert.innerText = `ชื่องานต้องมีความยาวอย่างน้อย ${minLength} ตัวอักษร!`;
        nameAlert.style.color = 'red';
        return;
    }
    if (taskNameValue.length > maxLength) {
        nameAlert.innerText = `ชื่องานต้องไม่เกิน ${maxLength} ตัวอักษร!`;
        nameAlert.style.color = 'red';
        return;
    }
    if (!validCharsRegex.test(taskNameValue)) {
        nameAlert.innerText = 'ชื่องานมีอักขระที่ไม่ถูกต้อง!';
        nameAlert.style.color = 'red';
        return;
    }

    // Clear alert on successful validation
    nameAlert.innerText = '';
    nameAlert.style.color = '';

    // Validation for taskDetail (optional)
    const maxDetailLength = 500; // Optional max length for task detail
    const invalidCharsRegex = /[<>]+/; // Example: Check for tags or script injection

    if (taskDetailValue.length > maxDetailLength) {
        detailAlert.innerText = `รายละเอียดของงานต้องไม่เกิน ${maxDetailLength} ตัวอักษร`;
        detailAlert.style.color = 'red';
        return;
    }

    if (invalidCharsRegex.test(taskDetailValue)) {
        detailAlert.innerText = 'รายละเอียดของงานมีอักขระที่ไม่ถูกต้อง';
        detailAlert.style.color = 'red';
        return;
    }

    // Clear taskDetail alert on success
    detailAlert.innerText = '';
    detailAlert.style.color = '';

    // Prepare and submit form
    try {
        await prepareFormData();
        document.getElementById('taskForm').submit();
    } catch (error) {
        console.error('Error preparing form data:', error);
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
});

// Function to prepare form data
async function prepareFormData() {
    const dueDateInput = document.getElementById('dueDate');
    const startDateInput = document.getElementById('startDate');
    const isoDate = dueDateInput.dataset.isoDate || "";
    const isoStartDate = startDateInput.dataset.isoDate || "";

    if (isoDate) {
        dueDateInput.value = isoDate;
    } else {
        console.warn("⚠️ ไม่มีค่า Due Date ที่ถูกเลือก!");
    }

    if (isoStartDate) {
        startDateInput.value = isoStartDate;
    } else {
        console.warn("⚠️ ไม่มีค่า Start Date ที่ถูกเลือก!");
    }

    return true;
}

// validate taskName
document.addEventListener("DOMContentLoaded", () => {
    const taskNameInput = document.getElementById("taskName");
    const nameAlert = document.getElementById("nameAlert");

    const validateTaskName = () => {
        const value = taskNameInput.value.trim(); // Remove leading/trailing spaces
        const minLength = 3;
        const maxLength = 100;
        const validCharsRegex = /^[a-zA-Z0-9\s\-_.ก-ฮ]+$/; // Allow alphanumeric, spaces, dashes, underscores, and Thai characters
    
        if (value.length < minLength) {
            nameAlert.innerText = `ชื่องานต้องมีความยาวอย่างน้อย ${minLength} ตัวอักษร!`;
            nameAlert.style.color = "red";
            return false;
        }

        if (value.length > maxLength) {
            nameAlert.innerText = `ชื่องานไม่สามารถเกิน ${maxLength} ตัวอักษร!`;
            nameAlert.style.color = "red";
            return false;
        }

        if (!validCharsRegex.test(value)) {
            nameAlert.innerText = "ชื่องานมีอักขระที่ไม่ถูกต้อง!";
            nameAlert.style.color = "red";
            return false;
        }

        nameAlert.innerText = "ชื่องานที่ถูกต้อง";
        nameAlert.style.color = "green";
        return true;
    };

    // Validate on input
    taskNameInput.addEventListener("input", validateTaskName);

    // Prevent form submission if invalid
    const form = document.querySelector("form");
    form.addEventListener("submit", (e) => {
        if (!validateTaskName()) {
            e.preventDefault();
        }
    });
});

// detail
document.addEventListener('DOMContentLoaded', function () {
    const detailTextarea = document.getElementById('taskDetail');

    detailTextarea.addEventListener('focus', function () {
        detailTextarea.style.transition = 'height 0.3s ease-in-out';
        detailTextarea.style.height = '100px';
    });

    detailTextarea.addEventListener('blur', function () {
        if (!detailTextarea.value) {
            detailTextarea.style.height = '46px';
        }
    });

    detailTextarea.addEventListener('input', function () {
        if (detailTextarea.value) {
            detailTextarea.style.height = '100px';
        }
    });
});

// priority
document.addEventListener('DOMContentLoaded', function () {
    const priorityToggle = document.querySelector('#priorityToggle');
    const priorityDropdown = document.querySelector('#priorityDropdown');
    const currentPriority = document.querySelector('#currentPriority');
    const taskPriorityInput = document.querySelector('#taskPriority');

    // Set default priority to "normal"
    const defaultPriorityOption = priorityDropdown.querySelector('[data-priority="normal"]');
    const defaultIcon = defaultPriorityOption.getAttribute('data-icon');
    const defaultColor = defaultPriorityOption.getAttribute('data-color');

    // Update currentPriority with default values
    currentPriority.innerHTML = `
        <i class="${defaultIcon}" style="color: ${defaultColor};"></i>
        ${defaultPriorityOption.textContent.trim()}
    `;

    // Update the hidden input
    taskPriorityInput.value = "normal";

    // Add checkmark to the default option
    const defaultCheckIcon = document.createElement('i');
    defaultCheckIcon.className = 'fa-solid fa-check';
    defaultPriorityOption.appendChild(defaultCheckIcon);

    // Toggle dropdown visibility
    priorityToggle.addEventListener('click', function () {
        const isDropdownVisible = priorityDropdown.style.display === 'block';
        priorityDropdown.style.display = isDropdownVisible ? 'none' : 'block';
    });

    // Handle priority selection
    priorityDropdown.addEventListener('click', function (event) {
        const selectedOption = event.target.closest('.priority-option');
        if (selectedOption) {
            const selectedPriority = selectedOption.getAttribute('data-priority');
            const selectedIcon = selectedOption.getAttribute('data-icon');
            const selectedColor = selectedOption.getAttribute('data-color');

            // Update currentPriority with icon and text
            currentPriority.innerHTML = `
                <i class="${selectedIcon}" style="color: ${selectedColor};"></i>
                ${selectedOption.textContent.trim()}
            `;

            // Update the hidden input
            taskPriorityInput.value = selectedPriority;

            // Clear existing check icons
            const checkIcons = priorityDropdown.querySelectorAll('.fa-check');
            checkIcons.forEach(icon => icon.remove());

            // Add check icon to the selected option
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fa-solid fa-check';
            selectedOption.appendChild(checkIcon);

            // Hide the dropdown
            priorityDropdown.style.display = 'none';
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', function (event) {
        if (!priorityToggle.contains(event.target) && !priorityDropdown.contains(event.target)) {
            priorityDropdown.style.display = 'none';
        }
    });
});

// Tags
document.addEventListener('DOMContentLoaded', async function () {
    const tagSearch = document.querySelector('#tag-search');
    const tagsSection = document.querySelector('.tags-section');
    const tagsContainer = document.querySelector('#tagsContainer');
    const noMatch = document.querySelector('#noMatch');
    const tagArrayInput = document.querySelector('#tagArray');
    const selectedTagsContainer = document.querySelector('#selectedTagsContainer');
    const tagAlert = document.querySelector('#tagAlert'); // For validation messages

    let existingTags = []; // Tags from the server
    let selectedTags = []; // Currently selected tags

    // Fetch existing tags
    async function fetchTags() {
        try {
            const response = await fetch('/tags');
            if (response.ok) {
                existingTags = await response.json();
            } else {
                console.error('Failed to fetch tags');
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    }

    // Generate a random pastel color
    function getRandomPastelColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.random() * 10; // Saturation between 70-80
        const lightness = 85 + Math.random() * 10; // Lightness between 85-95
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // Render matching tags
    function renderMatchingTags(searchValue) {
        tagsContainer.innerHTML = '';
        const matchingTags = existingTags.filter(tag =>
            tag.name.toLowerCase().includes(searchValue.toLowerCase())
        );

        if (matchingTags.length > 0) {
            noMatch.style.display = 'none'; // Hide "no match" message
            matchingTags.forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.classList.add('tag');
                tagElement.style.backgroundColor = tag.color;
                tagElement.innerHTML = `
                    <i class="fa-solid fa-tags"></i>
                    <span>${tag.name}</span>
                `;
                tagElement.addEventListener('click', () => {
                    if (!selectedTags.some(t => t.name === tag.name)) {
                        selectedTags.push(tag);
                        renderSelectedTags();
                    }
                });
                tagsContainer.appendChild(tagElement);
            });
        } else {
            noMatch.style.display = 'block'; // Show "no match" message
        }
    }

    // Render selected tags
    function renderSelectedTags() {
        selectedTagsContainer.innerHTML = '';
        selectedTags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.classList.add('tag');
            tagElement.style.backgroundColor = tag.color;
            tagElement.innerHTML = `
                <i class="fa-solid fa-tags"></i>
                <span>${tag.name}</span>
                <i class="bx bx-x remove-tag" data-tag="${tag.name}"></i>
            `;
            selectedTagsContainer.appendChild(tagElement);
        });

        // Update hidden input with properly formatted JSON
        tagArrayInput.value = JSON.stringify(
            selectedTags.map(tag => ({
                _id: tag._id,
                tagName: tag.name,
                color: tag.color,
            }))
        );

        // Remove tag event
        document.querySelectorAll('.remove-tag').forEach(removeBtn => {
            removeBtn.addEventListener('click', function () {
                const tagToRemove = this.getAttribute('data-tag');
                selectedTags = selectedTags.filter(tag => tag.name !== tagToRemove);
                renderSelectedTags();
            });
        });
    }

    // Show tagsContainer when clicking on tags-section
    tagsSection.addEventListener('click', function () {
        tagsContainer.style.display = 'flex';
        renderMatchingTags(tagSearch.value.trim());
    });

    // Hide tagsContainer when clicking outside
    document.addEventListener('click', function (e) {
        if (!tagsSection.contains(e.target) && !tagsContainer.contains(e.target)) {
            tagsContainer.style.display = 'none';
        }
    });

    // Trigger tag rendering when the input value changes
    tagSearch.addEventListener('input', function () {
        const searchValue = tagSearch.value.trim();
        renderMatchingTags(searchValue);
    });

    // Handle Enter key for creating a new tag
    tagSearch.addEventListener('keydown', async function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTagName = tagSearch.value.trim();
    
            // Reset the alert message
            tagAlert.textContent = '';
            tagAlert.style.color = 'red';
    
            // Validation Rules
            if (newTagName.length < 2) {
                tagAlert.textContent = 'แท็กต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
                return;
            }
            if (newTagName.length > 30) {
                tagAlert.textContent = 'แท็กไม่สามารถเกิน 30 ตัวอักษร';
                return;
            }
            if (!/^[a-zA-Z0-9\s-_]+$/.test(newTagName)) {
                tagAlert.textContent =
                    'อักขระไม่ถูกต้อง ใช้เฉพาะตัวอักษร ตัวเลข ช่องว่าง เครื่องหมายยัติภังค์ หรือเครื่องหมายขีดล่างเท่านั้น';
                return;
            }
            if (selectedTags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
                tagAlert.textContent = 'แท็กนี้ถูกเลือกไปแล้ว';
                return;
            }
            if (existingTags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
                tagAlert.textContent = 'แท็กนี้มีอยู่แล้ว';
                return;
            }
            if (selectedTags.length >= 10) {
                tagAlert.textContent = 'คุณสามารถเพิ่มแท็กได้สูงสุด 10 แท็ก';
                return;
            }
    
            try {
                // Send the new tag to the backend
                const response = await fetch('/tags/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ tagName: newTagName }),
                });
    
                if (response.ok) {
                    const newTag = await response.json();
                    existingTags.push(newTag); // Add new tag to existing tags
                    selectedTags.push(newTag); // Select the newly created tag
                    renderSelectedTags();
                    tagSearch.value = '';
                    noMatch.style.display = 'none';
                    tagAlert.textContent = '';
                } else {
                    const errorData = await response.json();
                    tagAlert.textContent = errorData.message || 'Failed to create tag';
                }
            } catch (error) {
                console.error('Error creating tag:', error);
                tagAlert.textContent = 'Failed to create tag';
            }
        }
    });
    document.getElementById('tagArray').value = JSON.stringify(selectedTags);
    // Initialize tags
    await fetchTags();
});

// assign
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('assignedUsersDropdown');
    const dropdownOptions = document.getElementById('dropdownOptions');
    const selectedUsers = document.getElementById('selectedUsers');
    const assignedUsersInput = document.getElementById('assignedUsersInput');
    const autoAssign = document.getElementById('autoAssign');
    const closeButton = document.getElementById('close-task-btn');
    const form = document.querySelector('.add-form');

    if (!dropdown || !dropdownOptions || !selectedUsers || !assignedUsersInput || !autoAssign || !closeButton || !form) {
        console.error("One or more required elements are missing from the DOM.");
        return;
    }

    // Initialize with "Unassigned" by default
    const unassignedDiv = document.createElement('div');
    unassignedDiv.className = 'user unassigned';
    unassignedDiv.id = 'unassignedUser';
    unassignedDiv.innerHTML = '<span id="unassignText"><i class="fa-regular fa-user"></i>ไม่มีผู้รับมอบหมาย</span>';
    selectedUsers.appendChild(unassignedDiv);

    // Toggle dropdown visibility
    dropdown.addEventListener('click', () => {
        dropdownOptions.style.display = dropdownOptions.style.display === 'block' ? 'none' : 'block';
    });

    // Handle "Assign to Me" click
    autoAssign.addEventListener('click', () => {
        const myUserId = autoAssign.dataset.userId;
        const myFirstName = autoAssign.dataset.firstname;
        const myLastName = autoAssign.dataset.lastname;
        const myUsername = `${myFirstName} ${myLastName}`;
        const myUserImage = autoAssign.dataset.userImage;
    
        if (!assignedUsersInput.value.split(',').includes(myUserId)) {
            assignedUsersInput.value += `${myUserId},`;
    
            const userDiv = document.createElement('div');
            userDiv.className = 'user itemSelect';
            userDiv.dataset.userId = myUserId;
    
            // Create the image element
            const img = document.createElement('img');
            img.src = myUserImage;
            img.alt = myUsername;
            img.width = 30;
            img.height = 30;
            img.style.borderRadius = '50%';
    
            // Add error handling for the image
            img.onerror = function () {
                img.style.display = 'none'; // Hide the image
                fallbackDiv.style.display = 'flex'; // Show the fallback
            };
            
            // Create the fallback div but set it hidden by default
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'fallback-profile-auto';
            fallbackDiv.style.display = 'none';
            fallbackDiv.style.width = '30px';
            fallbackDiv.style.height = '30px';
            fallbackDiv.style.borderRadius = '50%';
            fallbackDiv.style.display = 'flex';
            fallbackDiv.style.alignItems = 'center';
            fallbackDiv.style.justifyContent = 'center';
            fallbackDiv.style.backgroundColor = '#5C54E5';
            fallbackDiv.style.color = '#fff';
            fallbackDiv.style.fontWeight = '400';
            fallbackDiv.style.fontSize = '14px';
    
            // Add the first letter of the user's first name to the fallback
            const fallbackText = document.createElement('span');
            fallbackText.textContent = myFirstName[0];
            fallbackText.style.marginLeft = '0';
            fallbackDiv.appendChild(fallbackText);

            // Add the user's name span
            const span = document.createElement('span');
            span.textContent = myUsername;
    
            // Add the remove icon
            const removeIcon = document.createElement('span');
            removeIcon.className = 'remove';
            removeIcon.textContent = 'X';
            removeIcon.addEventListener('click', () => {
                userDiv.remove();
                assignedUsersInput.value = assignedUsersInput.value
                    .split(',')
                    .filter(id => id !== myUserId)
                    .join(',');
    
                if (assignedUsersInput.value === '') {
                    selectedUsers.appendChild(unassignedDiv);
                }
            });
    
            // Append elements to the userDiv
            userDiv.appendChild(img);
            userDiv.appendChild(fallbackDiv); // Add fallback div, hidden by default
            userDiv.appendChild(span);
            userDiv.appendChild(removeIcon);
            selectedUsers.appendChild(userDiv);
    
            if (unassignedDiv.parentNode) {
                unassignedDiv.remove();
            }
        }
    });


    // Handle user selection from dropdown
    dropdownOptions.addEventListener('click', (event) => {
        const item = event.target.closest('.dropdown-item');
        if (!item) return;

        const userId = item.dataset.userId;
        const firstName = item.dataset.firstname; 
        const lastName = item.dataset.lastname;
        const username = `${firstName} ${lastName}`;
        const userImage = item.querySelector('img').src;

        if (!assignedUsersInput.value.split(',').includes(userId)) {
            assignedUsersInput.value += `${userId},`;

            const userDiv = document.createElement('div');
            userDiv.className = 'user itemSelect'; // Add the new class here
            userDiv.dataset.userId = userId;

            const img = document.createElement('img');
            img.src = userImage;
            img.alt = username;

            const span = document.createElement('span');
            span.textContent = username;

            const removeIcon = document.createElement('span');
            removeIcon.className = 'remove';
            removeIcon.textContent = 'X';
            removeIcon.addEventListener('click', () => {
                userDiv.remove();
                assignedUsersInput.value = assignedUsersInput.value
                    .split(',')
                    .filter(id => id !== userId)
                    .join(',');

                if (assignedUsersInput.value === '') {
                    selectedUsers.appendChild(unassignedDiv);
                }
            });

            userDiv.appendChild(img);
            userDiv.appendChild(span);
            userDiv.appendChild(removeIcon);
            selectedUsers.appendChild(userDiv);

            if (unassignedDiv.parentNode) {
                unassignedDiv.remove();
            }
        }
    });

    // Handle clicks outside the dropdown to close it
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownOptions.style.display = 'none';
        }
    });

    // Clear form and reset to "Unassigned"
    closeButton.addEventListener('click', () => {
        // Reset the form
        form.reset();

        // Clear the selected users
        selectedUsers.innerHTML = '';

        // Restore "Unassigned" by default
        selectedUsers.appendChild(unassignedDiv);

        // Optionally hide the dropdown if it is open
        dropdownOptions.style.display = 'none';

        // Clear the hidden assigned users input
        assignedUsersInput.value = '';
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('attachments');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');

    if (!fileInput || !uploadArea || !previewContainer) {
        console.error("One or more required elements are missing from the DOM.");
        return;
    }

    let selectedFiles = [];

    // Handle file selection
    fileInput.addEventListener('change', handleFiles);
    uploadArea.addEventListener('click', () => fileInput.click());

    // Handle drag over
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4a90e2';
    });

    // Handle drag leave
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#d1d5db';
    });

    // Handle drop
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    });

    // Handle file input change
    function handleFiles(e) {
        const files = Array.from(e.target.files);
        addFiles(files);
    }

    // Add files to preview and upload
    function addFiles(files) {
        files.forEach(file => {
            if (!selectedFiles.some(f => f.name === file.name)) {
                selectedFiles.push(file);
                uploadFile(file); // Upload the file to the server
            }
        });
    }

    // Upload file to the server
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('attachments', file);

        try {
            const response = await fetch('/uploadAttachments', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                displayPreview(file, result.url); // Display the preview with the URL
            } else {
                console.error('Failed to upload file:', file.name);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }

    // Display file preview
    function displayPreview(file, url) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn-file';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeFile(file.name, previewItem);

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url; // Use the URL from the server
            previewItem.appendChild(img);
        } else {
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            fileIcon.innerHTML = '📄';
            previewItem.appendChild(fileIcon);
        }

        const fileName = document.createElement('p');
        fileName.textContent = file.name;
        fileName.style.fontSize = '12px';

        previewItem.appendChild(removeBtn);
        previewItem.appendChild(fileName);
        previewContainer.appendChild(previewItem);
    }

    // Remove file from preview
    function removeFile(fileName, previewItem) {
        selectedFiles = selectedFiles.filter(file => file.name !== fileName);
        previewContainer.removeChild(previewItem);
    }
});
//uploade
// document.addEventListener('DOMContentLoaded', () => {
//     const fileInput = document.getElementById('attachments');
//     const uploadArea = document.getElementById('uploadArea');
//     const previewContainer = document.getElementById('previewContainer');

//     if (!fileInput || !uploadArea || !previewContainer) {
//         console.error("One or more required elements are missing from the DOM.");
//         return;
//     }

//     let selectedFiles = [];

//     // Handle file selection
//     fileInput.addEventListener('change', handleFiles);
//     uploadArea.addEventListener('click', () => fileInput.click());

//     // Handle drag over
//     uploadArea.addEventListener('dragover', (e) => {
//         e.preventDefault();
//         uploadArea.style.borderColor = '#4a90e2';
//     });

//     // Handle drag leave
//     uploadArea.addEventListener('dragleave', () => {
//         uploadArea.style.borderColor = '#d1d5db';
//     });

//     // Handle drop
//     uploadArea.addEventListener('drop', (e) => {
//         e.preventDefault();
//         uploadArea.style.borderColor = '#d1d5db';
//         const files = Array.from(e.dataTransfer.files);
//         addFiles(files);
//     });

//     // Handle file input change
//     function handleFiles(e) {
//         const files = Array.from(e.target.files);
//         addFiles(files);
//     }

//     // Add files to preview
//     function addFiles(files) {
//         files.forEach(file => {
//             if (!selectedFiles.some(f => f.name === file.name)) {
//                 selectedFiles.push(file);
//                 displayPreview(file);
//             }
//         });
//     }

//     // Display file preview
//     function displayPreview(file) {
//         const previewItem = document.createElement('div');
//         previewItem.className = 'preview-item';

//         const removeBtn = document.createElement('button');
//         removeBtn.className = 'remove-btn-file';
//         removeBtn.innerHTML = '×';
//         removeBtn.onclick = () => removeFile(file.name, previewItem);

//         if (file.type.startsWith('image/')) {
//             const img = document.createElement('img');
//             img.src = URL.createObjectURL(file);
//             previewItem.appendChild(img);
//         } else {
//             const fileIcon = document.createElement('div');
//             fileIcon.className = 'file-icon';
//             fileIcon.innerHTML = '📄';
//             previewItem.appendChild(fileIcon);
//         }

//         const fileName = document.createElement('p');
//         fileName.textContent = file.name;
//         fileName.style.fontSize = '12px';

//         previewItem.appendChild(removeBtn);
//         previewItem.appendChild(fileName);
//         previewContainer.appendChild(previewItem);
//     }

//     // Remove file from preview
//     function removeFile(fileName, previewItem) {
//         selectedFiles = selectedFiles.filter(file => file.name !== fileName);
//         previewContainer.removeChild(previewItem);
//     }
// });

// Due date
document.addEventListener("DOMContentLoaded", function () {
    const projectDueDate = "<%= projectDueDate %>"; 

    // Due date elements
    const dueDateInput = document.getElementById('dueDate');

    function initializeDueDate() {
        flatpickr("#dueDate", {
            locale: "th",
            dateFormat: "j F Y",
            altFormat: "Y-m-d",
            minDate: "today",
            maxDate: projectDueDate,
            onReady: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                if (calendar) {
                    const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                    if (yearInput) {
                        yearInput.value = parseInt(yearInput.value) + 543;
                        yearInput.addEventListener("input", function () {
                            this.value = this.value.replace(/\d+/, (year) => parseInt(year) + 543);
                        });
                    }
                }
            },
            onChange: function (selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];

                    // ปรับเวลาเป็น 00:00 UTC
                    const utcDate = new Date(Date.UTC(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate()
                    ));

                    // อัปเดตค่าแสดงผลเป็นปี พ.ศ.
                    instance.input.value = dateStr.replace(/\d+$/, (year) => parseInt(year) + 543);

                    // เก็บค่าเป็น ISO Date
                    const isoDate = utcDate.toISOString().split("T")[0];
                    dueDateInput.dataset.isoDate = isoDate;
                }
            },
            onMonthChange: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                if (yearInput) {
                    yearInput.value = parseInt(yearInput.value) + 543;
                }
            },
            onYearChange: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                if (yearInput) {
                    yearInput.value = parseInt(yearInput.value) + 543;
                }
            },
        });
    }
    initializeDueDate();
});

// start date
document.addEventListener("DOMContentLoaded", function () {
    const enableStartDateCheckbox = document.getElementById('enableStartDate');
    const startDateInputDiv = document.getElementById('startdateInput');
    const startDateInput = document.getElementById('startDate');
    const projectDueDate = "<%= projectDueDate %>"; 

    function initializeStartDate() {
        enableStartDateCheckbox.addEventListener('change', function () {
            startDateInput.disabled = !this.checked;
            if (!this.checked) {
                startDateInput.value = '';
                startDateInput.dataset.isoDate = '';
                startDateInputDiv.classList.add('disabled-opacity');
            } else {
                startDateInputDiv.classList.remove('disabled-opacity');
            }
        });

        flatpickr("#startDate", {
            locale: "th",
            dateFormat: "j F Y",
            altFormat: "Y-m-d",
            minDate: "today",
            maxDate: projectDueDate,
            onReady: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                if (calendar) {
                    const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                    if (yearInput) {
                        yearInput.value = parseInt(yearInput.value) + 543;
                        yearInput.addEventListener("input", function () {
                            this.value = this.value.replace(/\d+/, (year) => parseInt(year) + 543);
                        });
                    }
                }
            },
            onChange: function (selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];

                    // Adjust selected date to midnight UTC
                    const utcDate = new Date(Date.UTC(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate()
                    ));

                    // Update the input field for display with Thai year
                    instance.input.value = dateStr.replace(/\d+$/, (year) => parseInt(year) + 543);

                    const isoStartDate = utcDate.toISOString().split("T")[0]; // YYYY-MM-DD
                    startDateInput.dataset.isoDate = isoStartDate; // Store ISO date
                }
            },
            onMonthChange: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                if (yearInput) {
                    yearInput.value = parseInt(yearInput.value) + 543; // Update year for month navigation
                }
            },
            onYearChange: function (selectedDates, dateStr, instance) {
                const calendar = instance.calendarContainer;
                const yearInput = calendar.querySelector(".numInput.flatpickr-year");
                if (yearInput) {
                    yearInput.value = parseInt(yearInput.value) + 543; // Update year for year navigation
                }
            },
        });
        startDateInputDiv.classList.add("disabled-opacity");
    }
    initializeStartDate();
}
);