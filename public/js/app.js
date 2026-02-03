// Task Manager Pro - Frontend Application
const API_BASE_URL = window.location.origin + '/api';

// State Management
const state = {
    user: null,
    token: localStorage.getItem('token'),
    tasks: [],
    currentFilter: 'all',
    currentPage: 1,
    totalPages: 1,
    stats: {},
    editingTaskId: null,
    deletingTaskId: null,
    searchQuery: '',
    filters: {
        status: '',
        priority: ''
    },
    sort: {
        by: 'created_at',
        order: 'desc'
    }
};

// DOM Elements
const elements = {};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    
    // Check for Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userData = urlParams.get('user');
    
    if (token && userData) {
        // Google OAuth success
        state.token = token;
        state.user = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(state.user));
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, '/');
        
        showApp();
        showToast('success', 'Welcome!', `Hello, ${state.user.username}`);
        return;
    }
    
    // Check for error
    const error = urlParams.get('error');
    if (error) {
        if (error === 'google_not_configured') {
            showToast('warning', 'Notice', 'Google sign-in is not configured. Please use email/password.');
        } else {
            showToast('error', 'Authentication Failed', 'Google sign-in failed. Please try again.');
        }
        window.history.replaceState({}, document.title, '/');
    }
    
    // Check authentication
    if (state.token) {
        validateToken();
    } else {
        showAuth();
    }
});

// Cache DOM Elements
function cacheElements() {
    // Auth
    elements.authContainer = document.getElementById('auth-container');
    elements.appContainer = document.getElementById('app-container');
    elements.loginForm = document.getElementById('login-form');
    elements.registerForm = document.getElementById('register-form');
    elements.forgotPasswordForm = document.getElementById('forgot-password-form');
    elements.showRegister = document.getElementById('show-register');
    elements.showLogin = document.getElementById('show-login');
    elements.showForgotPassword = document.getElementById('show-forgot-password');
    elements.showLoginFromForgot = document.getElementById('show-login-from-forgot');
    
    // App
    elements.sidebar = document.querySelector('.sidebar');
    elements.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    elements.userName = document.getElementById('user-name');
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.pageTitle = document.getElementById('page-title');
    
    // Stats
    elements.statTotal = document.getElementById('stat-total');
    elements.statPending = document.getElementById('stat-pending');
    elements.statInProgress = document.getElementById('stat-in-progress');
    elements.statCompleted = document.getElementById('stat-completed');
    
    // Nav badges
    elements.navAll = document.getElementById('nav-all');
    elements.navPending = document.getElementById('nav-pending');
    elements.navInProgress = document.getElementById('nav-in-progress');
    elements.navCompleted = document.getElementById('nav-completed');
    elements.navHigh = document.getElementById('nav-high');
    
    // Filters
    elements.filterStatus = document.getElementById('filter-status');
    elements.filterPriority = document.getElementById('filter-priority');
    elements.sortBy = document.getElementById('sort-by');
    elements.searchInput = document.getElementById('search-input');
    elements.tasksCount = document.getElementById('tasks-count');
    
    // Tasks
    elements.tasksList = document.getElementById('tasks-list');
    elements.emptyState = document.getElementById('empty-state');
    elements.pagination = document.getElementById('pagination');
    
    // Task Modal
    elements.taskModal = document.getElementById('task-modal');
    elements.modalTitle = document.getElementById('modal-title');
    elements.taskForm = document.getElementById('task-form');
    elements.modalClose = document.getElementById('modal-close');
    elements.cancelTask = document.getElementById('cancel-task');
    elements.addTaskBtn = document.getElementById('add-task-btn');
    
    // Task Form Fields
    elements.taskId = document.getElementById('task-id');
    elements.taskTitle = document.getElementById('task-title');
    elements.taskDescription = document.getElementById('task-description');
    elements.taskStatus = document.getElementById('task-status');
    elements.taskPriority = document.getElementById('task-priority');
    elements.taskDueDate = document.getElementById('task-due-date');
    
    // Delete Modal
    elements.deleteModal = document.getElementById('delete-modal');
    elements.deleteModalClose = document.getElementById('delete-modal-close');
    elements.cancelDelete = document.getElementById('cancel-delete');
    elements.confirmDelete = document.getElementById('confirm-delete');
    
    // Toast & Loading
    elements.toastContainer = document.getElementById('toast-container');
    elements.loadingOverlay = document.getElementById('loading-overlay');
}

// Bind Events
function bindEvents() {
    // Auth
    elements.showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('register');
    });
    
    elements.showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('login');
    });
    
    elements.showForgotPassword?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('forgot');
    });
    
    elements.showLoginFromForgot?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('login');
    });
    
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.registerForm?.addEventListener('submit', handleRegister);
    elements.forgotPasswordForm?.addEventListener('submit', handleForgotPassword);
    
    // Password toggles
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', togglePassword);
    });
    
    // App
    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.mobileMenuToggle?.addEventListener('click', toggleMobileMenu);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = item.dataset.filter;
            if (filter) setFilter(filter);
        });
    });
    
    // Filters
    elements.filterStatus?.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        state.currentPage = 1;
        loadTasks();
    });
    
    elements.filterPriority?.addEventListener('change', (e) => {
        state.filters.priority = e.target.value;
        state.currentPage = 1;
        loadTasks();
    });
    
    elements.sortBy?.addEventListener('change', (e) => {
        state.sort.by = e.target.value;
        loadTasks();
    });
    
    elements.searchInput?.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        loadTasks();
    }, 300));
    
    // Task Modal
    elements.addTaskBtn?.addEventListener('click', () => openTaskModal());
    elements.modalClose?.addEventListener('click', closeTaskModal);
    elements.cancelTask?.addEventListener('click', closeTaskModal);
    elements.taskForm?.addEventListener('submit', handleTaskSubmit);
    
    // Delete Modal
    elements.deleteModalClose?.addEventListener('click', closeDeleteModal);
    elements.cancelDelete?.addEventListener('click', closeDeleteModal);
    elements.confirmDelete?.addEventListener('click', confirmDeleteTask);
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeTaskModal();
            closeDeleteModal();
        });
    });
    
    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            elements.sidebar?.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !elements.mobileMenuToggle.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });
}

// ===== Auth Functions =====

function showAuthForm(formName) {
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.add('hidden');
    elements.forgotPasswordForm.classList.add('hidden');
    
    if (formName === 'login') {
        elements.loginForm.classList.remove('hidden');
    } else if (formName === 'register') {
        elements.registerForm.classList.remove('hidden');
    } else if (formName === 'forgot') {
        elements.forgotPasswordForm.classList.remove('hidden');
    }
}

function toggleAuthForms() {
    showAuthForm(elements.loginForm.classList.contains('hidden') ? 'login' : 'register');
}

function togglePassword(e) {
    const targetId = e.currentTarget.dataset.target;
    const input = document.getElementById(targetId);
    const icon = e.currentTarget.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.token = data.data.token;
            state.user = data.data;
            localStorage.setItem('token', state.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            showApp();
            showToast('success', 'Welcome back!', `Hello, ${data.data.username}`);
        } else {
            showToast('error', 'Login Failed', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to connect to server');
    } finally {
        hideLoading();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('forgot-email').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Email Sent', 'Check your inbox for reset instructions');
            showAuthForm('login');
            document.getElementById('forgot-password-form').reset();
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to send reset email');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.token = data.data.token;
            state.user = data.data;
            localStorage.setItem('token', state.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            showApp();
            showToast('success', 'Account Created', 'Welcome to Task Manager Pro!');
        } else {
            showToast('error', 'Registration Failed', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to connect to server');
    } finally {
        hideLoading();
    }
}

async function validateToken() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            state.user = JSON.parse(localStorage.getItem('user')) || data.data;
            showApp();
        } else {
            logout();
        }
    } catch (error) {
        logout();
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    logout();
    showToast('info', 'Logged Out', 'See you soon!');
}

function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
}

function showAuth() {
    elements.authContainer.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
}

function showApp() {
    elements.authContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
    
    if (state.user) {
        elements.userName.textContent = state.user.username;
    }
    
    loadTasks();
}

// ===== Task Functions =====

async function loadTasks() {
    showLoading();
    
    const params = new URLSearchParams({
        page: state.currentPage,
        limit: 10,
        sort_by: state.sort.by,
        sort_order: state.sort.order
    });
    
    if (state.filters.status) params.append('status', state.filters.status);
    if (state.filters.priority) params.append('priority', state.filters.priority);
    if (state.searchQuery) params.append('search', state.searchQuery);
    
    // Apply sidebar filter
    if (state.currentFilter === 'high') {
        params.append('priority', 'high');
    } else if (state.currentFilter !== 'all') {
        params.append('status', state.currentFilter);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks?${params}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.tasks = data.data.tasks;
            state.totalPages = data.data.pagination.total_pages;
            state.stats = data.data.stats;
            renderTasks();
            renderStats();
            renderPagination();
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to load tasks');
    } finally {
        hideLoading();
    }
}

function renderTasks() {
    if (state.tasks.length === 0) {
        elements.tasksList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        elements.tasksCount.textContent = '0 tasks';
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.tasksCount.textContent = `${state.tasks.length} task${state.tasks.length !== 1 ? 's' : ''}`;
    
    elements.tasksList.innerHTML = state.tasks.map(task => {
        const taskId = task.id || task._id;
        return `
        <div class="task-item" data-id="${taskId}">
            <div class="task-checkbox">
                <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                       onchange="toggleTaskStatus('${taskId}', '${task.status === 'completed' ? 'pending' : 'completed'}')">
            </div>
            <div class="task-content">
                <div class="task-title ${task.status === 'completed' ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="task-badge status-${task.status}">
                        <i class="fas fa-${getStatusIcon(task.status)}"></i>
                        ${formatStatus(task.status)}
                    </span>
                    <span class="task-badge priority-${task.priority}">
                        <i class="fas fa-flag"></i>
                        ${task.priority}
                    </span>
                    ${task.due_date ? `
                        <span class="task-date ${isOverdue(task.due_date) && task.status !== 'completed' ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(task.due_date)}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-edit" onclick="editTask('${taskId}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteTask('${taskId}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

function renderStats() {
    elements.statTotal.textContent = state.stats.total;
    elements.statPending.textContent = state.stats.pending;
    elements.statInProgress.textContent = state.stats.in_progress;
    elements.statCompleted.textContent = state.stats.completed;
    
    elements.navAll.textContent = state.stats.total;
    elements.navPending.textContent = state.stats.pending;
    elements.navInProgress.textContent = state.stats.in_progress;
    elements.navCompleted.textContent = state.stats.completed;
    elements.navHigh.textContent = state.stats.high_priority;
}

function renderPagination() {
    if (state.totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${state.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${state.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= state.totalPages; i++) {
        if (i === 1 || i === state.totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
            html += `<button class="${i === state.currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
            html += `<span>...</span>`;
        }
    }
    
    // Next button
    html += `<button ${state.currentPage === state.totalPages ? 'disabled' : ''} onclick="changePage(${state.currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    elements.pagination.innerHTML = html;
}

function setFilter(filter) {
    state.currentFilter = filter;
    state.currentPage = 1;
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.filter === filter);
    });
    
    // Update page title
    const titles = {
        all: 'All Tasks',
        pending: 'Pending Tasks',
        'in-progress': 'In Progress',
        completed: 'Completed Tasks',
        high: 'High Priority'
    };
    elements.pageTitle.textContent = titles[filter] || 'Tasks';
    
    // Reset dropdown filters when using sidebar
    if (filter !== 'all' && filter !== 'high') {
        elements.filterStatus.value = filter;
        state.filters.status = filter;
    } else if (filter === 'high') {
        elements.filterPriority.value = 'high';
        state.filters.priority = 'high';
    } else {
        elements.filterStatus.value = '';
        elements.filterPriority.value = '';
        state.filters.status = '';
        state.filters.priority = '';
    }
    
    loadTasks();
}

function changePage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    loadTasks();
}

// ===== Task Modal Functions =====

function openTaskModal(task = null) {
    state.editingTaskId = task ? task.id : null;
    elements.modalTitle.textContent = task ? 'Edit Task' : 'New Task';
    elements.taskId.value = task ? task.id : '';
    elements.taskTitle.value = task ? task.title : '';
    elements.taskDescription.value = task ? task.description || '' : '';
    elements.taskStatus.value = task ? task.status : 'pending';
    elements.taskPriority.value = task ? task.priority : 'medium';
    elements.taskDueDate.value = task ? task.due_date || '' : '';
    
    elements.taskModal.classList.remove('hidden');
    elements.taskTitle.focus();
}

function closeTaskModal() {
    elements.taskModal.classList.add('hidden');
    elements.taskForm.reset();
    state.editingTaskId = null;
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const taskData = {
        title: elements.taskTitle.value,
        description: elements.taskDescription.value,
        status: elements.taskStatus.value,
        priority: elements.taskPriority.value,
        due_date: elements.taskDueDate.value || null
    };
    
    const url = state.editingTaskId 
        ? `${API_BASE_URL}/tasks/${state.editingTaskId}`
        : `${API_BASE_URL}/tasks`;
    
    const method = state.editingTaskId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify(taskData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeTaskModal();
            loadTasks();
            showToast('success', 'Success', state.editingTaskId ? 'Task updated' : 'Task created');
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to save task');
    } finally {
        hideLoading();
    }
}

// ===== Delete Functions =====

function deleteTask(id) {
    state.deletingTaskId = id;
    elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    state.deletingTaskId = null;
}

async function confirmDeleteTask() {
    if (!state.deletingTaskId) return;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${state.deletingTaskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeDeleteModal();
            loadTasks();
            showToast('success', 'Deleted', 'Task deleted successfully');
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete task');
    } finally {
        hideLoading();
    }
}

// ===== Utility Functions =====

async function toggleTaskStatus(id, newStatus) {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadTasks();
            if (newStatus === 'completed') {
                showToast('success', 'Completed', 'Task marked as completed!');
            }
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to update task');
    } finally {
        hideLoading();
    }
}

function editTask(id) {
    const task = state.tasks.find(t => (t.id || t._id) === id);
    if (task) openTaskModal({ ...task, id: task.id || task._id });
}

function toggleMobileMenu() {
    elements.sidebar.classList.toggle('open');
}

function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function getStatusIcon(status) {
    const icons = {
        pending: 'clock',
        'in-progress': 'spinner',
        completed: 'check-circle'
    };
    return icons[status] || 'circle';
}

function formatStatus(status) {
    return status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function isOverdue(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
