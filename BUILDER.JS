class PossessionTracker {
    constructor() {
        this.currentRole = null;
        this.tasks = JSON.parse(localStorage.getItem('possessionTasks')) || [];
        this.taskIdCounter = parseInt(localStorage.getItem('taskIdCounter')) || 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        this.updateNotifications();
    }

    bindEvents() {
        // Role selection
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const role = e.currentTarget.dataset.role;
                this.setRole(role);
            });
        });

        // Dashboard buttons
        document.getElementById('addNewTaskBtn').addEventListener('click', () => this.showNewTaskModal());
        document.getElementById('switchRole').addEventListener('click', () => this.switchRole());

        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => this.hideModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.hideModal());
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideModal();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideModal();
        });
    }

    setRole(role) {
        this.currentRole = role;
        document.getElementById('roleSelector').classList.add('hidden');
        document.getElementById(`${role}Dashboard`).classList.remove('hidden');
        document.getElementById('switchRole').classList.remove('hidden');
        document.getElementById('currentRole').textContent = role.toUpperCase();
        document.getElementById('currentRole').classList.remove('hidden');
        
        if (role === 'builder') {
            this.updateNotifications();
        }
    }

    switchRole() {
        document.getElementById('customerDashboard').classList.add('hidden');
        document.getElementById('builderDashboard').classList.add('hidden');
        document.getElementById('roleSelector').classList.remove('hidden');
        document.getElementById('switchRole').classList.add('hidden');
        document.getElementById('currentRole').classList.add('hidden');
        this.currentRole = null;
    }

    showNewTaskModal() {
        this.showModal('Report New Pending Work', 'Upload photo and description of work that needs to be done');
        document.getElementById('modalBody').innerHTML = this.getNewTaskForm();
        
        // File upload
        const fileInput = document.getElementById('taskPhoto');
        const uploadArea = document.querySelector('.file-upload-area');
        const preview = document.getElementById('photoPreview');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.querySelector('img').src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.getElementById('modalConfirm').onclick = () => this.createNewTask();
    }

    getNewTaskForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Work Description</label>
                    <textarea id="taskDesc" rows="4" 
                        class="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical font-medium"
                        placeholder="Describe exactly what work needs to be completed..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Upload Photo <span class="text-red-500">*</span></label>
                    <div class="file-upload-area">
                        <input type="file" id="taskPhoto" accept="image/*" class="hidden">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p class="text-lg font-semibold mt-2 mb-1">Click to upload photo</p>
                        <p class="text-sm text-gray-500">PNG, JPG (max 5MB)</p>
                        <div id="photoPreview" class="file-preview">
                            <img alt="Preview">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async createNewTask() {
        const desc = document.getElementById('taskDesc').value.trim();
        const photoFile = document.getElementById('taskPhoto').files[0];
        
        if (!desc || !photoFile) {
            this.showNotification('Please add description and photo', 'error');
            return;
        }

        if (photoFile.size > 5 * 1024 * 1024) {
            this.showNotification('Photo must be under 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newTask = {
                id: this.taskIdCounter++,
                description: desc,
                photo: e.target.result,
                status: 'pending',
                timestamp: new Date().toISOString(),
                customerConfirmed: false
            };
            
            this.tasks.unshift(newTask);
            this.saveData();
            this.loadTasks();
            this.updateNotifications();
            this.hideModal();
            this.showNotification('✅ Pending work reported! Builders notified.');
        };
        reader.readAsDataURL(photoFile);
    }

    loadTasks() {
        const customerContainer = document.getElementById('customerTasks');
        const builderContainer = document.getElementById('builderTasks');
        
        customerContainer.innerHTML = '';
        builderContainer.innerHTML = '';
        
        this.tasks.forEach(task => {
            const customerCard = this.createCustomerTaskCard(task);
            customerContainer.appendChild(customerCard);
            
            if (task.status === 'pending') {
                const builderCard = this.createBuilderTaskCard(task);
                builderContainer.appendChild(builderCard);
            }
        });
    }

    createCustomerTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.status}`;
        card.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="flex gap-2 mb-3">
                        <span class="status-badge status-${task.status}">${task.status.toUpperCase()}</span>
                        ${task.customerConfirmed ? '<span class="status-badge customer-ok">CUSTOMER OK</span>' : ''}
                    </div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-meta">${new Date(task.timestamp).toLocaleString()}</div>
                </div>
                ${task.photo ? `<img src="${task.photo}" class="task-photo" alt="Work photo">` : ''}
            </div>
            <div class="task-actions">
                ${task.status === 'pending' ? 
                    `<button class="btn btn-primary" onclick="tracker.markWorkDone(${task.id})">
                        <i class="fas fa-check"></i> Mark as Done
                    </button>` : ''
                }
                <button class="btn btn-secondary" onclick="tracker.viewTask(${task.id})">
                    <i class="fas fa-eye"></i> ${task.status === 'pending' ? 'View Details' : 'View'}
                </button>
            </div>
        `;
        return card;
    }

    createBuilderTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card pending';
        card.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="flex gap-2 mb-4">
                        <span class="status-badge status-pending" style="background: #fed7aa; color: #c2410c; font-size: 0.875rem; padding: 0.5rem 1rem; font-weight: 700;">🚨 URGENT - PENDING</span>
                    </div>
                    <div class="task-description" style="font-size: 1.25rem;">${task.description}</div>
                    <div class="task-meta">Reported: ${new Date(task.timestamp).toLocaleString()}</div>
                </div>
                ${task.photo ? `<img src="${task.photo}" class="task-photo" style="width: 100px; height: 100px;" alt="Work photo">` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-primary" onclick="tracker.markWorkCompleted(${task.id})" style="font-size: 1.1rem;">
                    <i class="fas fa-check-double"></i> Work Completed
                </button>
                <button class="btn btn-secondary" onclick="tracker.viewTask(${task.id})">
                    <i class="fas fa-image"></i> View Photo
                </button>
            </div>
        `;
        return card;
    }

    markWorkDone(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.showModal('Confirm Completion', 'Are you satisfied with the work? This will notify the builder.');
            document.getElementById('modalBody').innerHTML = `
                <div class="space-y-4">
                    <div class="task-description">${task.description}</div>
                    ${task.photo ? `<img src="${task.photo}" class="w-full rounded-xl shadow-lg" alt="Work photo">` : ''}
                    <p class="text-sm text-gray-600">Status will change to "COMPLETED - AWAITING APPROVAL"</p>
                </div>
            `;
            document.getElementById('modalConfirm').onclick = () => this.customerApproveTask(taskId);
        }
    }

    markWorkCompleted(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.customerConfirmed = false;
            this.saveData();
            this.loadTasks();
            this.updateNotifications();
            this.showNotification('✅ Work marked completed! Waiting for customer approval.');
        }
    }

    customerApproveTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.customerConfirmed = true;
            this.saveData();
            this.loadTasks();
            this.updateNotifications();
            this.hideModal();
            this.showNotification('🎉 Work approved! Possession handover complete.');
        }
    }

    viewTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.showModal(`Task #${task.id}`, task.status === 'pending' ? 'Pending work details' : 'Work completed');
            document.getElementById('modalBody').innerHTML = `
                <div class="space-y-6">
                    <div>
                        <h4 class="font-bold text-lg mb-3">Description</h4>
                        <p class="text-gray-700 leading-relaxed">${task.description}</p>
                    </div>
                    ${task.photo ? `
                        <div>
                            <h4 class="font-bold text-lg mb-3">Photo</h4>
                            <img src="${task.photo}" class="w-full max-h-96 object-contain rounded-xl shadow-lg border">
                        </div>
                    ` : ''}
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Status:</strong> <span class="status-badge status-${task.status}">${task.status.toUpperCase()}</span></div>
                        <div><strong>Reported:</strong> ${new Date(task.timestamp).toLocaleString()}</div>
                        ${task.customerConfirmed ? '<div><i class="fas fa-check-circle text-green-500"></i> Customer approved</div>' : ''}
                    </div>
                </div>
            `;
            document.getElementById('modalConfirm').style.display = 'none';
            document.getElementById('modalCancel').textContent = 'Close';
        }
    }

    showModal(title, subtitle) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('taskModal').classList.remove('hidden');
        document.getElementById('modalConfirm').style.display = 'block';
        document.getElementById('modalCancel').textContent = 'Cancel';
    }

    hideModal() {
        document.getElementById('taskModal').classList.add('hidden');
    }

    updateNotifications() {
        const pendingCount = this.tasks.filter(t => t.status === 'pending').length;
        const badge = document.getElementById('notificationCount');
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'block' : 'none';
    }

    saveData() {
        localStorage.setItem('possessionTasks', JSON.stringify(this.tasks));
        localStorage.setItem('taskIdCounter', this.taskIdCounter.toString());
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            ${message}
        `;
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, 4000);
    }
}

// Initialize app
const tracker = new PossessionTracker();
window.tracker = tracker;