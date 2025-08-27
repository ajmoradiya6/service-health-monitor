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

    if (form) {
        if (window.lucide) {
            lucide.createIcons({ parentElement: form });
        }
        
        // Initialize custom dropdown
        initCustomDropdown();
        
        // Fetch rooms when page loads
        fetchRooms();
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = '/home';
        });
    }
});

