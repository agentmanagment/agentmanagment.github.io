// Maintenance mode functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check maintenance status after user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        checkMaintenanceStatus(currentUser.username);
    }
});

// Function to check maintenance status
function checkMaintenanceStatus(username) {
    // Fetch maintenance data from Google Sheet
    fetch('https://docs.google.com/spreadsheets/d/1JKYH84tKeBDZhrNX2YBQVVvYq4CJny-rIdyOk4RY2_4/gviz/tq?tqx=out:csv')
        .then(response => response.text())
        .then(data => {
            // Parse CSV data
            const rows = parseCSV(data);
            
            let showMaintenance = false;
            let maintenanceMessage = '';
            
            // Check for 'All' users maintenance mode
            for (let i = 1; i < rows.length; i++) { // Skip header row
                const row = rows[i];
                if (row.length >= 3) {
                    const rowUsername = row[0]?.trim();
                    const maintenanceStatus = row[1]?.trim();
                    const notice = row[2]?.trim();
                    
                    // Check if maintenance is on for all users
                    if (rowUsername.toLowerCase() === 'all' && maintenanceStatus.toLowerCase() === 'on') {
                        showMaintenance = true;
                        maintenanceMessage = notice || 'System is currently under maintenance';
                        break;
                    }
                    
                    // Check if maintenance is on for specific user
                    if (rowUsername.toLowerCase() === username.toLowerCase() && maintenanceStatus.toLowerCase() === 'on') {
                        showMaintenance = true;
                        maintenanceMessage = notice || 'Your account is currently under maintenance';
                        break;
                    }
                }
            }
            
            if (showMaintenance) {
                showMaintenancePopup(maintenanceMessage);
            }
        })
        .catch(error => {
            console.error('Error checking maintenance status:', error);
        });
}

// Function to show maintenance popup
function showMaintenancePopup(message) {
    // Check if overlay already exists
    let overlay = document.getElementById('maintenanceOverlay');
    
    // If overlay doesn't exist, create it
    if (!overlay) {
        // Create maintenance overlay
        overlay = document.createElement('div');
        overlay.className = 'maintenance-overlay';
        overlay.id = 'maintenanceOverlay';
        
        // Create maintenance popup
        const popup = document.createElement('div');
        popup.className = 'maintenance-popup';
        popup.id = 'maintenancePopup';
        
        // Create popup content
        popup.innerHTML = `
            <div class="maintenance-header">
                <h2>Service Temporarily Unavailable</h2>
                <span class="maintenance-close" id="maintenanceClose">&times;</span>
            </div>
            <div class="maintenance-content">
                <p>${message}</p>
            </div>
        `;
        
        // Append popup to overlay
        overlay.appendChild(popup);
        
        // Append overlay to body
        document.body.appendChild(overlay);
    } else {
        // If overlay exists, just make it visible
        overlay.style.display = 'flex';
    }
    
    // Add event listener to close button
    const closeBtn = document.getElementById('maintenanceClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            // Temporarily hide the maintenance popup when close button is clicked
            hideMaintenancePopup();
        });
    }
    
    // Add event listener to overlay for clicks outside popup
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) {
            // When clicking on the overlay (outside popup), just hide it temporarily
            // This allows interaction with the website while keeping the popup accessible
            hideMaintenancePopup();
        }
    });
    
    // Add event listener to document to show popup again when clicking anywhere except logout button or popup
    document.addEventListener('click', function(event) {
        // Check if popup is hidden and click is not on logout button or popup
        const overlay = document.getElementById('maintenanceOverlay');
        const popup = document.getElementById('maintenancePopup');
        const logoutBtn = document.querySelector('.logout-btn');
        
        // Only show popup again if:
        // 1. Overlay exists and is hidden
        // 2. Click is not on logout button
        // 3. Click is not inside the popup
        if (overlay && overlay.style.display === 'none' && 
            (!logoutBtn || !logoutBtn.contains(event.target)) && 
            (!popup || !popup.contains(event.target))) {
            showMaintenancePopupAgain();
        }
    });
}

// Function to hide maintenance popup temporarily
function hideMaintenancePopup() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Function to show maintenance popup again
function showMaintenancePopupAgain() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
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