function deleteSpace(spaceId) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพื้นที่นี้?')) {
        const form = document.getElementById(`delete-space-form-${spaceId}`);
        fetch(form.action, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('พื้นที่ถูกลบเรียบร้อยแล้ว');
                    location.reload(); // Refresh the page to reflect changes
                } else {
                    alert('ไม่สามารถลบพื้นที่ได้: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('เกิดข้อผิดพลาดขณะลบพื้นที่');
            });
    }
}

// update name
document.addEventListener('DOMContentLoaded', function () {
    const dropdownToggles = document.querySelectorAll('[id^="dropdown-toggle-"]');

    dropdownToggles.forEach(toggle => {
        const spaceId = toggle.id.split('-')[2];
        const dropdownMenu = document.getElementById(`dropdown-taskedit-${spaceId}`);
        const editItem = document.getElementById(`editSpaceName-${spaceId}`);
        const inputField = document.getElementById(`card-title-input-${spaceId}`);
        const alertText = document.querySelector(`#editsubnameform-${spaceId} .alretText`);
        const editForm = document.getElementById(`editsubnameform-${spaceId}`);

        // Toggle dropdown visibility
        toggle.addEventListener('click', function (event) {
            event.stopPropagation();

            document.querySelectorAll('.dropdown-taskedit').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.display = 'none';
                }
            });

            dropdownMenu.style.display =
                dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '' ? 'block' : 'none';
        });

        // Handle edit item click
        editItem.addEventListener('click', function (event) {
            event.preventDefault();
            const spaceNameCard = document.getElementById(`spaceNameCard-${spaceId}`);
            if (spaceNameCard) spaceNameCard.style.display = 'none'; // Hide the project name
            if (editForm) {
                editForm.style.display = 'block'; // Show the edit form
                if (inputField) inputField.focus(); // Focus on the input field
            }
        });

        // Validate input in real-time
        inputField.addEventListener('input', function () {
            const spaceName = inputField.value.trim();
            validateSpaceName(spaceName);
        });

        // Prevent form submission on Enter if validation fails
        editForm.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const spaceName = inputField.value.trim();
                if (validateSpaceName(spaceName)) {
                    editForm.submit(); // Submit form only if validation passes
                }
            }
        });

        // Prevent form submission on submit button click if validation fails
        editForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const spaceName = inputField.value.trim();

            if (!validateSpaceName(spaceName)) return; // Prevent form submission if validation fails

            // Proceed with sending the request if validation passes
            try {
                const response = await fetch(`/updateSpaceName/${spaceId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ SpaceName: spaceName }),
                });

                const data = await response.json();

                if (data.success) {
                    location.reload(); // Refresh the page to show the updated name
                } else {
                    alertText.textContent = 'Failed to update space name.';
                    alertText.style.color = 'red';
                }
            } catch (error) {
                console.error('Error updating space name:', error);
                alertText.textContent = 'An error occurred. Please try again.';
                alertText.style.color = 'red';
            }
        });

        // Hide dropdown on outside click
        document.addEventListener('click', function (event) {
            if (!dropdownMenu.contains(event.target) && event.target !== toggle) {
                dropdownMenu.style.display = 'none';
            }
        });

        // Validation function
        function validateSpaceName(spaceName) {
            const alphanumericWithSpacesRegex = /^[a-zA-Z0-9ก-๙\s]+$/;

            if (!spaceName) {
                alertText.textContent = 'โปรดป้อนชื่อโปรเจกต์ที่ไม่ว่างเปล่า';
                alertText.style.color = 'red';
                return false;
            }

            if (!alphanumericWithSpacesRegex.test(spaceName)) {
                alertText.textContent = 'ชื่อโปรเจกต์ต้องเป็นตัวอักษร ตัวเลข และช่องว่างเท่านั้น';
                alertText.style.color = 'red';
                return false;
            }

            alertText.textContent = ''; // Clear any previous error messages
            return true;
        }
    });
});

// ฟังก์ชันส่งฟอร์มเมื่อเปลี่ยนรูปภาพ
function submitForm(spaceId) {
    const form = document.getElementById(`upload-form-${spaceId}`);
    const input = document.getElementById(`file-input-${spaceId}`);

    if (input.files.length > 0) {
        form.submit();
    }
}

// Prevent clicks on taskedit from triggering the parent link
document.addEventListener("DOMContentLoaded", () => {
    const taskEdits = document.querySelectorAll(".taskedit");

    taskEdits.forEach((taskEdit) => {
        taskEdit.addEventListener("click", (event) => {
            event.preventDefault(); // Prevent the default <a> navigation
            event.stopPropagation(); // Stop the event from bubbling up to the parent
        });
    });
});

function sortProjects(order) {
    const taskCardsContainer = document.querySelector('.taskcardall');
    const taskCards = Array.from(taskCardsContainer.children);

    taskCards.forEach(card => {
        console.log(card.getAttribute('data-created-at'));
    });

    // Sort the task cards based on the `data-created-at` attribute
    taskCards.sort((a, b) => {
        const createdAtA = new Date(a.getAttribute('data-created-at'));
        const createdAtB = new Date(b.getAttribute('data-created-at'));

        // Handle sorting based on the order
        if (order === 'latest') {
            return createdAtA - createdAtB; // Sort latest to oldest
        } else if (order === 'oldest') {
            return createdAtB - createdAtA; // Sort oldest to latest
        }
    });

    taskCards.forEach(card => {
        console.log(card.getAttribute('data-created-at'));
    });

    // Clear the container and re-add the sorted task cards
    taskCardsContainer.innerHTML = ''; // Clear the container
    taskCards.forEach(card => taskCardsContainer.appendChild(card)); // Append sorted cards

    // Toggle visibility of sort options
    const latestSort = document.getElementById('latestSort');
    const oldestSort = document.getElementById('oldestSort');

    if (order === 'latest') {
        latestSort.style.display = 'none';
        oldestSort.style.display = 'inline';
    } else if (order === 'oldest') {
        latestSort.style.display = 'inline';
        oldestSort.style.display = 'none';
    }
}