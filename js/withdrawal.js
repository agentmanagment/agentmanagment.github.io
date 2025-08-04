// Withdrawal functionality
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Load withdrawal transactions
    loadWithdrawalTransactions(currentUser.username);

    // Close modal when clicking close button
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('transactionModal').style.display = 'none';
    });
    
    // Add event listener for status filter
    document.getElementById('statusFilter').addEventListener('change', function() {
        filterWithdrawalTransactions();
    });
});

// Function to load withdrawal transactions
async function loadWithdrawalTransactions(username) {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/1cpiLFItR6XLTookeZT5-9QJqcgJv28pQ3lMaNc2AlaQ/gviz/tq?tqx=out:csv');
        const data = await response.text();
        const rows = parseCSV(data);
        
        const transactions = [];
        
        for (let i = 1; i < rows.length; i++) { // Skip header row
            const row = rows[i];
            if (row.length >= 8) {
                const agent = row[6]?.trim();
                // Only include transactions for this agent or marked as 'All'
                if (agent === username || agent.toLowerCase() === 'all') {
                    transactions.push({
                        transactionNumber: row[0]?.trim(),
                        method: row[1]?.trim(),
                        accountNumber: row[2]?.trim(),
                        userId: row[3]?.trim(),
                        amount: row[4]?.trim(),
                        currency: row[5]?.trim(),
                        agent: agent,
                        status: row[7]?.trim(),
                        trxId: row[8]?.trim() || ''
                    });
                }
            }
        }
        
        // Store transactions in a global variable for filtering
        window.allWithdrawalTransactions = transactions;
        
        // Display transactions (initially all)
        filterWithdrawalTransactions();
    } catch (error) {
        console.error('Error loading withdrawal transactions:', error);
        showNotification('Error loading withdrawal transactions. Please try again.', 'error');
    }
}

// Function to filter withdrawal transactions based on status
function filterWithdrawalTransactions() {
    if (!window.allWithdrawalTransactions) return;
    
    const statusFilter = document.getElementById('statusFilter').value;
    let filteredTransactions = [];
    
    if (statusFilter === 'all') {
        filteredTransactions = window.allWithdrawalTransactions;
    } else {
        filteredTransactions = window.allWithdrawalTransactions.filter(transaction => 
            transaction.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    displayWithdrawalTransactions(filteredTransactions);
}

// Function to display withdrawal transactions
function displayWithdrawalTransactions(transactions) {
    const tableBody = document.getElementById('withdrawalTableBody');
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" style="text-align: center;">No withdrawal transactions found</td>';
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
            <td>${transaction.method}</td>
            <td>${transaction.accountNumber}</td>
            <td>${transaction.userId}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.currency}</td>
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
    const trxIdInputContainer = document.getElementById('trxIdInputContainer');
    
    // Create details HTML
    let detailsHTML = '';
    
    detailsHTML += createDetailRow('Transaction Number', transaction.transactionNumber);
    detailsHTML += createDetailRow('Method', transaction.method);
    detailsHTML += createDetailRow('Account Number', transaction.accountNumber, true);
    detailsHTML += createDetailRow('User ID', transaction.userId);
    detailsHTML += createDetailRow('Amount', transaction.amount, true);
    detailsHTML += createDetailRow('Currency', transaction.currency);
    detailsHTML += createDetailRow('Status', transaction.status);
    
    if (transaction.trxId) {
        detailsHTML += createDetailRow('TRX ID', transaction.trxId);
    }
    
    // Set details HTML
    detailsContainer.innerHTML = detailsHTML;
    
    // Set actions based on status
    actionsContainer.innerHTML = '';
    trxIdInputContainer.style.display = 'none';
    
    if (transaction.status.toLowerCase() === 'pending') {
        // Show confirm and reject buttons for pending transactions
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'action-btn confirm-btn';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.addEventListener('click', function() {
            trxIdInputContainer.style.display = 'block';
            const trxIdInput = document.getElementById('trxIdInput');
            trxIdInput.focus();
            
            // Replace confirm button with submit button
            this.style.display = 'none';
            
            const submitBtn = document.createElement('button');
            submitBtn.className = 'action-btn confirm-btn';
            submitBtn.textContent = 'Submit';
            submitBtn.addEventListener('click', function() {
                const trxId = trxIdInput.value.trim();
                if (!trxId) {
                    showNotification('Please enter a TRX ID', 'error');
                    return;
                }
                
                // Log the TRX ID before confirming
                console.log('TRX ID before confirming:', trxId);
                confirmTransaction(transaction.transactionNumber, trxId);
            });
            
            actionsContainer.appendChild(submitBtn);
        });
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'action-btn reject-btn';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', function() {
            rejectTransaction(transaction.transactionNumber);
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

// Function to confirm a transaction
async function confirmTransaction(transactionNumber, trxId) {
    try {
        // Make sure trxId is properly trimmed and not empty
        if (!trxId || trxId.trim() === '') {
            showNotification('TRX ID cannot be empty for confirmation', 'error');
            return;
        }
        
        // Trim the trxId to remove any whitespace
        trxId = trxId.trim();
        console.log('Trimmed TRX ID:', trxId);
        // Calculate commission (5% for withdrawal)
        // Fix the selector to properly escape quotes
        console.log('Looking for transaction with number:', transactionNumber);
        
        // First try to find the transaction using a more reliable approach
        let transaction;
        const viewButtons = document.querySelectorAll('.view-btn');
        for (const button of viewButtons) {
            const buttonData = button.getAttribute('data-transaction');
            try {
                const parsedData = JSON.parse(buttonData);
                if (parsedData.transactionNumber === transactionNumber) {
                    transaction = parsedData;
                    console.log('Found matching transaction:', transaction);
                    break;
                }
            } catch (parseError) {
                console.error('Error parsing button data:', parseError);
            }
        }
        
        if (!transaction) {
            throw new Error(`Transaction with number ${transactionNumber} not found in the current view`);
        }
        const amount = parseFloat(transaction.amount);
        const commission = calculateCommission(amount, 'withdrawal');
        
        // Log the transaction number and TRX ID before updating
        console.log('Confirming transaction:', transactionNumber, 'with TRX ID:', trxId);
        
        // Make sure transactionNumber is trimmed
        const trimmedTransactionNumber = transactionNumber.trim();
        console.log('Trimmed transaction number:', trimmedTransactionNumber);
        
        // Update transaction status in Google Sheet via SheetDB API
        try {
            const success = await updateTransactionStatus('k76oqu1eo6sxg', trimmedTransactionNumber, 'Confirmed', trxId);
            
            if (success) {
                showNotification(`Transaction confirmed successfully! You earned ${commission} ${transaction.currency} commission.`, 'success');
                
                // Close modal and reload transactions
                document.getElementById('transactionModal').style.display = 'none';
                loadWithdrawalTransactions(JSON.parse(localStorage.getItem('currentUser')).username);
            } else {
                showNotification('Error confirming transaction. Please try again.', 'error');
            }
        } catch (updateError) {
            console.error('Error in updateTransactionStatus:', updateError);
            showNotification(`Error confirming transaction: ${updateError.message}`, 'error');
            // Log additional details about the error for debugging
            console.log('Transaction details that failed:', { transactionNumber, trxId, error: updateError.message });
            console.log('Full update error stack:', updateError.stack);
        }
    } catch (error) {
        console.error('Error confirming transaction:', error);
        showNotification(`Error confirming transaction: ${error.message}`, 'error');
        // Log the full error stack for better debugging
        console.log('Full error stack:', error.stack);
    }
}

// Function to reject transaction
async function rejectTransaction(transactionNumber) {
    try {
        // Update transaction status in Google Sheet via SheetDB API
        const success = await updateTransactionStatus('k76oqu1eo6sxg', transactionNumber, 'Rejected');
        
        if (success) {
            showNotification('Transaction rejected successfully.', 'info');
            
            // Close modal and reload transactions
            document.getElementById('transactionModal').style.display = 'none';
            loadWithdrawalTransactions(JSON.parse(localStorage.getItem('currentUser')).username);
        } else {
            showNotification('Error rejecting transaction. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error rejecting transaction:', error);
        showNotification('Error rejecting transaction. Please try again.', 'error');
    }
}