// Deposit functionality
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Load deposit transactions
    loadDepositTransactions(currentUser.username);

    // Close modal when clicking close button
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('transactionModal').style.display = 'none';
    });
    
    // Add event listener for status filter
    document.getElementById('statusFilter').addEventListener('change', function() {
        filterDepositTransactions();
    });
});

// Function to load deposit transactions
async function loadDepositTransactions(username) {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/1UPT_4aeGEcibpMrilgkNknlaF-vwT1YLVwaUsGj9mKc/gviz/tq?tqx=out:csv');
        const data = await response.text();
        const rows = parseCSV(data);
        
        const transactions = [];
        
        for (let i = 1; i < rows.length; i++) { // Skip header row
            const row = rows[i];
            if (row.length >= 7) {
                const agent = row[6]?.trim();
                // Only include transactions for this agent or marked as 'All'
                if (agent === username || agent.toLowerCase() === 'all') {
                    transactions.push({
                        transactionNumber: row[0]?.trim(),
                        trxId: row[1]?.trim(),
                        method: row[2]?.trim(),
                        userId: row[3]?.trim(),
                        amount: row[4]?.trim(),
                        status: row[5]?.trim(),
                        agent: agent,
                        rejectionReason: row[7]?.trim() || '' // This is the 'Reason' column in Google Sheet
                    });
                }
            }
        }
        
        // Store transactions in a global variable for filtering
        window.allDepositTransactions = transactions;
        
        // Display transactions (initially all)
        filterDepositTransactions();
    } catch (error) {
        console.error('Error loading deposit transactions:', error);
        showNotification('Error loading deposit transactions. Please try again.', 'error');
    }
}

// Function to filter deposit transactions based on status
function filterDepositTransactions() {
    if (!window.allDepositTransactions) return;
    
    const statusFilter = document.getElementById('statusFilter').value;
    let filteredTransactions = [];
    
    if (statusFilter === 'all') {
        filteredTransactions = window.allDepositTransactions;
    } else {
        filteredTransactions = window.allDepositTransactions.filter(transaction => 
            transaction.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    displayDepositTransactions(filteredTransactions);
}

// Function to display deposit transactions
function displayDepositTransactions(transactions) {
    const tableBody = document.getElementById('depositTableBody');
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" style="text-align: center;">No deposit transactions found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Create status badge
        const statusClass = `status-${transaction.status.toLowerCase()}`;
        const statusBadge = `<span class="status-badge ${statusClass}">${transaction.status}</span>`;
        
        // Set row content
        row.innerHTML = `
            <td>${transaction.transactionNumber}</td>
            <td>${transaction.trxId}</td>
            <td>${transaction.method}</td>
            <td>${transaction.userId}</td>
            <td>${transaction.amount}</td>
            <td>${statusBadge}</td>
            <td><button class="action-btn view-btn" data-transaction='${JSON.stringify(transaction)}'>View</button></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const transaction = JSON.parse(this.getAttribute('data-transaction'));
            showTransactionDetails(transaction);
        });
    });
}

// Function to show transaction details
function showTransactionDetails(transaction) {
    const modal = document.getElementById('transactionModal');
    const detailsContainer = document.getElementById('transactionDetails');
    const actionsContainer = document.getElementById('modalActions');
    const rejectionReasonContainer = document.getElementById('rejectionReasonContainer');
    
    // Create details HTML
    let detailsHTML = '';
    
    detailsHTML += createDetailRow('Transaction Number', transaction.transactionNumber);
    detailsHTML += createDetailRow('TRX ID', transaction.trxId, true);
    detailsHTML += createDetailRow('Method', transaction.method);
    detailsHTML += createDetailRow('User ID', transaction.userId);
    detailsHTML += createDetailRow('Amount', transaction.amount, true);
    detailsHTML += createDetailRow('Status', transaction.status);
    
    if (transaction.rejectionReason) {
        detailsHTML += createDetailRow('Reason', transaction.rejectionReason);
    }
    
    // Set details HTML
    detailsContainer.innerHTML = detailsHTML;
    
    // Set actions based on status
    actionsContainer.innerHTML = '';
    rejectionReasonContainer.style.display = 'none';
    
    if (transaction.status.toLowerCase() === 'pending') {
        // Show confirm and reject buttons for pending transactions
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'action-btn confirm-btn';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.addEventListener('click', function() {
            confirmTransaction(transaction.transactionNumber);
        });
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'action-btn reject-btn';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', function() {
            rejectionReasonContainer.style.display = 'block';
            document.getElementById('rejectionReason').focus();
            
            // Replace reject button with submit button
            this.style.display = 'none';
            
            const submitBtn = document.createElement('button');
            submitBtn.className = 'action-btn reject-btn';
            submitBtn.textContent = 'Submit Rejection';
            submitBtn.addEventListener('click', function() {
                const reason = document.getElementById('rejectionReason').value;
                if (!reason || reason.trim() === '') {
                    showNotification('Please enter a rejection reason', 'error');
                    return;
                }
                
                // Log the reason before rejecting
                console.log('Rejection reason before submitting:', reason);
                rejectTransaction(transaction.transactionNumber, reason);
            });
            
            actionsContainer.appendChild(submitBtn);
        });
        
        actionsContainer.appendChild(confirmBtn);
        actionsContainer.appendChild(rejectBtn);
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Add copy functionality to copy buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            copyToClipboard(textToCopy);
        });
    });
}

// Helper function to create a detail row
function createDetailRow(label, value, copyable = false) {
    const copyButton = copyable ? 
        `<button class="copy-btn" data-copy="${value}"><i class="fas fa-copy"></i> Copy</button>` : '';
    
    return `
        <div class="detail-row">
            <div class="detail-label">${label}:</div>
            <div class="detail-value">${value} ${copyButton}</div>
        </div>
    `;
}

// Function to confirm transaction
async function confirmTransaction(transactionNumber) {
    try {
        // Get the transaction data directly from the modal instead of using querySelector
        // This avoids complex selector issues with escaping quotes
        const viewButtons = document.querySelectorAll('.view-btn');
        let transaction = null;
        
        // Find the button with matching transaction number
        for (const button of viewButtons) {
            const buttonData = JSON.parse(button.getAttribute('data-transaction'));
            if (buttonData.transactionNumber === transactionNumber) {
                transaction = buttonData;
                break;
            }
        }
        
        if (!transaction) {
            throw new Error(`Transaction with number ${transactionNumber} not found`);
        }
        
        const amount = parseFloat(transaction.amount);
        const commission = calculateCommission(amount, 'deposit');
        
        console.log('Confirming transaction:', transactionNumber, 'with amount:', amount, 'commission:', commission);
        
        // Update transaction status in Google Sheet via SheetDB API
        // Using the correct SheetDB API ID for deposit transactions
        const success = await updateTransactionStatus('1e4k53su959b1', transactionNumber, 'Confirmed');
        
        if (success) {
            showNotification(`Transaction confirmed successfully! You earned ${commission} commission.`, 'success');
            
            // Close modal and reload transactions
            document.getElementById('transactionModal').style.display = 'none';
            loadDepositTransactions(JSON.parse(localStorage.getItem('currentUser')).username);
        } else {
            console.error('Failed to update transaction status to Confirmed');
            showNotification('Error confirming transaction. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error confirming transaction:', error);
        showNotification(`Error confirming transaction: ${error.message}. Please try again.`, 'error');
    }
}

// Function to reject transaction
async function rejectTransaction(transactionNumber, reason) {
    try {
        // Make sure reason is properly trimmed
        const trimmedReason = reason.trim();
        console.log('Rejecting transaction:', transactionNumber, 'with reason:', trimmedReason);
        
        // Update transaction status in Google Sheet via SheetDB API
        // Using the correct SheetDB API ID for deposit transactions
        const statusSuccess = await updateTransactionStatus('1e4k53su959b1', transactionNumber, 'Rejected');
        const reasonSuccess = await updateRejectionReason(transactionNumber, trimmedReason);
        
        if (statusSuccess && reasonSuccess) {
            showNotification('Transaction rejected successfully.', 'info');
            
            // Close modal and reload transactions
            document.getElementById('transactionModal').style.display = 'none';
            loadDepositTransactions(JSON.parse(localStorage.getItem('currentUser')).username);
        } else {
            // Provide more specific error message
            if (!statusSuccess) {
                showNotification('Error updating transaction status. Please try again.', 'error');
            } else if (!reasonSuccess) {
                showNotification('Error updating rejection reason. Please try again.', 'error');
            } else {
                showNotification('Error rejecting transaction. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error rejecting transaction:', error);
        // Show more detailed error message
        showNotification(`Error rejecting transaction: ${error.message}. Please try again.`, 'error');
    }
}