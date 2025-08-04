// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser && window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        // Redirect to login page if not logged in
        window.location.href = 'index.html';
        return;
    }
    
    // Immediately check user status on page load if user is logged in
    if (currentUser) {
        checkUserStatus();
    }
    
    // Check for security payment if user is logged in
    if (currentUser && window.securityPayment) {
        window.securityPayment.show();
    }
    
    // Add event listener for page navigation to show security payment popup and check user status
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && currentUser) {
            // Check user status when page becomes visible
            checkUserStatus();
            
            // Show security payment if needed
            if (window.securityPayment) {
                window.securityPayment.show();
            }
        }
    });

    // Check user status periodically (every 15 seconds)
    if (currentUser) {
        checkUserStatus();
        setInterval(checkUserStatus, 15000);
    }

    // Set user info in sidebar
    if (currentUser && document.getElementById('userName')) {
        document.getElementById('userName').textContent = currentUser.fullName || currentUser.username;
        document.getElementById('userStatus').textContent = currentUser.status;
        
        // Set user logo
        const userLogoImg = document.getElementById('userLogoImg');
        if (userLogoImg && currentUser.logo) {
            userLogoImg.src = currentUser.logo;
            userLogoImg.onerror = function() {
                // If logo URL is invalid, use a default image
                this.src = 'https://via.placeholder.com/80?text=User';
            };
        } else if (userLogoImg) {
            userLogoImg.src = 'https://via.placeholder.com/80?text=User';
        }
    }

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(event.target) && 
                event.target !== sidebarToggle && 
                !sidebarToggle.contains(event.target) &&
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Remove maintenance overlay if it exists
            const overlay = document.getElementById('maintenanceOverlay');
            if (overlay) {
                overlay.remove();
            }
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // Modal functionality
    const modal = document.getElementById('transactionModal');
    const closeModal = document.getElementById('closeModal');
    if (modal && closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Function to check user status
function checkUserStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Fetch user data from Google Sheet
    fetch('https://docs.google.com/spreadsheets/d/1ceJEL9omxk8btcFyaXTkLte7qSy6nVuPOtW8O3OI3F8/gviz/tq?tqx=out:csv')
        .then(response => response.text())
        .then(data => {
            // Parse CSV data
            const rows = parseCSV(data);
            
            // Find user and check status
            let userFound = false;
            let userStatus = '';
            let userMessage = '';
            
            for (let i = 1; i < rows.length; i++) { // Skip header row
                const row = rows[i];
                if (row.length >= 6) {
                    const rowUsername = row[0]?.trim();
                    const rowPassword = row[1]?.trim();
                    const rowStatus = row[4]?.trim();
                    const rowMessage = row[5]?.trim();
                    
                    if (rowUsername === currentUser.username && rowPassword === currentUser.password) {
                        userFound = true;
                        userStatus = rowStatus;
                        userMessage = rowMessage;
                        break;
                    }
                }
            }
            
            if (userFound) {
                if (userStatus.toLowerCase() !== 'active') {
                    // User is no longer active, log them out immediately
                    localStorage.removeItem('currentUser');
                    showNotification(userMessage || `Your account is now ${userStatus}. You have been logged out.`, 'error');
                    // Redirect immediately without delay
                    window.location.href = 'index.html';
                }
            } else {
                // User no longer exists in the system
                localStorage.removeItem('currentUser');
                showNotification('Your account no longer exists. You have been logged out.', 'error');
                // Redirect immediately without delay
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Error checking user status:', error);
            // Don't log out on connection error to prevent disruption
        });
}

// Helper function to parse CSV data
function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        // Handle quoted values with commas inside them
        const result = [];
        let startPos = 0;
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                result.push(line.substring(startPos, i).replace(/^"|"$/g, ''));
                startPos = i + 1;
            }
        }
        
        // Add the last value
        result.push(line.substring(startPos).replace(/^"|"$/g, ''));
        
        return result;
    });
}

// Function to show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Function to copy text to clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('Copied to clipboard!', 'success');
}

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Function to update transaction status in Google Sheets via SheetDB API
async function updateTransactionStatus(sheetId, transactionId, newStatus, trxId = null) {
    try {
        console.log('updateTransactionStatus called with:', { sheetId, transactionId, newStatus, trxId });
        
        // Validate inputs
        if (!sheetId) {
            throw new Error('Missing SheetDB API ID');
        }
        
        if (!transactionId) {
            throw new Error('Missing transaction ID');
        }
        
        if (!newStatus) {
            throw new Error('Missing new status');
        }
        
        const data = {
            data: {
                'Status': newStatus
            }
        };
        
        // If TRX ID is provided, update it as well
        if (trxId) {
            data.data['TRX ID'] = trxId;
            console.log('Adding TRX ID to update data:', trxId);
        }
        
        console.log('Sending data to SheetDB for status update:', JSON.stringify(data));
        
        // Properly encode the transaction ID for the URL
        const encodedTransactionId = encodeURIComponent(transactionId);
        console.log('Encoded transaction ID:', encodedTransactionId);
        
        // Construct the URL with proper encoding
        const apiUrl = `https://sheetdb.io/api/v1/${sheetId}/Transaction%20Number/${encodedTransactionId}`;
        console.log('SheetDB API URL for status update:', apiUrl);
        
        // Make the API request with proper headers and body
        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('SheetDB response status:', response.status);
        
        // Log the raw response
        const responseText = await response.text();
        console.log('SheetDB raw response:', response.status, responseText);
        
        if (!response.ok) {
            throw new Error(`SheetDB API responded with status: ${response.status}, text: ${responseText}`);
        }
        
        try {
            // Parse the response text as JSON
            const result = responseText ? JSON.parse(responseText) : {};
            console.log('SheetDB update response:', result);
            
            // Check if the API returned an error message
            if (result.error) {
                throw new Error(`SheetDB API error: ${result.error}`);
            }
            
            // Check if the update was successful
            if (result.updated === 0) {
                throw new Error(`No records were updated. Transaction ID '${transactionId}' might not exist.`);
            }
            
            return true;
        } catch (jsonError) {
            console.error('Error parsing SheetDB response:', jsonError);
            throw new Error(`Error parsing SheetDB response: ${jsonError.message}`);
        }
    } catch (error) {
        console.error('Error updating transaction status:', error);
        return false;
    }
}

// Function to update rejection reason for deposit transactions
async function updateRejectionReason(transactionId, reason) {
    try {
        console.log('updateRejectionReason called with:', { transactionId, reason });
        
        // Validate inputs
        if (!transactionId) {
            throw new Error('Missing transaction ID for updateRejectionReason');
        }
        
        if (!reason) {
            throw new Error('Missing reason for updateRejectionReason');
        }
        
        const data = {
            data: {
                'Reason': reason
            }
        };
        
        console.log('Sending data to SheetDB for reason update:', JSON.stringify(data));
        
        // Using the correct SheetDB API ID for deposit transactions
        const encodedTransactionId = encodeURIComponent(transactionId);
        const apiUrl = `https://sheetdb.io/api/v1/1e4k53su959b1/Transaction%20Number/${encodedTransactionId}`;
        console.log('SheetDB API URL for reason update:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('SheetDB response status for reason update:', response.status);
        
        // Log the raw response
        const responseText = await response.text();
        console.log('SheetDB raw response for reason update:', response.status, responseText);
        
        if (!response.ok) {
            throw new Error(`SheetDB API responded with status: ${response.status}, text: ${responseText}`);
        }
        
        try {
            // Parse the response text as JSON
            const result = responseText ? JSON.parse(responseText) : {};
            console.log('SheetDB rejection reason update response:', result);
            
            // Check if the API returned an error message
            if (result.error) {
                throw new Error(`SheetDB API error: ${result.error}`);
            }
            
            // Check if the update was successful
            if (result.updated === 0) {
                throw new Error(`No records were updated for reason. Transaction ID '${transactionId}' might not exist.`);
            }
            
            return true;
        } catch (jsonError) {
            console.error('Error parsing SheetDB response for reason update:', jsonError);
            throw new Error(`Error parsing SheetDB response for reason update: ${jsonError.message}`);
        }
    } catch (error) {
        console.error('Error updating rejection reason:', error);
        return false;
    }
}

// Function to calculate commission
function calculateCommission(amount, type) {
    const rate = type.toLowerCase() === 'withdrawal' ? 0.05 : 0.03;
    return amount * rate;
}