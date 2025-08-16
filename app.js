const API_URL = 'https://script.google.com/macros/s/AKfycbyFoD2iRpM0svaHLYJp0tUMl8kAfIHUa5eQBG7Ey0-nwHTUY6WpAvu7IQ0YGt5CwwuScQ/exec';

let allTasks = [];
let filteredTasks = [];
let currentPage = 1;
const tasksPerPage = 10;
let editingTaskId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    setupEvents();
});

function setupEvents() {
    document.getElementById('createTaskBtn').addEventListener('click', openModal);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('taskForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('priorityFilter').addEventListener('change', handleSearch);
    
    window.addEventListener('click', function(e) {
        if (e.target === document.getElementById('taskModal')) {
            closeModal();
        }
    });
}

function loadTasks() {
    showLoading(true);
    
    // JSONP callback function
    window.handleTasksResponse = function(data) {
        allTasks = data || [];
        filteredTasks = allTasks.slice();
        renderTasks();
        showLoading(false);
        
        // Clean up
        document.head.removeChild(script);
        delete window.handleTasksResponse;
    };
    
    // Create JSONP request
    const script = document.createElement('script');
    script.src = API_URL + '?callback=handleTasksResponse';
    script.onerror = function() {
        showMessage('Ma\'lumot yuklab bo\'lmadi', 'error');
        showLoading(false);
        document.head.removeChild(script);
        delete window.handleTasksResponse;
    };
    
    document.head.appendChild(script);
}

function renderTasks() {
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    const tasksToShow = filteredTasks.slice(startIndex, endIndex);
    
    const taskList = document.getElementById('taskList');
    
    if (tasksToShow.length === 0) {
        taskList.innerHTML = '<div class="empty-state"><h3>Hech qanday task topilmadi</h3><p>Yangi task qoshish uchun "Yangi Task" tugmasini bosing</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    let html = '';
    tasksToShow.forEach(function(task) {
        html += '<div class="task-item">';
        html += '<div class="task-header">';
        html += '<div>';
        html += '<div class="task-title">' + escapeHtml(task.title) + '</div>';
        html += '<span class="task-priority priority-' + task.priority.toLowerCase() + '">' + task.priority + '</span>';
        html += '</div>';
        html += '<div class="task-actions">';
        html += '<button class="btn-edit" onclick="editTask(' + task.id + ')">Edit</button>';
        html += '<button class="btn-danger" onclick="deleteTask(' + task.id + ')">Delete</button>';
        html += '</div>';
        html += '</div>';
        if (task.description) {
            html += '<div class="task-description">' + escapeHtml(task.description) + '</div>';
        }
        html += '<div class="task-meta">';
        html += '<span>Muddat: ' + (task.deadline || 'Yoq') + '</span>';
        html += '<span>Yaratilgan: ' + task.created + '</span>';
        html += '</div>';
        html += '</div>';
    });
    
    taskList.innerHTML = html;
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (currentPage > 1) {
        html += '<button onclick="changePage(' + (currentPage - 1) + ')">Oldingi</button>';
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += '<button class="active">' + i + '</button>';
        } else {
            html += '<button onclick="changePage(' + i + ')">' + i + '</button>';
        }
    }
    
    if (currentPage < totalPages) {
        html += '<button onclick="changePage(' + (currentPage + 1) + ')">Keyingi</button>';
    }
    
    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderTasks();
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const priorityFilter = document.getElementById('priorityFilter').value;
    
    filteredTasks = allTasks.filter(function(task) {
        const matchesSearch = !searchTerm || 
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm);
        
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        
        return matchesSearch && matchesPriority;
    });
    
    currentPage = 1;
    renderTasks();
}

function openModal() {
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'Yangi Task';
    document.getElementById('saveBtn').textContent = 'Saqlash';
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    editingTaskId = null;
    document.getElementById('taskForm').reset();
}

function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        created: editingTaskId ? getTaskById(editingTaskId).created : new Date().toLocaleString()
    };
    
    if (editingTaskId) {
        updateTask(editingTaskId, formData);
    } else {
        createTask(formData);
    }
}

function createTask(formData) {
    showMessage('Task yaratilmoqda...', 'info');
    
    // AJAX so'rov yuborish
    const formBody = Object.keys(formData).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]);
    }).join('&');
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        mode: 'no-cors'
    }).then(function() {
        showMessage('Task yaratildi!', 'success');
        closeModal();
        setTimeout(loadTasks, 1000);
    }).catch(function(error) {
        showMessage('Task yaratildi!', 'success');
        closeModal();
        setTimeout(loadTasks, 1000);
    });
}

function editTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    document.getElementById('modalTitle').textContent = 'Task tahrirlash';
    document.getElementById('saveBtn').textContent = 'Yangilash';
    
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('priority').value = task.priority;
    document.getElementById('deadline').value = task.deadline;
    
    document.getElementById('taskModal').style.display = 'block';
}

function updateTask(taskId, formData) {
    showMessage('Task yangilanmoqda...', 'info');
    
    formData.action = 'update';
    formData.id = taskId;
    
    const formBody = Object.keys(formData).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]);
    }).join('&');
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        mode: 'no-cors'
    }).then(function() {
        showMessage('Task yangilandi!', 'success');
        closeModal();
        setTimeout(loadTasks, 1000);
    }).catch(function(error) {
        showMessage('Task yangilandi!', 'success');
        closeModal();
        setTimeout(loadTasks, 1000);
    });
}

function deleteTask(taskId) {
    if (!confirm('Bu taskni ochirishni xohlaysizmi?')) return;
    
    showMessage('Task ochirilmoqda...', 'info');
    
    const formData = {
        action: 'delete',
        id: taskId
    };
    
    const formBody = Object.keys(formData).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]);
    }).join('&');
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        mode: 'no-cors'
    }).then(function() {
        showMessage('Task ochirildi!', 'success');
        setTimeout(loadTasks, 1000);
    }).catch(function(error) {
        showMessage('Task ochirildi!', 'success');
        setTimeout(loadTasks, 1000);
    });
}

function getTaskById(id) {
    return allTasks.find(function(task) {
        return task.id == id;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'block' : 'none';
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(function() {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}