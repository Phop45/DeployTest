// calenda
document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('calendarItem');
    var taskListContent = document.querySelector('.taskListContent');
    var taskListHeader = document.querySelector('.taskListHeader'); 

    if (!taskListContent || !taskListHeader) {
        console.error('taskListContent or taskListHeader element not found');
        return; // Stop execution if the elements are not found
    }

    // Fetch today's tasks on page load
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    fetch(`/api/tasks?date=${today}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            return response.json();
        })
        .then(data => {
            renderTasks(data);
        })
        .catch(error => {
            console.error('Error fetching today\'s tasks:', error);
            taskListContent.innerHTML = '<p>เกิดข้อผิดพลาดในการดึงข้อมูลงาน</p>';
        });

    // Function to render tasks
    function renderTasks(tasks) {
        taskListContent.innerHTML = '';
        if (tasks.length > 0) {
            tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.style.marginBottom = '10px';
                taskItem.innerHTML = `
                    <div class="resultItem">
                        <div class="detailContent">
                            <p id="todayTaskName">${task.taskName}</p>
                            <div class="moreDetail">
                                <div class="priItemCalenda" style="background-color: ${task.priority.color};">
                                    <i class="fa-solid ${task.priority.icon}"></i>
                                    <p class="priItemCalendaText">${task.priority.text}</p>
                                </div>
                                <span style="background-color: ${task.status.color};">${task.status.text}</span>
                            </div>
                        </div>
                    </div>
                `;
                taskListContent.appendChild(taskItem);
            });
        } else {
            taskListContent.innerHTML = '<p id="noTaskToday">ไม่มีงานที่ต้องส่งวันนี้</p>';
        }
    }

    var calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'th',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next',
        },
        buttonText: {
            today: 'วันนี้',
            month: 'เดือน',
        },
        events: '/getCalendarTasks',
        eventContent: function (info) {
            const taskDate = info.event.startStr;
            const taskCount = info.event.extendedProps.taskCount || 0;

            const eventContent = document.createElement('div');
            eventContent.classList.add('event-item');
            if (taskDate === today) {
                eventContent.classList.add('today-event-highlight'); // Highlight today's events
            }
            eventContent.innerHTML = `
                <div id="eventList" style="cursor: pointer;">
                </div>
            `;

            eventContent.querySelector('#eventList').addEventListener('click', function () {
                const clickedDate = info.event.startStr;
                console.log('Clicked Date:', clickedDate); // Debugging line
                const formattedDate = new Date(clickedDate);
                const dateStr = `${formattedDate.getDate()} ${formattedDate.toLocaleString('th-TH', { month: 'long' })}`;

                // Change header to show the selected date's message
                taskListHeader.innerHTML = `📅 งานที่ต้องส่งในวันที่ ${dateStr}`;

                fetch(`/api/tasks?date=${clickedDate}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to fetch tasks');
                        }
                        return response.json();
                    })
                    .then(renderTasks)
                    .catch(error => {
                        console.error('Error fetching tasks:', error);
                        taskListContent.innerHTML = '<p>เกิดข้อผิดพลาดในการดึงข้อมูลงาน</p>';
                    });
            });

            return { domNodes: [eventContent] };
        },
        dateClick: function (info) {
            const clickedDate = info.dateStr; // Get the clicked date
            const formattedDate = new Date(clickedDate);
            const dateStr = `${formattedDate.getDate()} ${formattedDate.toLocaleString('th-TH', { month: 'long' })}`;

            // Change header to show the selected date's message
            taskListHeader.innerHTML = `📅 งานที่ต้องส่งในวันที่  ${dateStr}`;

            fetch(`/api/tasks?date=${clickedDate}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch tasks');
                    }
                    return response.json();
                })
                .then(renderTasks)
                .catch(error => {
                    console.error('Error fetching tasks:', error);
                    taskListContent.innerHTML = '<p>เกิดข้อผิดพลาดในการดึงข้อมูลงาน</p>';
                });
        },
    });

    calendar.render();
});

// project item click
document.addEventListener('DOMContentLoaded', () => {
    const projectItems = document.querySelectorAll('.projectItem');

    projectItems.forEach(item => {
        item.addEventListener('click', () => {
            const link = item.getAttribute('data-link');
            if (link) {
                window.location.href = link;
            }
        });
    });
});
