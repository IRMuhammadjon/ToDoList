const API_URL = 'https://script.google.com/macros/s/AKfycbxRHDpud-K76lEgDxoWyFYAdjRMta0k-mwVPUfd525TUfnZpCW8RBx9bfi8gOCkKqbtvw/exec';

let allTasks = [];
let filteredTasks = [];
let currentPage = 1;
const tasksPerPage = 10;
let editingTaskId = null;
let currentSheet = '';
let allSheets = [];

document.addEventListener('DOMContentLoaded', function() {
    loadSheets();
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
    
    // Sheet events
    document.getElementById('createSheetBtn').addEventListener('click', openSheetModal);
    document.getElementById('closeSheetModal').addEventListener('click', closeSheetModal);
    document.getElementById('cancelSheetBtn').addEventListener('click', closeSheetModal);
    document.getElementById('sheetForm').addEventListener('submit', handleSheetSubmit);
    document.getElementById('sheetSelector').addEventListener('change', handleSheetChange);
    
    window.addEventListener('click', function(e) {
        if (e.target === document.getElementById('taskModal')) {
            closeModal();
        }
        if (e.target === document.getElementById('sheetModal')) {
            closeSheetModal();
        }
    });
}

// Load sheets first
function loadSheets() {
    window.handleResponse = function(data) {
        allSheets = data || [];
        populateSheetSelector();
        
        // Load first sheet by default
        if (allSheets.length > 0) {
            currentSheet = allSheets[0].name;
            document.getElementById('sheetSelector').value = currentSheet;
            loadTasks();
        }
        
        // Clean up
        document.head.removeChild(script);
        delete window.handleResponse;
    };
    
    const script = document.createElement('script');
    script.src = API_URL + '?action=getSheets&callback=handleResponse';
    script.onerror = function() {
        showMessage('Sheet listini yuklab bolmadi', 'error');
        document.head.removeChild(script);
        delete window.handleResponse;
    };
    
    document.head.appendChild(script);
}

function loadTasks() {
    if (!currentSheet) {
        showMessage('Iltimos sheet tanlang', 'error');
        return;
    }
    
    showLoading(true);
    
    // JSONP callback function
    window.handleResponse = function(data) {
        allTasks = data || [];
        filteredTasks = allTasks.slice();
        renderTasks();
        showLoading(false);
        
        // Clean up
        document.head.removeChild(script);
        delete window.handleResponse;
    };
    
    // Create JSONP request
    const script = document.createElement('script');
    script.src = API_URL + '?action=getTasks&sheet=' + encodeURIComponent(currentSheet) + '&callback=handleResponse';
    script.onerror = function() {
        showMessage('Malumot yuklab bolmadi', 'error');
        showLoading(false);
        document.head.removeChild(script);
        delete window.handleResponse;
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
    if (!currentSheet) {
        showMessage('Iltimos sheet tanlang', 'error');
        return;
    }
    
    showMessage('Task yaratilmoqda...', 'info');
    
    formData.sheet = currentSheet;
    
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
    formData.sheet = currentSheet;
    
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
        id: taskId,
        sheet: currentSheet
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

// Sheet management functions
function populateSheetSelector() {
    const selector = document.getElementById('sheetSelector');
    selector.innerHTML = '<option value="">Sheet tanlash...</option>';
    
    allSheets.forEach(function(sheet) {
        const option = document.createElement('option');
        option.value = sheet.name;
        option.textContent = sheet.name;
        selector.appendChild(option);
    });
}

function handleSheetChange() {
    const selectedSheet = document.getElementById('sheetSelector').value;
    if (selectedSheet && selectedSheet !== currentSheet) {
        currentSheet = selectedSheet;
        currentPage = 1;
        loadTasks();
    }
}

function openSheetModal() {
    document.getElementById('sheetModal').style.display = 'block';
}

function closeSheetModal() {
    document.getElementById('sheetModal').style.display = 'none';
    document.getElementById('sheetForm').reset();
}

function handleSheetSubmit(e) {
    e.preventDefault();
    
    const sheetName = document.getElementById('sheetName').value.trim();
    if (!sheetName) {
        showMessage('Sheet nomini kiriting', 'error');
        return;
    }
    
    createSheet(sheetName);
}

function createSheet(sheetName) {
    showMessage('Sheet yaratilmoqda...', 'info');
    
    const formData = {
        action: 'createSheet',
        sheetName: sheetName
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
        showMessage('Sheet yaratildi!', 'success');
        closeSheetModal();
        setTimeout(function() {
            loadSheets(); // Reload sheets to update selector
        }, 1000);
    }).catch(function(error) {
        showMessage('Sheet yaratildi!', 'success');
        closeSheetModal();
        setTimeout(function() {
            loadSheets();
        }, 1000);
    });
}