// MC Number Range Functions
document.getElementById('range-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const startMC = parseInt(document.getElementById('start-mc').value);
    const endMC = parseInt(document.getElementById('end-mc').value);
    
    if (endMC <= startMC) {
        showToast('End MC number must be greater than Start MC number', 'error');
        return;
    }
    
    if (endMC - startMC > 100000) {
        showToast('Maximum range is 100,000 MC numbers', 'error');
        return;
    }
    
    const statusDiv = document.getElementById('range-status');
    statusDiv.className = 'status-message info';
    statusDiv.innerHTML = `
        <div class="processing-status">
            <div class="loading"></div>
            <p><strong>Starting Bulk Extraction</strong></p>
            <p>Processing MC numbers from ${startMC} to ${endMC}</p>
        </div>
    `;
    statusDiv.style.display = 'block';
    
    try {
        // Generate MC numbers array
        const mcNumbers = [];
        for (let i = startMC; i <= endMC; i++) {
            mcNumbers.push(i.toString().padStart(6, '0'));
        }
        
        // Start the extraction
        const response = await fetch(`${API_BASE}/extract-via-github-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mc_numbers: mcNumbers })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusDiv.className = 'status-message success';
            statusDiv.innerHTML = `
                <strong>Bulk Extraction Started!</strong><br>
                Job ID: ${data.job_id}<br>
                MC Numbers: ${data.total_mc_numbers}<br>
                <div class="info-box info-secondary" style="margin-top: 15px;">
                    <p>Your extraction is running in the background. We'll process all carriers between MC-${startMC} and MC-${endMC}.</p>
                    <p>You can track progress below or come back later using your Job ID.</p>
                </div>
                <button onclick="showTab('status'); document.getElementById('job-id').value='${data.job_id}'; showJobStatus('${data.job_id}');" class="btn btn-secondary" style="margin-top: 15px;">
                    Track Progress
                </button>
            `;
            
            // Auto-switch to status tab after 5 seconds
            setTimeout(() => {
                showTab('status');
                document.getElementById('job-id').value = data.job_id;
                showJobStatus(data.job_id);
            }, 5000);
            
            showToast('Bulk extraction started successfully!');
        } else {
            throw new Error(data.detail || 'Failed to start extraction');
        }
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = `Error: ${error.message}`;
        showToast('Error starting bulk extraction', 'error');
    }
});

// Update range info as user types
function updateRangeInfo() {
    const startMC = parseInt(document.getElementById('start-mc').value) || 0;
    const endMC = parseInt(document.getElementById('end-mc').value) || 0;
    
    if (startMC && endMC && endMC > startMC) {
        const totalMC = endMC - startMC + 1;
        const rangeInfo = document.getElementById('range-info');
        const totalCount = document.getElementById('total-mc-count');
        const estimatedTime = document.getElementById('estimated-time');
        
        rangeInfo.style.display = 'block';
        totalCount.textContent = totalMC.toLocaleString();
        
        // Estimate processing time (rough estimate: 2 seconds per carrier)
        const minutes = Math.ceil((totalMC * 2) / 60);
        estimatedTime.textContent = `${minutes} minutes`;
        
        // Update submit button
        const submitBtn = document.getElementById('range-submit-btn');
        if (totalMC > 100000) {
            submitBtn.disabled = true;
            submitBtn.title = 'Maximum range is 100,000 MC numbers';
            showToast('Range too large. Maximum is 100,000 MC numbers.', 'error');
        } else {
            submitBtn.disabled = false;
            submitBtn.title = '';
        }
    }
}

// Add input listeners
document.getElementById('start-mc')?.addEventListener('input', updateRangeInfo);
document.getElementById('end-mc')?.addEventListener('input', updateRangeInfo);