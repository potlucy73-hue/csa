// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Initialize components
    setupSidebar();
    setupNotifications();
    loadDashboardData();
    initializeEventListeners();
}

function setupSidebar() {
    const menuButton = document.querySelector('.md\\:hidden');
    const sidebar = document.querySelector('aside');
    
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
        });
    }
}

function setupNotifications() {
    // Initialize notification system
    window.showNotification = function(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg toast-enter`;
        
        // Add color based on type
        switch(type) {
            case 'success':
                toast.classList.add('bg-green-600');
                break;
            case 'error':
                toast.classList.add('bg-red-600');
                break;
            case 'warning':
                toast.classList.add('bg-yellow-600');
                break;
            default:
                toast.classList.add('bg-gray-800');
        }
        
        toast.classList.remove('hidden');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg hidden';
            }, 300);
        }, 3000);
    };
}

function loadDashboardData() {
    // Load dashboard statistics
    fetch('/api/dashboard/stats')
        .then(response => response.json())
        .then(data => {
            updateDashboardStats(data);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            showNotification('Error loading dashboard data', 'error');
        });
        
    // Load recent extractions
    fetch('/api/extractions/recent')
        .then(response => response.json())
        .then(data => {
            updateRecentExtractions(data);
        })
        .catch(error => {
            console.error('Error loading recent extractions:', error);
        });
        
    // Load system health
    fetch('/api/system/health')
        .then(response => response.json())
        .then(data => {
            updateSystemHealth(data);
        })
        .catch(error => {
            console.error('Error loading system health:', error);
        });
}

function updateDashboardStats(data) {
    // Update statistics in the dashboard
    const stats = {
        totalExtractions: document.querySelector('[data-stat="total-extractions"]'),
        successRate: document.querySelector('[data-stat="success-rate"]'),
        activeUsers: document.querySelector('[data-stat="active-users"]'),
        systemLoad: document.querySelector('[data-stat="system-load"]')
    };
    
    if (data.totalExtractions) {
        stats.totalExtractions.textContent = data.totalExtractions.toLocaleString();
    }
    if (data.successRate) {
        stats.successRate.textContent = data.successRate.toFixed(1) + '%';
    }
    if (data.activeUsers) {
        stats.activeUsers.textContent = data.activeUsers.toLocaleString();
    }
    if (data.systemLoad) {
        stats.systemLoad.textContent = data.systemLoad + '%';
    }
}

function updateRecentExtractions(data) {
    const container = document.querySelector('.recent-extractions');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add new extraction items
    data.forEach(extraction => {
        const element = document.createElement('div');
        element.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
        element.innerHTML = `
            <div>
                <p class="font-medium text-gray-800">Batch #${extraction.id}</p>
                <p class="text-sm text-gray-500">${extraction.carriersCount} carriers processed</p>
            </div>
            <span class="px-3 py-1 bg-${getStatusColor(extraction.status)}-100 text-${getStatusColor(extraction.status)}-800 rounded-full text-sm">
                ${extraction.status}
            </span>
        `;
        container.appendChild(element);
    });
}

function updateSystemHealth(data) {
    // Update system health metrics
    const metrics = {
        apiResponse: {
            value: document.querySelector('[data-metric="api-response"] .value'),
            bar: document.querySelector('[data-metric="api-response"] .bar-fill')
        },
        dbLoad: {
            value: document.querySelector('[data-metric="db-load"] .value'),
            bar: document.querySelector('[data-metric="db-load"] .bar-fill')
        },
        memoryUsage: {
            value: document.querySelector('[data-metric="memory-usage"] .value'),
            bar: document.querySelector('[data-metric="memory-usage"] .bar-fill')
        }
    };
    
    if (data.apiResponse) {
        metrics.apiResponse.value.textContent = data.apiResponse + 'ms';
        metrics.apiResponse.bar.style.width = (data.apiResponse / 1000 * 100) + '%';
    }
    if (data.dbLoad) {
        metrics.dbLoad.value.textContent = data.dbLoad + '%';
        metrics.dbLoad.bar.style.width = data.dbLoad + '%';
    }
    if (data.memoryUsage) {
        metrics.memoryUsage.value.textContent = data.memoryUsage + '%';
        metrics.memoryUsage.bar.style.width = data.memoryUsage + '%';
    }
}

function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'completed':
            return 'green';
        case 'processing':
            return 'blue';
        case 'failed':
            return 'red';
        default:
            return 'gray';
    }
}

function initializeEventListeners() {
    // New Extraction button
    const newExtractionBtn = document.querySelector('[data-action="new-extraction"]');
    if (newExtractionBtn) {
        newExtractionBtn.addEventListener('click', () => {
            window.location.href = '/extractions/new';
        });
    }
    
    // Export Data button
    const exportDataBtn = document.querySelector('[data-action="export-data"]');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            window.location.href = '/extractions/export';
        });
    }
    
    // Navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Remove active class from all links
            document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            e.currentTarget.classList.add('active');
        });
    });
}

// Refresh dashboard data periodically
setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

// Handle errors gracefully
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An error occurred. Please try again.', 'error');
});