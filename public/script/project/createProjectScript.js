// Member Modal
document.addEventListener('DOMContentLoaded', () => {
    const viewAllBtn = document.querySelector('.viewAllBtn');
    const assignMemberModal = document.querySelector('.assignMemberModal');
    const overlay = document.querySelector('#overlay');
    const searchUserInput = document.querySelector('#searchUser');
    const modalContentTable = document.querySelector('.modalContent table');
    const modalSelectedDiv = document.querySelector('.modalSelected');
    const confirmSelectionButton = document.querySelector('#confirmSelectionButton');
    const membersInput = document.querySelector('#members');
    const selectedMembersDiv = document.querySelector('#selectedMembers');
    const closeModalIcon = document.querySelector('#closeModal'); 
    const selectedMembers = [];

    let selectedUsers = [];
    let userData = [];
    let currentUserId;

    // Show modal
    viewAllBtn.addEventListener('click', () => {
        assignMemberModal.classList.add('show');
        overlay.classList.add('show');
        fetchCurrentUserId();
    });

    // Hide modal when clicked outside
    assignMemberModal.addEventListener('click', (e) => {
        if (e.target === assignMemberModal) {
            assignMemberModal.classList.remove('show');
            overlay.classList.remove('show');
        }
    });

    closeModalIcon.addEventListener('click', () => {
        assignMemberModal.classList.remove('show');
        overlay.classList.remove('show');
    });

    // Fetch current user ID and then fetch users
    async function fetchCurrentUserId() {
        try {
            const response = await fetch('/getUsers'); // Adjust API endpoint
            const currentUser = await response.json();
            currentUserId = currentUser._id;
            fetchUsers(); 
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }

    // Fetch all users
    async function fetchUsers() {
        try {
            const response = await fetch('/getUsers'); // Adjust API endpoint
            userData = await response.json();
            renderUsers(userData.filter(user => user._id !== currentUserId));
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000); // Time difference in seconds
        
        const minutes = Math.floor(diffInSeconds / 60);
        const hours = Math.floor(diffInSeconds / 3600);
        const days = Math.floor(diffInSeconds / 86400);
    
        if (minutes < 1) {
            return 'ไม่กี่วินาทีที่แล้ว';
        } else if (minutes < 60) {
            return `${minutes} นาทีที่แล้ว`;
        } else if (hours < 24) {
            return `${hours} ชั่วโมงที่แล้ว`;
        } else if (days < 30) {
            return `${days} วันที่แล้ว`;
        } else {
            const months = Math.floor(days / 30);
            return `${months} เดือนที่แล้ว`;
        }
    }

    // Render users in the modal table
    function renderUsers(users) {
        const tbody = modalContentTable.querySelector('tbody');
        tbody.innerHTML = '';
    
        // If no users in the list, show a message for no online/offline users
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: gray;">
                        <strong>ไม่มีผู้ใช้ที่ออนไลน์</strong> <!-- For online users -->
                    </td>
                </tr>
            `;
            return;
        }
    
        // Render the users as usual if there are users
        tbody.innerHTML = users.map(user => `
            <tr data-userid="${user._id}" class="${selectedUsers.includes(user._id) ? 'highlight' : ''}">
                <td>
                    <input 
                        type="checkbox" 
                        class="selectUser" 
                        data-userid="${user._id}" 
                        ${selectedUsers.includes(user._id) ? 'checked' : ''}
                    >
                </td>
                <td>
                    <img 
                        src="${user.profileImage}" 
                        class="profile-image" 
                        alt="${user.username}'s Profile Image" 
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="fallback-profile" style="display: none;">
                        <span>
                        ${ user.firstName ? user.firstName[0].toUpperCase() : '' }
                        </span>
                    </div>
                </td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.googleEmail}</td>
                <td><span>ใช้งานล่าสุดเมื่อ ${formatTimeAgo(new Date(user.lastActive))}</span></td>
                <td>
                    <span style="color: ${user.isOnline ? 'green' : 'red'};">
                        ${user.isOnline 
                            ? '<i class="fa-solid fa-signal" style="color: green;"></i> ออนไลน์' 
                            : '<i class="fa-solid fa-signal" style="color: red;"></i> ออฟไลน์'}
                    </span>
                </td>
            </tr>
        `).join('');
    
        // Attach event listeners to checkboxes
        tbody.querySelectorAll('.selectUser').forEach(checkbox => {
            checkbox.addEventListener('change', handleUserSelection);
        });
    }

    // Handle user selection
    function handleUserSelection(e) {
        const userId = e.target.dataset.userid;
        const user = userData.find(u => u._id === userId);

        if (e.target.checked) {
            if (!selectedUsers.some(u => u.id === userId)) {
                selectedUsers.push({
                    id: user._id,  
                    username: user.firstName || user.username,
                    profileImage: user.profileImage
                });
            }
        } else {
            selectedUsers = selectedUsers.filter(u => u.id !== userId);
        }

        updateModalSelected();
        updateHighlighting();
    }

    // Update modalSelected UI and selected members
    function updateModalSelected() {
        // Update modal selected UI with the new selectedUsers array
        modalSelectedDiv.innerHTML = selectedUsers.map(user => {
            return `
                <div class="selected-user" data-userid="${user.id}">
                    <img 
                        src="${user.profileImage}" 
                        class="profile-image" 
                        alt="${user.username}'s Profile Image" 
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="fallback-profile" style="display: none; width: 30px; height: 30px;">
                        <span>${user.username ? user.username[0].toUpperCase() : ''}</span>
                    </div>
                    <span>${user.username}</span>
                    <i class="fa-solid fa-xmark unselect-user" data-userid="${user.id}" style="cursor: pointer;"></i>
                </div>
            `;
        }).join('');

       // Update selected members UI with full user details
        selectedMembersDiv.innerHTML = selectedUsers.map(user => {
            return `
                <div class="member-chip" data-userid="${user.id}">
                    <img 
                        src="${user.profileImage}" 
                        class="profile-image" 
                        alt="${user.username}'s Profile Image" 
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="fallback-profile" style="display: none;">
                        <span>${user.username ? user.username[0].toUpperCase() : ''}</span>
                    </div>
                    <span>${user.username}</span>
                    <i class="fa-solid fa-xmark unselect-user" data-userid="${user.id}" style="cursor: pointer;"></i>
                </div>
            `;
        }).join('');
    
        // Prepare and serialize the list of members
        const members = selectedUsers.map(user => ({
            id: user.id,
            username: user.username
        }));
    
        membersInput.value = JSON.stringify(members); 
    
        // Add event listeners to the unselect user icons
        document.querySelectorAll('.unselect-user').forEach(icon => {
            icon.addEventListener('click', handleUnselectUser);
        });
    }

    // Handle unselecting a user
    function handleUnselectUser(event) {
        const userId = event.target.dataset.userid;
        selectedUsers = selectedUsers.filter(id => id !== userId);

        const checkbox = document.querySelector(`.selectUser[data-userid="${userId}"]`);
        if (checkbox) checkbox.checked = false;

        updateModalSelected();
        updateHighlighting();
    }

    // Update table row highlighting
    function updateHighlighting() {
        document.querySelectorAll('.modalContent table tbody tr').forEach(row => {
            const userId = row.dataset.userid;
            if (selectedUsers.includes(userId)) {
                row.classList.add('highlight');
            } else {
                row.classList.remove('highlight');
            }
        });
    }

    // Confirm button functionality
    confirmSelectionButton.addEventListener('click', () => {
        // Hide the modal and overlay
        assignMemberModal.classList.remove('show');
        overlay.classList.remove('show');
    });

    // Real-time search functionality
    searchUserInput.addEventListener('input', () => {
        const query = searchUserInput.value.toLowerCase();
        const filteredUsers = userData.filter(user =>
            user.firstName?.toLowerCase().includes(query) ||
            user.lastName?.toLowerCase().includes(query) ||
            user.googleEmail?.toLowerCase().includes(query)
        );
        renderUsers(filteredUsers);
    });
    
    // filter content
    const filterNameIcon = document.querySelector('#filterNameIcon');
    const filterContent = document.querySelector('.filterContent');
    const sortUp = document.querySelector('#sortUp'); // Highlighted change
    const sortDown = document.querySelector('#sortDown'); // Highlighted change
    const clearSort = document.querySelector('#clearSort');

    // Toggle visibility of filterContent
    filterNameIcon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click event from propagating to document
        if (filterContent.style.display === 'none' || !filterContent.style.display) {
            // Show filterContent
            filterContent.style.display = 'block';

            // Position filterContent under filterNameIcon
            const rect = filterNameIcon.getBoundingClientRect();
        } else {
            // Hide filterContent
            filterContent.style.display = 'none';
        }
    });

    // Hide filterContent when clicking outside
    document.addEventListener('click', (event) => {
        // Check if the click was outside the filterNameIcon and filterContent
        if (!filterNameIcon.contains(event.target) && !filterContent.contains(event.target)) {
            filterContent.style.display = 'none';
        }
    });

    // Sort users by firstName in ascending order
    sortUp.addEventListener('click', () => { // Highlighted change
        const sortedUsers = [...userData].sort((a, b) => a.firstName.localeCompare(b.firstName, 'th'));
        renderUsers(sortedUsers);
        filterContent.style.display = 'none'; // Hide dropdown
    });

    // Sort users by firstName in descending order
    sortDown.addEventListener('click', () => { // Highlighted change
        const sortedUsers = [...userData].sort((a, b) => b.firstName.localeCompare(a.firstName, 'th'));
        renderUsers(sortedUsers);
        filterContent.style.display = 'none'; // Hide dropdown
    });

    // Clear sorting
    clearSort.addEventListener('click', () => { // Highlighted change
        renderUsers(userData); // Render the original order
        filterContent.style.display = 'none'; // Hide dropdown
    });

    // Filter users by online status
    const filterOnlineIcon = document.querySelector('#filterOnlineIcon');
    const filterContentOnline = document.querySelector('.filterOnlineContent');
    const isOnline = document.querySelector('#isOnline'); // Online filter
    const isOffline = document.querySelector('#isOffline'); // Offline filter clearOnlineSort
    const clearOnlineSort = document.querySelector('#clearOnlineSort');

    // Toggle visibility of filterContentOnline
    filterOnlineIcon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click event from propagating to document
        if (filterContentOnline.style.display === 'none' || !filterContentOnline.style.display) {
            // Show filterContent
            filterContentOnline.style.display = 'block';

            // Position filterContent under filterOnlineIcon
            const rect = filterOnlineIcon.getBoundingClientRect();
        } else {
            // Hide filterContent
            filterContentOnline.style.display = 'none';
        }
    });

    // Hide filterContent when clicking outside
    document.addEventListener('click', () => {
        filterContentOnline.style.display = 'none';
    });

    // Show only online users
    isOnline.addEventListener('click', () => {
        const onlineUsers = userData.filter(user => user.isOnline);
        renderUsers(onlineUsers);
        filterContentOnline.style.display = 'none'; // Hide dropdown
    });

    // Show only offline users
    isOffline.addEventListener('click', () => {
        const offlineUsers = userData.filter(user => !user.isOnline);
        renderUsers(offlineUsers);
        filterContentOnline.style.display = 'none'; // Hide dropdown
    });

    // Clear sorting
    clearOnlineSort.addEventListener('click', () => { // Highlighted change
        renderUsers(userData); // Render the original order
        filterContent.style.display = 'none'; // Hide dropdown
    });

    // Prepare form data logic
    async function prepareFormData() {
        const projectName = document.getElementById("projectName").value.trim();
        const isoDate = dueDateInput.dataset.isoDate;
        if (isoDate) {
            dueDateInput.value = isoDate;
        }
        const membersInput = document.getElementById("members");
        membersInput.value = JSON.stringify(selectedMembers || []);

        const response = await fetch('/checkExistingProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projectName })
        });

        const result = await response.json();

        if (result.exists) {
            window.alert("คุณมีโปรเจกต์ชื่อนี้อยู่แล้ว กรุณาใส่ชื่อโปรเจกต์ใหม่");
            return true;
        }

        return false;
    }

    // Form submission logic
    document.querySelector('#createProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await prepareFormData()) {
            return;
        }

        const projectName = document.querySelector('#projectName').value.trim();
        const projectDetail = document.querySelector('#projectDetail').value.trim();
        const projectDueDate = document.querySelector('#dueDateInput').value;
        const members = JSON.parse(membersInput.value);

        const formData = {
            projectName,
            projectDetail,
            projectDueDate,
            collaborators: members,
        };

        try {
            const response = await fetch('/createProject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            if (result.success) {
                alert('Project created successfully!');
                window.location.reload();
            } else {
                alert('Error creating project: ' + result.message);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('An error occurred. Please try again.');
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // due date logic and other initializations remain the same...
    const enableDueDateCheckbox = document.getElementById('enableDueDate');
    const dueDateInputDiv = document.getElementById('dueDateInput');
    const dueDateInput = document.getElementById('dueDate');
    const dateCountDiv = document.querySelector('.dateCount');

    function initializeDueDate() {
        // Existing initialization code for due date logic
        enableDueDateCheckbox.addEventListener('change', function () {
            dueDateInput.disabled = !this.checked;
            if (!this.checked) {
                dueDateInput.value = '';
                dueDateInput.dataset.isoDate = '';
                dueDateInputDiv.classList.add('disabled-opacity');
                dateCountDiv.textContent = 'ระยะเวลาในการทำโปรเจกต์อยู่ที่: ';
            } else {
                dueDateInputDiv.classList.remove('disabled-opacity');
            }
        });

        flatpickr("#dueDate", {
            locale: "th",
            dateFormat: "j F Y",
            altFormat: "Y-m-d",
            minDate: "today",
            onReady: function (selectedDates, dateStr, instance) {
                // Flatpickr setup logic remains unchanged
            },
            onChange: function (selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];
                    const utcDate = new Date(Date.UTC(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate()
                    ));
                    instance.input.value = dateStr.replace(/\d+$/, (year) => parseInt(year) + 543);
                    updateDateCount(selectedDate);
                    const isoDate = utcDate.toISOString().split("T")[0];
                    dueDateInput.dataset.isoDate = isoDate;
                }
            },
        });
        dueDateInputDiv.classList.add("disabled-opacity");
    }

    const updateDateCount = (dueDate) => {
        if (!dueDate) {
            dateCountDiv.textContent = "ระยะเวลาในการทำโปรเจกต์อยู่ที่: ";
            return;
        }
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Check if the diffDays span already exists
        let diffDaysSpan = document.getElementById('diffDays');
        if (!diffDaysSpan) {
            // If it doesn't exist, create it
            diffDaysSpan = document.createElement('span');
            diffDaysSpan.id = 'diffDays';
            dateCountDiv.innerHTML = `ระยะเวลาในการทำโปรเจกต์อยู่ที่: `;
            dateCountDiv.appendChild(diffDaysSpan);
        }
        // Update the content of the diffDays span
        diffDaysSpan.textContent = `${diffDays} วัน`;
    };
    initializeDueDate();

    // Handle project details
    const detailTextarea = document.getElementById("projectDetail");
    if (detailTextarea) {
        detailTextarea.addEventListener("focus", function () {
            detailTextarea.style.transition = "height 0.3s ease-in-out";
            detailTextarea.style.height = "100px";
        });

        detailTextarea.addEventListener("blur", function () {
            if (!detailTextarea.value) {
                detailTextarea.style.height = "40px";
            }
        });

        detailTextarea.addEventListener("input", function () {
            if (detailTextarea.value) {
                detailTextarea.style.height = "100px";
            }
        });
    }

    // Handle project cover upload
    const projectCoverInput = document.getElementById("projectCover");
    const coverPreview = document.getElementById("coverPreview");
    if (projectCoverInput && coverPreview) {
        projectCoverInput.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    coverPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Prepare form data logic
    async function prepareFormData() {
        const projectName = document.getElementById("projectName").value.trim();
        const isoDate = dueDateInput.dataset.isoDate;
        if (isoDate) {
            dueDateInput.value = isoDate;
        }
        const membersInput = document.getElementById("members");
        membersInput.value = JSON.stringify(selectedMembers || []);

        const response = await fetch('/checkExistingProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projectName })
        });

        const result = await response.json();

        if (result.exists) {
            window.alert("คุณมีโปรเจกต์ชื่อนี้อยู่แล้ว กรุณาใส่ชื่อโปรเจกต์ใหม่");
            return true;
        }

        return false;
    }

    // Form submission logic
    document.querySelector('#createProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await prepareFormData()) {
            return;
        }
    
        const projectName = document.querySelector('#projectName').value.trim();
        const projectDetail = document.querySelector('#projectDetail').value.trim();
        const projectDueDate = document.querySelector('#dueDateInput').value;
        const members = JSON.parse(membersInput.value); // Get the selected members, now including data-userid
    
        const formData = {
            projectName,
            projectDetail,
            projectDueDate,
            collaborators: members,
        };
    
        try {
            const response = await fetch('/createProject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
    
            const result = await response.json();
            if (result.success) {
                alert('Project created successfully!');
                window.location.reload();
            } else {
                alert('Error creating project: ' + result.message);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('An error occurred. Please try again.');
        }
    });
});


