// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    // Check if user is already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        // Check if user status is still active before redirecting
        checkUserStatus(currentUser.username, currentUser.password);
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Authenticate user against Google Sheet
        authenticateUser(username, password);
    });

    function authenticateUser(username, password) {
        // Show loading message
        loginMessage.textContent = 'Authenticating...';
        loginMessage.style.color = '#00FFFF';
        
        // Fetch user data from Google Sheet
        fetch('https://docs.google.com/spreadsheets/d/1ceJEL9omxk8btcFyaXTkLte7qSy6nVuPOtW8O3OI3F8/gviz/tq?tqx=out:csv')
            .then(response => response.text())
            .then(data => {
                // Parse CSV data
                const rows = parseCSV(data);
                
                // Find user
                let userFound = false;
                let userStatus = '';
                let userMessage = '';
                let userLogo = '';
                let userFullName = '';
                
                for (let i = 1; i < rows.length; i++) { // Skip header row
                    const row = rows[i];
                    if (row.length >= 6) {
                        const rowUsername = row[0]?.trim();
                        const rowPassword = row[1]?.trim();
                        const rowLogo = row[2]?.trim();
                        const rowFullName = row[3]?.trim();
                        const rowStatus = row[4]?.trim();
                        const rowMessage = row[5]?.trim();
                        
                        if (rowUsername === username && rowPassword === password) {
                            userFound = true;
                            userStatus = rowStatus;
                            userMessage = rowMessage;
                            userLogo = rowLogo;
                            userFullName = rowFullName;
                            break;
                        }
                    }
                }
                
                if (userFound) {
                    if (userStatus.toLowerCase() === 'active') {
                        // Store user info in localStorage
                        const userInfo = {
                            username: username,
                            password: password, // Storing for status check only
                            fullName: userFullName,
                            status: userStatus,
                            logo: userLogo,
                            message: userMessage
                        };
                        localStorage.setItem('currentUser', JSON.stringify(userInfo));
                        
                        // Redirect to dashboard
                        window.location.href = 'dashboard.html';
                    } else {
                        // Show status message
                        loginMessage.textContent = userMessage || `Account ${userStatus}. Please contact administrator.`;
                        loginMessage.style.color = '#ff6b6b';
                    }
                } else {
                    // Invalid credentials
                    loginMessage.textContent = 'Invalid username or password';
                    loginMessage.style.color = '#ff6b6b';
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                loginMessage.textContent = 'Error connecting to server. Please try again.';
                loginMessage.style.color = '#ff6b6b';
            });
    }

    function checkUserStatus(username, password) {
        // Fetch user data from Google Sheet to check current status
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
                        
                        if (rowUsername === username && rowPassword === password) {
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
                        // Show notification if on a page other than login
                        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                            alert(userMessage || `Your account is now ${userStatus}. You have been logged out.`);
                            window.location.href = 'index.html';
                        }
                    } else if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
                        // User is active and on login page, redirect to dashboard
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // User no longer exists in the system
                    localStorage.removeItem('currentUser');
                    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                        alert('Your account no longer exists. You have been logged out.');
                        window.location.href = 'index.html';
                    }
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
});