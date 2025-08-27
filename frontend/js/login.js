document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const roomSelect = document.getElementById('login-room');
    const dropdownTrigger = document.getElementById('room-dropdown-trigger');
    const dropdownMenu = document.getElementById('room-dropdown-menu');
    const selectedText = document.querySelector('.custom-dropdown-selected');

    // Custom dropdown functionality
    function initCustomDropdown() {
        // Toggle dropdown
        dropdownTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownTrigger.classList.toggle('active');
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownTrigger.classList.remove('active');
                dropdownMenu.classList.remove('show');
            }
        });

        // Handle option selection
        dropdownMenu.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;
                
                // Update selected text
                selectedText.textContent = text;
                
                // Update hidden select
                roomSelect.value = value;
                
                // Update visual selection
                dropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(option => {
                    option.classList.remove('selected');
                });
                e.target.classList.add('selected');
                
                // Close dropdown
                dropdownTrigger.classList.remove('active');
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Fetch rooms from API
    async function fetchRooms() {
        try {
            // Show loading state
            selectedText.textContent = 'Loading rooms...';
            dropdownTrigger.style.opacity = '0.6';
            dropdownTrigger.style.pointerEvents = 'none';
            
            const response = await fetch('/api/rooms');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rooms = await response.json();
            
            // Clear existing options
            dropdownMenu.innerHTML = '<div class="custom-dropdown-option" data-value="">Select Room</div>';
            
            // Add rooms to dropdown
            rooms.forEach(room => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.setAttribute('data-value', room);
                option.textContent = room;
                dropdownMenu.appendChild(option);
            });
            
            // Also update hidden select for form submission
            roomSelect.innerHTML = '<option value="">Select Room</option>';
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = room;
                roomSelect.appendChild(option);
            });
            
            // Reset UI state
            selectedText.textContent = 'Select Room';
            dropdownTrigger.style.opacity = '1';
            dropdownTrigger.style.pointerEvents = 'auto';
        } catch (error) {
            console.error('Error fetching rooms:', error);
            
            // Try to get more detailed error information
            let errorMessage = 'Failed to load rooms';
            if (error.response) {
                console.error('Error response:', error.response);
                if (error.response.data && error.response.data.error) {
                    errorMessage = error.response.data.error;
                }
            }
            
            // Add fallback options
            dropdownMenu.innerHTML = `
                <div class="custom-dropdown-option" data-value="">${errorMessage}</div>
                <div class="custom-dropdown-option" data-value="Default Room">Default Room</div>
            `;
            
            roomSelect.innerHTML = `
                <option value="">${errorMessage}</option>
                <option value="Default Room">Default Room</option>
            `;
            
            selectedText.textContent = 'Select Room';
            dropdownTrigger.style.opacity = '1';
            dropdownTrigger.style.pointerEvents = 'auto';
        }
    }

    // Check if user is already authenticated
    async function checkAuthStatus() {
        const sessionId = localStorage.getItem('sessionId');
        const userInfo = localStorage.getItem('userInfo');
        
        if (sessionId && userInfo) {
            try {
                // Check if session is still valid by calling the isAdmin endpoint
                const adminUrl = `http://localhost:8080/CVWeb/isAdmin?sessionId=${sessionId}`;
                const response = await fetch(adminUrl);
                const result = await response.text();
                
                if (result === 1) {
                    // Session is still valid, user is authenticated
                    console.log('User already authenticated, redirecting to home');
                    window.location.href = '/home';
                    return;
                } else {
                    // Session is invalid, clear stored data
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('userInfo');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                // Clear stored data on error
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userInfo');
            }
        }
    }

    if (form) {
        if (window.lucide) {
            lucide.createIcons({ parentElement: form });
        }
        
        // Check authentication status first
        //checkAuthStatus();
        
        // Initialize custom dropdown
        initCustomDropdown();
        
        // Fetch rooms when page loads
        fetchRooms();
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const room = roomSelect.value;
            
            // Basic validation
            if (!username || !password || !room) {
                alert('Please fill in all fields');
                return;
            }
            
            if (room === 'Select Room' || room === '') {
                alert('Please select a room');
                return;
            }
            
            // Show loading state
            const submitButton = document.getElementById('login-btn');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Authenticating...';
            submitButton.disabled = true;
            
            try {
                // Extract server name and room name from the selected room
                const roomParts = room.split('.');
                if (roomParts.length !== 2) {
                    alert('Invalid room format. Expected format: ServerName.RoomName');
                    return;
                }
                
                const serverName = roomParts[0];
                const roomName = roomParts[1];
                const localAddress = "10.4.8.188";
                
                // Authenticate user through backend
                const loginResponse = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username, password, serverName, roomName, localAddress
                    })
                });
                
                const authData = await loginResponse.json();
                
                if (authData.success) {
                    // Store session data and redirect
                    localStorage.setItem('sessionId', authData.sessionId);
                    localStorage.setItem('userInfo', JSON.stringify(authData.user));
                    window.location.href = '/home';
                } else {
                    alert(authData.error || 'Authentication failed.');
                }
            } catch (error) {
                console.error('Authentication error:', error);
                alert('Authentication failed. Please try again.');
            } finally {
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
});

