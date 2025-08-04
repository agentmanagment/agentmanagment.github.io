// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Load recent transactions (both withdrawal and deposit)
    loadRecentTransactions(currentUser.username);

    // Close modal when clicking close button
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('transactionModal').style.display = 'none';
    });
});

// Function to load recent transactions
async function loadRecentTransactions(username) {
    try {
        // Load withdrawal transactions
        const withdrawalResponse = await fetch('https://docs.google.com/spreadsheets/d/1cpiLFItR6XLTookeZT5-9QJqcgJv28pQ3lMaNc2AlaQ/gviz/tq?tqx=out:csv');
        const withdrawalData = await withdrawalResponse.text();
        const withdrawalRows = parseCSV(withdrawalData);
        
        // Load deposit transactions
        const depositResponse = await fetch('https://docs.google.com/spreadsheets/d/1UPT_4aeGEcibpMrilgkNknlaF-vwT1YLVwaUsGj9mKc/gviz/tq?tqx=out:csv');
        const depositData = await depositResponse.text();
        const depositRows = parseCSV(depositData);
        
        // Combine and sort transactions
        const transactions = [];
        
        // Process withdrawal transactions
        for (let i = 1; i < withdrawalRows.length; i++) { // Skip header row
            const row = withdrawalRows[i];
            if (row.length >= 8) {
                const agent = row[6]?.trim();
                // Only include transactions for this agent or marked as 'All'
                if (agent === username || agent.toLowerCase() === 'all') {
                    transactions.push({
                        type: 'Withdrawal',
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
        
        // Process deposit transactions
        for (let i = 1; i < depositRows.length; i++) { // Skip header row
            const row = depositRows[i];
            if (row.length >= 7) {
                const agent = row[6]?.trim();
                // Only include transactions for this agent or marked as 'All'
                if (agent === username || agent.toLowerCase() === 'all') {
                    transactions.push({
                        type: 'Deposit',
                        transactionNumber: row[0]?.trim(),
                        trxId: row[1]?.trim(),
                        method: row[2]?.trim(),
                        userId: row[3]?.trim(),
                        amount: row[4]?.trim(),
                        status: row[5]?.trim(),
                        agent: agent
                    });
                }
            }
        }
        
        // Sort transactions by transaction number (most recent first)
        transactions.sort((a, b) => {
            return parseInt(b.transactionNumber) - parseInt(a.transactionNumber);
        });
        
        // Update transaction counts
        updateTransactionCounts(transactions);
        
        // Display recent transactions (limit to 5)
        displayRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions. Please try again.', 'error');
    }
}

// Function to update transaction counts
function updateTransactionCounts(transactions) {
    let pendingCount = 0;
    let confirmedCount = 0;
    let rejectedCount = 0;
    
    transactions.forEach(transaction => {
        const status = transaction.status.toLowerCase();
        if (status === 'pending') {
            pendingCount++;
        } else if (status === 'confirmed') {
            confirmedCount++;
        } else if (status === 'rejected') {
            rejectedCount++;
        }
    });
    
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('confirmedCount').textContent = confirmedCount;
    document.getElementById('rejectedCount').textContent = rejectedCount;
}

// Function to display recent transactions
function displayRecentTransactions(transactions) {
    const tableBody = document.getElementById('recentTransactionsBody');
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" style="text-align: center;">No transactions found</td>';
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
            <td>${transaction.amount}</td>
            <td>${transaction.currency || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>${transaction.type}</td>
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
    
    // Set modal title based on transaction type
    document.querySelector('.modal-header h2').textContent = `${transaction.type} Transaction Details`;
    
    // Create details HTML
    let detailsHTML = '';
    
    // Common fields
    detailsHTML += createDetailRow('Transaction Number', transaction.transactionNumber);
    detailsHTML += createDetailRow('Type', transaction.type);
    detailsHTML += createDetailRow('Method', transaction.method);
    detailsHTML += createDetailRow('User ID', transaction.userId);
    detailsHTML += createDetailRow('Amount', transaction.amount, true);
    
    // Type-specific fields
    if (transaction.type === 'Withdrawal') {
        detailsHTML += createDetailRow('Currency', transaction.currency);
        detailsHTML += createDetailRow('Account Number', transaction.accountNumber, true);
        if (transaction.trxId) {
            detailsHTML += createDetailRow('TRX ID', transaction.trxId);
        }
    } else if (transaction.type === 'Deposit') {
        if (transaction.trxId) {
            detailsHTML += createDetailRow('TRX ID', transaction.trxId, true);
        }
    }
    
    detailsHTML += createDetailRow('Status', transaction.status);
    
    // Set details HTML
    detailsContainer.innerHTML = detailsHTML;
    
    // Set actions based on status
    actionsContainer.innerHTML = '';
    
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