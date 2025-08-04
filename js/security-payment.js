// Security Payment Popup Functionality

// Function to fetch security payment data from Google Sheet
async function fetchSecurityPaymentData() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/1xhW1Qb8wWCJPalnIPiCmiugZPo05HUEuBDPTsi_D5g8/gviz/tq?tqx=out:csv');
        const data = await response.text();
        return parseCSV(data);
    } catch (error) {
        console.error('Error fetching security payment data:', error);
        return [];
    }
}

// Function to parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        // Handle quoted values with commas inside them
        const row = [];
        let insideQuote = false;
        let currentValue = '';
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            
            if (char === '"') {
                insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        row.push(currentValue.trim());
        
        if (row.length > 0 && row.some(cell => cell.length > 0)) {
            result.push(row);
        }
    }
    
    return result;
}

// Function to check if user has pending security payment
async function checkSecurityPayment() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return false;
    
    const rows = await fetchSecurityPaymentData();
    if (rows.length === 0) return false;
    
    // Find header row index
    let headerRowIndex = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].some(cell => cell.includes('Username'))) {
            headerRowIndex = i;
            break;
        }
    }
    
    // Get column indices
    const headers = rows[headerRowIndex];
    const usernameIndex = headers.findIndex(header => header.includes('Username'));
    const statusIndex = headers.findIndex(header => header.includes('Status'));
    
    if (usernameIndex === -1 || statusIndex === -1) return false;
    
    // Check if user has pending security payment
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length > Math.max(usernameIndex, statusIndex)) {
            const username = row[usernameIndex].trim();
            const status = row[statusIndex].trim();
            
            if (username === currentUser.username && status.toLowerCase() === 'pending') {
                return {
                    username: username,
                    method: row[headers.findIndex(header => header.includes('Method'))],
                    amount: row[headers.findIndex(header => header.includes('Amound'))],
                    address: row[headers.findIndex(header => header.includes('USDT (Address)'))],
                    qrLogo: row[headers.findIndex(header => header.includes('QR Logo'))],
                    status: status,
                    agentType: row[headers.findIndex(header => header.includes('Agent Type'))]
                };
            }
        }
    }
    
    return false;
}

// Function to create and show security payment popup
async function showSecurityPaymentPopup() {
    const paymentData = await checkSecurityPayment();
    if (!paymentData) return;
    
    // Create modal if it doesn't exist
    let securityModal = document.getElementById('securityPaymentModal');
    if (!securityModal) {
        securityModal = document.createElement('div');
        securityModal.id = 'securityPaymentModal';
        securityModal.className = 'modal';
        securityModal.style.display = 'block';
        
        const modalContent = `
            <div class="modal-content security-payment-modal">
                <span class="close-modal" id="closeSecurityModal" style="background-color: #ff3333; color: white; padding: 5px 12px; border-radius: 50%; position: absolute; right: 15px; top: 15px; cursor: pointer; font-size: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 1000;">&times;</span>
                <div class="modal-header">
                    <h2><i class="fas fa-shield-alt"></i> Security Payment Required</h2>
                </div>
                <div class="transaction-details">
                    <div class="detail-row">
                        <div class="detail-label">Agent Type:</div>
                        <div class="detail-value">${paymentData.agentType}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Payment Method:</div>
                        <div class="detail-value">${paymentData.method}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Amount (USDT):</div>
                        <div class="detail-value">
                            <span style="font-weight: bold; color: #00CCCC; font-size: 20px; display: inline-block; margin: 0;">${paymentData.amount}</span>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">USDT Address:</div>
                        <div class="detail-value">
                            <span id="usdtAddress">${paymentData.address}</span>
                            <button class="copy-btn" data-copy="${paymentData.address}"><i class="fas fa-copy"></i> Copy</button>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">QR Code:</div>
                        <div class="detail-value" style="display: flex; justify-content: center;">
                            <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); border: 1px solid #eee; margin: 10px 0;">
                                <img src="${paymentData.qrLogo}" alt="Payment QR Code" style="width: 200px; height: 200px; object-fit: contain; display: block;">
                                <div style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">Scan to pay</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="security-payment-note">
                    <p><strong>This is not an investment</strong> but a security payment to ensure agents don't run away with payments. You will earn commission from this security deposit as per your agent type.</p>
                </div>
                <div class="modal-actions">
                    <button class="confirm-btn" id="confirmPaymentBtn">I've Made the Payment</button>
                </div>
            </div>
        `;
        
        securityModal.innerHTML = modalContent;
        document.body.appendChild(securityModal);
        
        // Add event listeners
        document.getElementById('closeSecurityModal').addEventListener('click', function() {
            // Allow closing the modal
            securityModal.style.display = 'none';
        });
        
        // Copy button functionality
        const copyBtn = securityModal.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const textToCopy = this.getAttribute('data-copy');
                navigator.clipboard.writeText(textToCopy).then(function() {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                });
            });
        }
        
        // Confirm payment button
        document.getElementById('confirmPaymentBtn').addEventListener('click', function() {
            // Here you would typically send a confirmation to your backend
            // For now, we'll just show a message in the button text instead of an alert
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            confirmBtn.textContent = "Payment will be verified automatically and your account will be activated.";
            confirmBtn.style.backgroundColor = "#4CAF50";
            confirmBtn.disabled = true;
        });
    }
}

// Export functions
window.securityPayment = {
    check: checkSecurityPayment,
    show: showSecurityPaymentPopup
};