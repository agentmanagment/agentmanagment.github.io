// Commission functionality
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Load commission data
    loadCommissionData(currentUser.username);
    
    // Add event listener for withdraw commission button
    const withdrawCommissionBtn = document.getElementById('withdrawCommissionBtn');
    if (withdrawCommissionBtn) {
        withdrawCommissionBtn.addEventListener('click', function() {
            window.location.href = 'withdrawal.html';
        });
    }
});

// Function to load commission data
async function loadCommissionData(username) {
    try {
        // Load withdrawal transactions
        const withdrawalResponse = await fetch('https://docs.google.com/spreadsheets/d/1cpiLFItR6XLTookeZT5-9QJqcgJv28pQ3lMaNc2AlaQ/gviz/tq?tqx=out:csv');
        const withdrawalData = await withdrawalResponse.text();
        const withdrawalRows = parseCSV(withdrawalData);
        
        // Load deposit transactions
        const depositResponse = await fetch('https://docs.google.com/spreadsheets/d/1UPT_4aeGEcibpMrilgkNknlaF-vwT1YLVwaUsGj9mKc/gviz/tq?tqx=out:csv');
        const depositData = await depositResponse.text();
        const depositRows = parseCSV(depositData);
        
        // Process transactions and calculate commissions
        const commissions = [];
        
        // Process withdrawal transactions
        for (let i = 1; i < withdrawalRows.length; i++) { // Skip header row
            const row = withdrawalRows[i];
            if (row.length >= 8) {
                const agent = row[6]?.trim();
                const status = row[7]?.trim().toLowerCase();
                
                // Only include confirmed transactions for this agent
                if ((agent === username || agent.toLowerCase() === 'all') && status === 'confirmed') {
                    const transactionNumber = row[0]?.trim();
                    const amount = parseFloat(row[4]?.trim()) || 0;
                    const currency = row[5]?.trim();
                    const commission = calculateCommission(amount, 'withdrawal');
                    
                    commissions.push({
                        transactionNumber,
                        type: 'Withdrawal',
                        amount,
                        currency,
                        commission,
                        date: new Date().toISOString() // Using current date as transaction date is not provided
                    });
                }
            }
        }
        
        // Process deposit transactions
        for (let i = 1; i < depositRows.length; i++) { // Skip header row
            const row = depositRows[i];
            if (row.length >= 7) {
                const agent = row[6]?.trim();
                const status = row[5]?.trim().toLowerCase();
                
                // Only include confirmed transactions for this agent
                if ((agent === username || agent.toLowerCase() === 'all') && status === 'confirmed') {
                    const transactionNumber = row[0]?.trim();
                    const amount = parseFloat(row[4]?.trim()) || 0;
                    const commission = calculateCommission(amount, 'deposit');
                    
                    commissions.push({
                        transactionNumber,
                        type: 'Deposit',
                        amount,
                        currency: 'N/A', // Currency not provided in deposit sheet
                        commission,
                        date: new Date().toISOString() // Using current date as transaction date is not provided
                    });
                }
            }
        }
        
        // Sort commissions by transaction number (most recent first)
        commissions.sort((a, b) => {
            return parseInt(b.transactionNumber) - parseInt(a.transactionNumber);
        });
        
        // Display commissions
        displayCommissions(commissions);
    } catch (error) {
        console.error('Error loading commission data:', error);
        showNotification('Error loading commission data. Please try again.', 'error');
    }
}

// Function to display commissions
function displayCommissions(commissions) {
    const tableBody = document.getElementById('commissionTableBody');
    tableBody.innerHTML = '';
    
    if (commissions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center;">No commission data found</td>';
        tableBody.appendChild(row);
        // Set total commission to 0
        document.getElementById('totalCommission').textContent = '0.00';
        return;
    }
    
    // Calculate total commission by currency
    const commissionsByCurrency = {};
    
    commissions.forEach(commission => {
        const currency = commission.currency || 'N/A';
        
        // Initialize if this currency hasn't been seen yet
        if (!commissionsByCurrency[currency]) {
            commissionsByCurrency[currency] = 0;
        }
        
        // Add this commission to the appropriate currency total
        commissionsByCurrency[currency] += commission.commission;
        
        const row = document.createElement('tr');
        
        // Format date
        const formattedDate = formatDate(commission.date);
        
        // Set row content
        row.innerHTML = `
            <td>${commission.transactionNumber}</td>
            <td>${commission.type}</td>
            <td>${commission.amount.toFixed(2)}</td>
            <td>${currency}</td>
            <td>${commission.commission.toFixed(2)} ${currency}</td>
            <td>${formattedDate}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update total commission display with all currencies
    const totalCommissionElement = document.getElementById('totalCommission');
    totalCommissionElement.innerHTML = '';
    
    // Create a formatted display of all currency totals
    Object.keys(commissionsByCurrency).forEach((currency, index) => {
        const amount = commissionsByCurrency[currency];
        const commissionText = document.createElement('div');
        commissionText.textContent = `${amount.toFixed(2)} ${currency}`;
        
        // Add a separator between currencies except for the last one
        if (index < Object.keys(commissionsByCurrency).length - 1) {
            commissionText.style.marginBottom = '5px';
        }
        
        totalCommissionElement.appendChild(commissionText);
    });
}