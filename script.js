// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwNCmnae3f1gyYl4-wlVkvZRras9TqXvR-Cq2GAgqRi2T_aVw8_tEdZimfAwHIM1_k7g/exec';

// Global variables
let allTasks = [];
let filteredTasks = [];
let currentPage = 1;
const tasksPerPage = 10;
let editingTaskId = null;

// DOM elements
const createTaskBtn = document.getElementById('createTaskBtn');
const taskModal = document.getElementById('taskModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const taskForm = document.getElementById('taskForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const priorityFilter = document.getElementById('priorityFilter');
const taskList = document.getElementById('taskList');
const pagination = document.getElementById('pagination');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    createTaskBtn.addEventListener('click', openCreateModal);
    closeModal.addEventListener('click', closeTaskModal);
    cancelBtn.addEventListener('click', closeTaskModal);
    taskForm.addEventListener('submit', handleFormSubmit);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    priorityFilter.addEventListener('change', handleSearch);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === taskModal) {
            closeTaskModal();
        }
    });
}

// Load tasks from Google Sheets
async function loadTasks() {
    try {
        showLoading(true);
        
        // JSONP so'rovi Google Apps Script uchun
        const script = document.createElement('script');
        const callbackName = 'handleTasksResponse';
        
        window[callbackName] = function(data) {
            allTasks = data || [];
            filteredTasks = [...allTasks];
            renderTasks();
            showLoading(false);
            document.head.removeChild(script);
            delete window[callbackName];
        };
        
        script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}`;
        document.head.appendChild(script);
        
    } catch (error) {
        console.error('Task yuklashda xatolik:', error);
        showMessage('Task yuklab bo\\'lmadi. Iltimos qaytadan urinib ko\\'ring.', 'error');
        showLoading(false);
    }
}

// Render tasks
function renderTasks() {
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    const tasksToShow = filteredTasks.slice(startIndex, endIndex);
    
    if (tasksToShow.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>Hech qanday task topilmadi</h3>
                <p>Yangi task qo'shish uchun "Yangi Task" tugmasini bosing</p>
            </div>
        `;
        pagination.innerHTML = '';
        return;
    }
    
    const tasksHTML = tasksToShow.map(task => `
        <div class="task-item">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <span class="task-priority priority-${task.priority.toLowerCase().replace(\"'\", \"\")}">${task.priority}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-edit" onclick="editTask(${task.id})">Tahrirlash</button>
                    <button class="btn-danger" onclick="deleteTask(${task.id})">O'chirish</button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <span>Muddat: ${task.deadline || 'Belgilanmagan'}</span>
                <span>Yaratilgan: ${task.created}</span>
            </div>
        </div>
    `).join('');
    
    taskList.innerHTML = tasksHTML;
    renderPagination();
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Oldingi</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="active">${i}</button>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `<button disabled>...</button>`;
        }
    }
    
    // Next button
    paginationHTML += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Keyingi</button>`;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    renderTasks();
}

// Search and filter
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const priorityFilterValue = priorityFilter.value;
    
    filteredTasks = allTasks.filter(task => {
        const matchesSearch = !searchTerm || 
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm);
        
        const matchesPriority = !priorityFilterValue || task.priority === priorityFilterValue;
        
        return matchesSearch && matchesPriority;
    });
    
    currentPage = 1;
    renderTasks();
}

// Modal functions
function openCreateModal() {
    editingTaskId = null;
    modalTitle.textContent = 'Yangi Task';
    saveBtn.textContent = 'Saqlash';
    taskForm.reset();
    taskModal.style.display = 'block';
}

function closeTaskModal() {
    taskModal.style.display = 'none';
    editingTaskId = null;
    taskForm.reset();
}

// Handle form submit
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        created: editingTaskId ? getTaskById(editingTaskId).created : new Date().toLocaleString('uz-UZ')
    };
    
    if (editingTaskId) {
        updateTask(editingTaskId, formData);
    } else {
        createTask(formData);
    }
}

// Create task
function createTask(formData) {
    showMessage('Task yaratilmoqda...', 'info');
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = '_blank';
    
    Object.keys(formData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
    });
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    showMessage('Task muvaffaqiyatli yaratildi!', 'success');
    closeTaskModal();
    
    // Refresh tasks after a delay
    setTimeout(loadTasks, 2000);
}

// Edit task
function editTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    modalTitle.textContent = 'Task tahrirlash';
    saveBtn.textContent = 'Yangilash';
    
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('priority').value = task.priority;
    document.getElementById('deadline').value = task.deadline;
    
    taskModal.style.display = 'block';
}

// Update task
function updateTask(taskId, formData) {
    showMessage('Task yangilanmoqda...', 'info');
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = '_blank';
    
    // Add action and id for update
    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'update';
    form.appendChild(actionInput);
    
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id';
    idInput.value = taskId;
    form.appendChild(idInput);
    
    Object.keys(formData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
    });
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    showMessage('Task muvaffaqiyatli yangilandi!', 'success');
    closeTaskModal();
    
    // Refresh tasks after a delay
    setTimeout(loadTasks, 2000);
}

// Delete task
function deleteTask(taskId) {
    if (!confirm('Bu taskni o\\'chirishni xohlaysizmi?')) return;
    
    showMessage('Task o\\'chirilmoqda...', 'info');
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = '_blank';
    
    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'delete';
    form.appendChild(actionInput);
    
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id';
    idInput.value = taskId;
    form.appendChild(idInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    showMessage('Task muvaffaqiyatli o\\'chirildi!', 'success');
    
    // Refresh tasks after a delay
    setTimeout(loadTasks, 2000);
}

// Utility functions
function getTaskById(id) {
    return allTasks.find(task => task.id == id);
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
    
    // Auto hide success messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}