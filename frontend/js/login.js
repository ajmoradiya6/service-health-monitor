document.addEventListener('DOMContentLoaded', async () => {
    // Utility to ensure server-side logout if a session exists locally
    async function ensureServerLogoutIfNeeded() {
        const existingSessionId = localStorage.getItem('sessionId');
        if (!existingSessionId) return;

        const btn = document.getElementById('login-btn');
        let originalText = '';
        if (btn) {
            originalText = btn.textContent;
            btn.textContent = 'Signing out previous session...';
            btn.disabled = true;
        }

        try {
            console.log('Found existing session, logging out from server...');
            const response = await fetch(`/api/auth/logout?sessionId=${encodeURIComponent(existingSessionId)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                console.log('Successfully logged out from server');
            } else {
                console.error('Failed to logout from server:', response.status);
            }
        } catch (error) {
            console.error('Error during server logout:', error);
        } finally {
            // Clear session data from browser
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userInfo');
            console.log('Cleared session data from browser for fresh login');

            if (btn) {
                btn.textContent = originalText || 'Login';
                btn.disabled = false;
            }
        }
    }

    // Perform server logout first (if needed) before wiring up the form
    await ensureServerLogoutIfNeeded();

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

    // Note: Session cleanup is now handled at the beginning of DOMContentLoaded
    // This ensures fresh login every time the login page is accessed

    if (form) {
        if (window.lucide) {
            lucide.createIcons({ parentElement: form });
        }
        
        // Session cleanup is handled at the beginning of DOMContentLoaded
        
        // Initialize custom dropdown
        initCustomDropdown();
        
        // Fetch rooms when page loads
        fetchRooms();
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Double-check: if a session id somehow exists, log it out first
            const sid = localStorage.getItem('sessionId');
            if (sid) {
                try {
                    await fetch(`/api/auth/logout?sessionId=${encodeURIComponent(sid)}`, { method: 'GET' });
                } catch {}
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userInfo');
            }
            
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
