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

document.addEventListener('DOMContentLoaded', function () {
    // เลือก dropdowns ทั้งหมด
    const dropdownToggles = document.querySelectorAll('[id^="dropdown-toggle-"]');

    dropdownToggles.forEach(toggle => {
        const spaceId = toggle.id.split('-')[2]; // แยก _id ออกมา
        const dropdownMenu = document.getElementById(`dropdown-taskedit-${spaceId}`);

        toggle.addEventListener('click', function (event) {
            event.stopPropagation();

            // ปิด dropdown อื่นๆ ก่อน
            document.querySelectorAll('.dropdown-taskedit').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.display = 'none';
                }
            });

            // สลับการแสดง dropdown ปัจจุบัน
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '' ? 'block' : 'none';
        });

        // เมื่อคลิก "เปลี่ยนชื่อ"
        const editItem = dropdownMenu.querySelector('.dropdown-taskedit-item');
        editItem.addEventListener('click', function (event) {
            event.preventDefault();
            // ซ่อน <a> แสดงชื่อพื้นที่
            document.querySelector(`.space-name-display-${spaceId}`).style.display = 'none';
            // แสดงฟอร์มแก้ไข
            document.querySelector(`.space-name-edit-form-${spaceId}`).style.display = 'block';
        });

        document.addEventListener('click', function (event) {
            if (!dropdownMenu.contains(event.target) && event.target !== toggle) {
                dropdownMenu.style.display = 'none';
            }
        });
    });
});

// ฟังก์ชันส่งฟอร์มเมื่อเปลี่ยนรูปภาพ
function submitForm(spaceId) {
    const form = document.getElementById('upload-form');
    const input = document.getElementById('file-input-' + spaceId);

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