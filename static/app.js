const API_BASE = window.location.origin;

// Authentication and User Management
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userType = localStorage.getItem('userType');
        this.userName = localStorage.getItem('userName');
        this.userEmail = localStorage.getItem('userEmail');
        this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        this.init();
    }

    init() {
        if (!this.isAuthenticated) {
            this.redirectToLogin();
            return;
        }

        this.currentUser = {
            type: this.userType,
            name: this.userName,
            email: this.userEmail
        };
        
        this.updateUI();
        this.initializeFeatures();
    }

    updateUI() {
        // Update header user info
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const accountType = document.getElementById('account-type');
        const logoutBtn = document.getElementById('logout-btn');

        if (userName && accountType && this.currentUser) {
            userName.textContent = this.currentUser.name;
            accountType.textContent = this.currentUser.type.toUpperCase();
            accountType.className = `px-2 py-1 text-xs rounded-full ${this.getAccountTypeClass()}`;
            userInfo.style.display = 'flex';
        }

        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }

        // Update navigation based on user type
        this.updateNavigation();
    }

    updateNavigation() {
        const premiumFeatures = document.querySelectorAll('[data-premium="true"]');
        const adminFeatures = document.querySelectorAll('[data-admin="true"]');

        premiumFeatures.forEach(feature => {
            if (this.hasPremiumAccess()) {
                feature.classList.remove('hidden');
            } else {
                feature.classList.add('hidden');
            }
        });

        adminFeatures.forEach(feature => {
            if (this.hasAdminAccess()) {
                feature.classList.remove('hidden');
            } else {
                feature.classList.add('hidden');
            }
        });
    }

    hasPremiumAccess() {
        return ['premium', 'enterprise', 'admin'].includes(this.currentUser.type);
    }

    hasAdminAccess() {
        return this.currentUser.type === 'admin';
    }

    getAccountTypeClass() {
        const classes = {
            'basic': 'bg-gray-200 text-gray-800',
            'premium': 'bg-purple-200 text-purple-800',
            'enterprise': 'bg-blue-200 text-blue-800',
            'admin': 'bg-red-200 text-red-800'
        };
        return classes[this.currentUser.type] || classes.basic;
    }

    initializeFeatures() {
        if (this.hasPremiumAccess()) {
            initializeDataAnalysis();
            initializeAlertSystem();
        }
        
        if (this.hasAdminAccess()) {
            loadDashboard();
        }
    }

    logout() {
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('isAuthenticated');
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = '/static/auth.html';
    }
}

// Navigation and Sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('aside');
    sidebar.classList.toggle('hidden');
}

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    // Show selected page
    document.getElementById(`${page}-page`).classList.remove('hidden');
    // Update active state in sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-blue-700');
        if(link.getAttribute('data-page') === page) {
            link.classList.add('bg-blue-700');
        }
    });
}

// Premium Features
async function initializeDataAnalysis() {
    const safetyTrends = await fetchSafetyTrends();
    const riskDistribution = await fetchRiskDistribution();
    const violationCategories = await fetchViolationCategories();
    
    updateCharts(safetyTrends, riskDistribution, violationCategories);
}

// Tab switching (legacy support)
function showTab(tabName) {
    navigateTo(tabName);
}

// GitHub Form Submission
document.getElementById('github-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const repo = formData.get('repo');
    const filePath = formData.get('file_path') || 'mc_list.txt';
    const branch = formData.get('branch') || 'main';
    
    const statusDiv = document.getElementById('repo-status');
    statusDiv.className = 'status-message info';
    statusDiv.textContent = 'Starting extraction...';
    statusDiv.style.display = 'block';
    
    try {
        const params = new URLSearchParams({
            repo: repo,
            file_path: filePath,
            branch: branch
        });
        
        const response = await fetch(`${API_BASE}/extract-from-github?${params}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusDiv.className = 'status-message success';
            statusDiv.innerHTML = `
                <strong>Extraction Started!</strong><br>
                Job ID: ${data.job_id}<br>
                MC Numbers: ${data.total_mc_numbers}<br>
                <a href="#" onclick="showJobStatus('${data.job_id}'); return false;">View Status</a>
            `;
            showToast('Extraction started successfully!');
        } else {
            throw new Error(data.detail || 'Failed to start extraction');
        }
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = `Error: ${error.message}`;
        showToast('Error starting extraction', 'error');
    }
});

// Check Repository
async function checkRepo() {
    const repo = document.getElementById('repo').value;
    const filePath = document.getElementById('file-path').value || 'mc_list.txt';
    const branch = document.getElementById('branch').value || 'main';
    
    if (!repo) {
        showToast('Please enter a repository name', 'error');
        return;
    }
    
    const statusDiv = document.getElementById('repo-status');
    statusDiv.className = 'status-message info';
    statusDiv.textContent = 'Checking repository...';
    statusDiv.style.display = 'block';
    
    try {
        const params = new URLSearchParams({
            repo: repo,
            file_path: filePath,
            branch: branch
        });
        
        const response = await fetch(`${API_BASE}/github/check-repo?${params}`);
        const data = await response.json();
        
        if (data.file_exists) {
            statusDiv.className = 'status-message success';
            statusDiv.innerHTML = `
                <strong>Repository Found!</strong><br>
                Repository: <a href="${data.repo_url}" target="_blank">${data.repo}</a><br>
                File: ${data.file_path}<br>
                Branch: ${data.branch}
            `;
        } else {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = `File ${data.file_path} not found in repository ${data.repo}`;
        }
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = `Error: ${error.message}`;
    }
}

// GitHub Actions Integration
async function triggerGitHubActions(mcNumbers) {
    try {
        const response = await fetch(`${API_BASE}/extract-via-github-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mc_numbers: mcNumbers })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to trigger GitHub Actions workflow');
        }
        
        showToast('GitHub Actions workflow triggered successfully!');
        return data;
    } catch (error) {
        console.error('Error triggering GitHub Actions:', error);
        showToast('Error triggering GitHub Actions workflow', 'error');
        throw error;
    }
}

// Upload CSV Form
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    const statusDiv = document.getElementById('upload-status');
    statusDiv.className = 'status-message info';
    statusDiv.textContent = 'Processing file...';
    statusDiv.style.display = 'block';
    
    try {
        // Read file contents
        const fileReader = new FileReader();
        
        fileReader.onload = async (e) => {
            const content = e.target.result;
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            const mcNumbers = lines.map(line => line.trim());
            
            statusDiv.textContent = 'Triggering GitHub Actions workflow...';
            
            try {
                const data = await triggerGitHubActions(mcNumbers);
                
                statusDiv.className = 'status-message success';
                statusDiv.innerHTML = `
                    <strong>Upload Successful!</strong><br>
                    Job ID: ${data.job_id}<br>
                    MC Numbers: ${data.total_mc_numbers}<br>
                    <a href="#" onclick="showJobStatus('${data.job_id}'); showTab('status'); return false;">View Status</a>
                `;
                showToast('GitHub Actions workflow triggered successfully!');
            } catch (error) {
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `Error: ${error.message}`;
                showToast('Error triggering GitHub Actions workflow', 'error');
            }
        };
        
        fileReader.readAsText(file);
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = `Error: ${error.message}`;
        showToast('Error processing file', 'error');
    }
});

// Job Status Form
document.getElementById('status-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('job-id').value;
    showJobStatus(jobId);
});

let autoRefreshInterval = null;

function autoRefresh() {
    const btn = document.getElementById('auto-refresh-btn');
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        btn.textContent = 'Auto Refresh';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    } else {
        const jobId = document.getElementById('job-id').value;
        if (!jobId) {
            showToast('Please enter a Job ID first', 'error');
            return;
        }
        autoRefreshInterval = setInterval(() => {
            showJobStatus(jobId, true);
        }, 3000);
        btn.textContent = 'Stop Auto Refresh';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
    }
}

// Data Analysis Functions
async function fetchSafetyTrends() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/analytics/safety-trends`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching safety trends:', error);
        return null;
    }
}

async function fetchRiskDistribution() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/analytics/risk-distribution`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching risk distribution:', error);
        return null;
    }
}

async function fetchViolationCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/analytics/violation-categories`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching violation categories:', error);
        return null;
    }
}

// Batch Processing
async function startBatchImport(files) {
    const formData = new FormData();
    for(let file of files) {
        formData.append('files', file);
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/batch/import`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        updateBatchStatus(data.jobId);
        showToast('Batch import started successfully');
    } catch (error) {
        console.error('Error starting batch import:', error);
        showToast('Error starting batch import', 'error');
    }
}

async function updateBatchStatus(jobId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/batch/status/${jobId}`);
        const data = await response.json();
        
        // Update UI with batch status
        const statusElement = document.querySelector(`[data-job-id="${jobId}"]`);
        if(statusElement) {
            statusElement.querySelector('.progress-fill').style.width = `${data.progress}%`;
            statusElement.querySelector('.status').textContent = data.status;
        }
        
        if(data.status !== 'completed' && data.status !== 'failed') {
            setTimeout(() => updateBatchStatus(jobId), 5000);
        }
    } catch (error) {
        console.error('Error updating batch status:', error);
    }
}

// Alert System
function initializeAlertSystem() {
    // Connect to WebSocket for real-time alerts
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alerts`);
    
    ws.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        showAlert(alert);
    };
}

function showAlert(alert) {
    const alertsContainer = document.getElementById('alerts-container');
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${alert.priority} mb-4`;
    alertElement.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h4 class="font-bold">${alert.title}</h4>
                <p>${alert.message}</p>
            </div>
            <button onclick="acknowledgeAlert('${alert.id}')" class="text-sm underline">
                Acknowledge
            </button>
        </div>
    `;
    alertsContainer.prepend(alertElement);
}

async function acknowledgeAlert(alertId) {
    try {
        await fetch(`${API_BASE}/api/v1/alerts/${alertId}/acknowledge`, {
            method: 'POST'
        });
        document.querySelector(`[data-alert-id="${alertId}"]`).remove();
        showToast('Alert acknowledged');
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        showToast('Error acknowledging alert', 'error');
    }
}

// Job Status
async function showJobStatus(jobId, silent = false) {
    if (!silent) {
        document.getElementById('job-id').value = jobId;
    }
    
    const statusDiv = document.getElementById('job-status');
    statusDiv.innerHTML = '<div class="loading"></div> Checking status...';
    
    try {
        const response = await fetch(`${API_BASE}/extract-status/${jobId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Job not found');
        }
        
        const progress = data.total_mc_numbers > 0 
            ? Math.round((data.processed_count / data.total_mc_numbers) * 100) 
            : 0;
        
        statusDiv.innerHTML = `
            <div class="job-info">
                <div class="job-info-item">
                    <strong>Job ID</strong>
                    ${data.job_id}
                </div>
                <div class="job-info-item">
                    <strong>Status</strong>
                    <span class="status-badge ${data.status}">${data.status.toUpperCase()}</span>
                </div>
                <div class="job-info-item">
                    <strong>Progress</strong>
                    ${data.processed_count} / ${data.total_mc_numbers}
                </div>
                <div class="job-info-item">
                    <strong>Failed</strong>
                    ${data.failed_count}
                </div>
                <div class="job-info-item">
                    <strong>Created</strong>
                    ${new Date(data.created_at).toLocaleString()}
                </div>
                ${data.completed_at ? `
                <div class="job-info-item">
                    <strong>Completed</strong>
                    ${new Date(data.completed_at).toLocaleString()}
                </div>
                ` : ''}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%">
                    ${progress}%
                </div>
            </div>
            ${data.error_message ? `
                <div class="status-message error" style="margin-top: 15px;">
                    Error: ${data.error_message}
                </div>
            ` : ''}
        `;
        
        // Show download buttons if job is completed
        if (data.status === 'completed') {
            document.getElementById('job-actions').style.display = 'block';
            document.getElementById('job-actions').setAttribute('data-job-id', jobId);
        } else {
            document.getElementById('job-actions').style.display = 'none';
        }
        
    } catch (error) {
        statusDiv.innerHTML = `
            <div class="status-message error">
                Error: ${error.message}
            </div>
        `;
    }
}

// Download Functions
function downloadResults(format) {
    const jobId = document.getElementById('job-actions').getAttribute('data-job-id');
    window.open(`${API_BASE}/extract-results/${jobId}?format=${format}`, '_blank');
}

function downloadFailed() {
    const jobId = document.getElementById('job-actions').getAttribute('data-job-id');
    window.open(`${API_BASE}/extract-failed/${jobId}`, '_blank');
}

// Load History
async function loadHistory() {
    const historyDiv = document.getElementById('history-list');
    historyDiv.innerHTML = '<div class="loading"></div> Loading history...';
    
    try {
        const response = await fetch(`${API_BASE}/history`);
        const jobs = await response.json();
        
        if (jobs.length === 0) {
            historyDiv.innerHTML = '<p>No extraction history found.</p>';
            return;
        }
        
        historyDiv.innerHTML = jobs.map(job => `
            <div class="history-item" onclick="showJobStatus('${job.job_id}'); showTab('status');">
                <div class="history-item-header">
                    <h3>${job.job_id}</h3>
                    <span class="status-badge ${job.status}">${job.status.toUpperCase()}</span>
                </div>
                <div class="job-info">
                    <div class="job-info-item">
                        <strong>Total MC Numbers</strong>
                        ${job.total_mc_numbers}
                    </div>
                    <div class="job-info-item">
                        <strong>Processed</strong>
                        ${job.processed_count}
                    </div>
                    <div class="job-info-item">
                        <strong>Failed</strong>
                        ${job.failed_count}
                    </div>
                    <div class="job-info-item">
                        <strong>Created</strong>
                        ${new Date(job.created_at).toLocaleString()}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        historyDiv.innerHTML = `
            <div class="status-message error">
                Error loading history: ${error.message}
            </div>
        `;
    }
}

// UI Update Functions
function updateCharts(safetyTrends, riskDistribution, violationCategories) {
    if(safetyTrends) {
        new Chart(document.getElementById('safetyTrends'), {
            type: 'line',
            data: {
                labels: safetyTrends.map(d => d.date),
                datasets: [{
                    label: 'Safety Score',
                    data: safetyTrends.map(d => d.score),
                    borderColor: '#3B82F6',
                    tension: 0.4
                }]
            }
        });
    }

    if(riskDistribution) {
        new Chart(document.getElementById('riskDistribution'), {
            type: 'bar',
            data: {
                labels: ['Low', 'Medium', 'High'],
                datasets: [{
                    label: 'Carriers',
                    data: [
                        riskDistribution.low,
                        riskDistribution.medium,
                        riskDistribution.high
                    ],
                    backgroundColor: ['#10B981', '#FBBF24', '#EF4444']
                }]
            }
        });
    }

    if(violationCategories) {
        new Chart(document.getElementById('violationCategories'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(violationCategories),
                datasets: [{
                    data: Object.values(violationCategories),
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#FBBF24',
                        '#6B7280'
                    ]
                }]
            }
        });
    }
}

// Data Enrichment
async function enrichCarrierData(dotNumber) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/carriers/${dotNumber}/enrich`, {
            method: 'POST'
        });
        const data = await response.json();
        updateCarrierDisplay(data);
        showToast('Carrier data enriched successfully');
    } catch (error) {
        console.error('Error enriching carrier data:', error);
        showToast('Error enriching carrier data', 'error');
    }
}

function updateCarrierDisplay(carrierData) {
    const container = document.getElementById('carrier-details');
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
                <p><strong>Name:</strong> ${carrierData.name}</p>
                <p><strong>DOT Number:</strong> ${carrierData.dotNumber}</p>
                <p><strong>Status:</strong> ${carrierData.status}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold mb-4">Safety Information</h3>
                <p><strong>Safety Rating:</strong> ${carrierData.safetyRating}</p>
                <p><strong>Out of Service Rate:</strong> ${carrierData.outOfServiceRate}%</p>
                <p><strong>Crash Rate:</strong> ${carrierData.crashRate}</p>
            </div>
        </div>
    `;
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} fixed bottom-4 right-4 p-4 rounded-lg text-white`;
    
    // Add appropriate background color based on type
    if(type === 'success') {
        toast.classList.add('bg-green-500');
    } else if(type === 'error') {
        toast.classList.add('bg-red-500');
    } else if(type === 'warning') {
        toast.classList.add('bg-yellow-500');
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize user management
    const userManager = new UserManager();
    window.userManager = userManager; // Make it globally accessible
    
    // Make logout function globally available
    window.logout = () => userManager.logout();
    
    // Load initial data
    loadHistory();
    
    // Navigate to default page based on user type
    if (userManager.hasAdminAccess()) {
        navigateTo('dashboard');
    } else {
        navigateTo('github');
    }
    
    // Initialize premium features if user has access
    if (userManager.hasPremiumAccess()) {
        initializeDataAnalysis();
        initializeAlertSystem();
    }
});

// Export functions for use in HTML
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.showToast = showToast;
window.startBatchImport = startBatchImport;
window.enrichCarrierData = enrichCarrierData;
window.acknowledgeAlert = acknowledgeAlert;

