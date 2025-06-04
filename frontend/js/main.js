async function loadServices() {
  try {
    const response = await fetch('/api/services');
    
    if (!response.ok) {
        console.error('Failed to fetch services:', response.status, response.statusText);
        // Optionally try to read response body for more error details
        const errorText = await response.text();
        console.error('Response body:', errorText);
        return; // Stop execution if fetch failed
    }

    const services = await response.json();

    // Correctly get the services list container by its new ID
    const container = document.getElementById('service-list');
    
    if (!container) {
        console.error('Service list container not found in the DOM.');
        return; // Exit if the container is still not found (should not happen after adding ID)
    }

    container.innerHTML = '';  // Clear any existing content

    services.forEach((service, index) => {
      const div = document.createElement('div');
      // Use the existing service-item class and add click handler
      // The main div click will handle service selection
      div.className = 'service-item';
      div.onclick = (event) => {
          // Prevent the ellipsis click from triggering service selection
          if (event.target.closest('.service-actions')) {
              return;
          }
          selectService(div, index, service);
      };
      
      // Construct the inner HTML with status dot, service name, and actions (ellipsis)
      const statusColor = 'var(--green-primary)'; // Placeholder
      
      div.innerHTML = `
          <div class="status-dot" style="background-color: ${statusColor};"></div>
          <span class="service-name">${service.name}</span>
          <div class="service-actions" data-service-id="${service.id}"><i data-lucide="more-vertical"></i></div>
      `;
      
      // Store service data on the element
      div.dataset.service = JSON.stringify(service);

      container.appendChild(div);
    });

    // After adding all service items, create Lucide icons within the container
    lucide.createIcons({
        parentElement: container // Only create icons within the service list container
    });

    // Add event listener for service actions (ellipsis) using delegation
    container.addEventListener('click', handleServiceActionsClick);

  } catch (error) {
    console.error('Network error or exception while loading services:', error);
  }
}

window.onload = loadServices;

// ===== GLOBAL VARIABLES =====
let chartData = [];
let activeService = 0;
let activeTab = 'metrics';
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
let animationFrame;

// Get modal elements and forms
const registerServiceModal = document.getElementById('register-service-modal');
const registerServiceForm = document.getElementById('register-service-form');
const editServiceModal = document.getElementById('edit-service-modal');
const editServiceForm = document.getElementById('edit-service-form');

// Get confirmation modal elements
const confirmationModal = document.getElementById('confirmation-modal');
const confirmDeleteButton = document.getElementById('confirm-delete-btn');

// Variable to store the service ID for deletion
let serviceIdToDelete = null;

// Get sidebar elements
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('sidebar-resizer');
const mainContent = document.querySelector('.main-content');

// Sidebar resizing variables
let isResizing = false;
let lastDownX = 0;
let initialSidebarWidth = 0;
const MIN_SIDEBAR_WIDTH = 200; // Adjust as needed
const MAX_SIDEBAR_WIDTH = 400; // Adjust as needed

// Context menu state
let activeContextMenu = null;

// Sample log data
const logData = [
    { level: 'warning', timestamp: '09:02:22', message: 'Service service1 running normally' },
    { level: 'info', timestamp: '09:02:22', message: 'Service service1 processing requests' },
    { level: 'error', timestamp: '09:02:28', message: 'Service service1 running normally' },
    { level: 'error', timestamp: '09:02:32', message: 'Service service1 running normally' },
    { level: 'warning', timestamp: '09:02:32', message: 'Service service1 running normally' },
    { level: 'info', timestamp: '09:02:33', message: 'Service service1 processing requests' },
    { level: 'info', timestamp: '09:02:35', message: 'Database connection established' },
    { level: 'warning', timestamp: '09:02:40', message: 'High memory usage detected' },
    { level: 'error', timestamp: '09:02:45', message: 'Failed to connect to external API' },
    { level: 'info', timestamp: '09:02:50', message: 'User authentication successful' },
    { level: 'warning', timestamp: '09:02:55', message: 'Slow query detected in database' },
    { level: 'info', timestamp: '09:02:50', message: 'Cache cleared successfully' }
];

// ===== ANIMATION FUNCTIONS =====
function addIconAnimation(element, animationClass) {
    if (element) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, 1200);
    }
}

// ===== THEME FUNCTIONS =====
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = body.getAttribute('data-theme');
    const themeIconContainer = document.querySelector('.theme-icon-container');
    
    if (!themeIconContainer) return;

    // Create ripple effect
    const themeButton = document.querySelector('.theme-button');
    if (!themeButton) return;
    const rect = themeButton.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    ripple.style.left = (rect.left + rect.width/2) + 'px';
    ripple.style.top = (rect.top + rect.height/2) + 'px';
    document.body.appendChild(ripple);
    
    // Add transition class to body
    body.classList.add('theme-transition');
    
    // Pulse effect on icon
    themeIconContainer.classList.add('theme-pulse');
    
    // Start ripple animation
    setTimeout(() => {
        ripple.style.animation = 'ripple 1s ease-out forwards';
    }, 50);
    
    // Change theme with slight delay for visual effect
    setTimeout(() => {
        if (currentTheme === 'dark') {
            body.setAttribute('data-theme', 'light');
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
            localStorage.setItem('theme', 'dark');
        }
        
        // Recreate icons to update the theme icon and other icons
        lucide.createIcons();

        // Re-attach event listener to the plus icon after re-creation
        const newOpenModalButton = document.querySelector('.sidebar-header .expand-icon');
        if (newOpenModalButton) {
            // Remove existing listener before adding a new one
            // Note: This assumes the openModalButton variable might still hold a reference to an old element.
            // A more robust solution might involve event delegation or ensuring icon re-creation is synchronous if possible.
            
            // Remove existing listener before adding a new one
            newOpenModalButton.removeEventListener('click', openRegisterServiceModal);
            newOpenModalButton.addEventListener('click', openRegisterServiceModal);
        }
    }, 350); // Increased delay slightly
    
    // Remove transition class after animation completes
    setTimeout(() => {
        body.classList.remove('theme-transition');
        themeIconContainer.classList.remove('theme-pulse');
        ripple.remove();
    }, 1000);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    body.setAttribute('data-theme', savedTheme);
    
    if (savedTheme === 'dark') {
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    }
}

// ===== MODAL FUNCTIONS =====
// Function to open the Register Service modal
function openRegisterServiceModal() {
    const modal = document.getElementById('register-service-modal');
    if (modal) {
        modal.style.display = 'flex'; // Use flex to center
    }
}

// Function to close the Register Service modal
function closeRegisterServiceModal() {
    const modal = document.getElementById('register-service-modal');
    const form = document.getElementById('register-service-form');
    if (modal) {
        modal.style.display = 'none';
        if (form) {
            form.reset(); // Reset form fields
        }
    }
}

// Function to open the Edit Service modal and populate it
function openEditServiceModal(service) {
    const modal = document.getElementById('edit-service-modal');
    if (modal) {
        document.getElementById('edit-service-id').value = service.id;
        document.getElementById('edit-service-name').value = service.name;
        document.getElementById('edit-service-url').value = service.url;
        document.getElementById('edit-service-port').value = service.port;
        modal.style.display = 'flex'; // Use flex to center
    }
}

// Function to close the Edit Service modal
function closeEditServiceModal() {
    const modal = document.getElementById('edit-service-modal');
    const form = document.getElementById('edit-service-form');
    if (modal) {
        modal.style.display = 'none';
        if (form) {
            form.reset(); // Optional: Clear form fields
        }
    }
}

// ===== SIDEBAR FUNCTIONS =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
        
        // Add animation to menu icon
        const menuIcon = document.querySelector('.mobile-menu-btn i');
        addIconAnimation(menuIcon, 'menu-slide');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

function selectService(element, index, serviceData) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    activeService = index;
    
    // You can now use serviceData here, e.g., to display service details
    console.log('Selected service:', serviceData);
    // Example: display service name in a main content header
    // document.getElementById('page-title').textContent = serviceData.name;

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function switchTab(element, tabName, index) {
    const tabs = document.querySelectorAll('.tab');
    const tabSlider = document.querySelector('.tab-slider');
    const chartContainer = document.getElementById('chart-container');
    const logsContainer = document.getElementById('logs-container');
    
    if (!tabSlider || !chartContainer || !logsContainer) return;

    // Update tab slider position - account for the gap
    if (index === 0) {
        tabSlider.style.transform = 'translateX(0)';
    } else {
        tabSlider.style.transform = 'translateX(calc(100% + 8px))';
    }
    
    // Update active tab
    tabs.forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    activeTab = tabName;

    // Switch containers
    if (tabName === 'metrics') {
        chartContainer.style.display = 'block';
        logsContainer.classList.remove('active');
    } else if (tabName === 'logs') {
        chartContainer.style.display = 'none';
        logsContainer.classList.add('active');
        populateLogs();
    }
    
    // Add animation to tab icon
    const tabIcon = element.querySelector('i');
    addIconAnimation(tabIcon, 'chart-pulse');
}

// ===== LOGS FUNCTIONS =====
function populateLogs() {
    const logsList = document.getElementById('logs-list');
    if (!logsList) return;

    logsList.innerHTML = '';
    
    logData.forEach((log, index) => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.level}`;
        logEntry.style.animationDelay = `${index * 0.05}s`;
        
        logEntry.innerHTML = `
            <div class="log-level ${log.level}">${log.level}</div>
            <div class="log-timestamp">${log.timestamp}</div>
            <div class="log-message">${log.message}</div>
        `;
        
        logsList.appendChild(logEntry);
    });
}

function toggleFilter() {
    // Placeholder for filter functionality
    console.log('Filter toggle clicked');
}

function exportLogs() {
    // Placeholder for export functionality
    console.log('Export logs clicked');
}

// ===== CHART FUNCTIONS =====
function generateData(points = 40) {
    const data = [];
    const now = new Date();
    for (let i = 0; i < points; i++) {
        const time = new Date(now.getTime() - (points - i) * 15000);
        data.push({
            time: time,
            cpu: 20 + Math.sin(i * 0.1) * 10 + Math.random() * 8,
            memory: 35 + Math.cos(i * 0.15) * 8 + Math.random() * 6
        });
    }
    return data;
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawChart();
}

function drawChart() {
    if (chartData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const padding = isSmallMobile ? 25 : isMobile ? 30 : 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Get theme-aware colors
    const isLightMode = document.body.getAttribute('data-theme') === 'light';
    const gridColor = isLightMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(78, 93, 120, 0.15)';
    const textColor = isLightMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(156, 163, 175, 0.8)';
    
    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    const gridLines = isMobile ? 3 : 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    const verticalLines = isMobile ? 4 : 6;
    for (let i = 0; i <= verticalLines; i++) {
        const x = padding + (chartWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw Y-axis labels
    ctx.fillStyle = textColor;
    ctx.font = isSmallMobile ? '8px Inter' : isMobile ? '9px Inter' : '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        const value = 60 - (i * (60 / gridLines));
        ctx.fillText(Math.round(value).toString(), padding - 5, y + 3);
    }
    
    // Draw X-axis labels
    ctx.textAlign = 'center';
    const timeLabels = isMobile ? 2 : 3;
    for (let i = 0; i <= timeLabels; i++) {
        const x = padding + (chartWidth / timeLabels) * i;
        const dataIndex = Math.floor((chartData.length - 1) * (i / timeLabels));
        const time = chartData[dataIndex].time;
        const timeStr = time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit'
        });
        ctx.fillText(timeStr, x, height - padding + 12);
    }
    
    // Draw area under CPU line
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    chartData.forEach((point, index) => {
        const x = padding + (chartWidth / (chartData.length - 1)) * index;
        const y = padding + chartHeight - (point.cpu / 60) * chartHeight;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Draw area under Memory line
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    chartData.forEach((point, index) => {
        const x = padding + (chartWidth / (chartData.length - 1)) * index;
        const y = padding + chartHeight - (point.memory / 60) * chartHeight;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Draw CPU line with gradient
    const cpuGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    cpuGradient.addColorStop(0, 'rgba(59, 130, 246, 0.7)');
    cpuGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    
    // Draw Memory line with gradient
    const memGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    memGradient.addColorStop(0, 'rgba(139, 92, 246, 0.7)');
    memGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    
    ctx.strokeStyle = cpuGradient;
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.beginPath();
    chartData.forEach((point, index) => {
        const x = padding + (chartWidth / (chartData.length - 1)) * index;
        const y = padding + chartHeight - (point.cpu / 60) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw Memory line with gradient
    ctx.strokeStyle = memGradient;
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.beginPath();
    chartData.forEach((point, index) => {
        const x = padding + (chartWidth / (chartData.length - 1)) * index;
        const y = padding + chartHeight - (point.memory / 60) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw data points
    chartData.forEach((point, index) => {
        const x = padding + (chartWidth / (chartData.length - 1)) * index;
        
        // CPU point
        const cpuY = padding + chartHeight - (point.cpu / 60) * chartHeight;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();
        ctx.arc(x, cpuY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, cpuY, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Memory point
        const memY = padding + chartHeight - (point.memory / 60) * chartHeight;
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.beginPath();
        ctx.arc(x, memY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(x, memY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ===== UPDATE FUNCTIONS =====
function updateMetrics() {
    const memoryElement = document.getElementById('memory-value');
    const cpuElement = document.getElementById('cpu-value');
    const connectionsElement = document.getElementById('connections-value');
    
    if (!memoryElement || !cpuElement || !connectionsElement) return;

    const newMemory = (35 + Math.random() * 10).toFixed(1);
    const newCpu = (20 + Math.random() * 15).toFixed(1);
    const newConnections = Math.floor(70 + Math.random() * 20);
    
    // Animate the values
    animateValue(memoryElement, parseFloat(memoryElement.textContent), parseFloat(newMemory), 1000, '%');
    animateValue(cpuElement, parseFloat(cpuElement.textContent), parseFloat(newCpu), 1000, '%');
    animateValue(connectionsElement, parseInt(connectionsElement.textContent), newConnections, 1000);
}

function animateValue(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    
    function updateValue(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2; // Ease in-out quad
        
        const value = start + (end - start) * easeProgress;
        element.textContent = `${value.toFixed(1)}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            element.textContent = `${end.toFixed(1)}${suffix}`;
        }
    }
    
    requestAnimationFrame(updateValue);
}

function updateChartData() {
    const lastTime = chartData[chartData.length - 1]?.time || new Date();
    const newTime = new Date(lastTime.getTime() + 15000);
    
    chartData.push({
        time: newTime,
        cpu: 20 + Math.sin(chartData.length * 0.1) * 10 + Math.random() * 8,
        memory: 35 + Math.cos(chartData.length * 0.15) * 8 + Math.random() * 6
    });
    
    if (chartData.length > 40) {
        chartData.shift();
    }
    
    // Animate chart update
    animateChart();
}

function animateChart() {
    let startTime;
    const duration = 1000;
    
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        drawChart();
        
        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrame);
            animationFrame = null; // Clear animationFrame when done
        }
    }
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    
    animationFrame = requestAnimationFrame(animate);
}

// ===== SEARCH FUNCTIONALITY =====
function setupLogSearch() {
    const searchInput = document.getElementById('log-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const logEntries = document.querySelectorAll('.log-entry');
        
        logEntries.forEach(entry => {
            const message = entry.querySelector('.log-message').textContent.toLowerCase();
            if (message.includes(searchTerm)) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    });
}

// ===== CONTEXT MENU FUNCTIONS =====

// Placeholder functions for context menu actions
function handleEditService(serviceId) {
    console.log('Edit service with ID:', serviceId);
    // Find the service data for the given ID
    const serviceItems = document.querySelectorAll('.service-item');
    let serviceToEdit = null;
    serviceItems.forEach(item => {
        const serviceData = JSON.parse(item.dataset.service);
        if (serviceData.id === serviceId) {
            serviceToEdit = serviceData;
        }
    });

    if (serviceToEdit) {
        openEditServiceModal(serviceToEdit);
    } else {
        console.error('Service with ID', serviceId, 'not found.');
    }
    hideContextMenu(); // Hide the context menu
}

function handleDeleteService(serviceId) {
    // Instead of confirm, open the custom confirmation modal
    openConfirmationModal(serviceId);
    hideContextMenu();
}

// Function to handle clicks on service actions (ellipsis)
function handleServiceActionsClick(event) {
    const actionsElement = event.target.closest('.service-actions');
    if (actionsElement) {
        event.stopPropagation(); // Prevent click from bubbling to parent service-item
        const serviceId = actionsElement.dataset.serviceId;

        // Use the actionsElement itself as the target for positioning
        showContextMenu(actionsElement, serviceId);
    }
}

// Placeholder functions for showing/hiding the context menu
function showContextMenu(targetElement, serviceId) {
    // Remove any existing context menu
    hideContextMenu();

    const contextMenu = document.createElement('ul');
    contextMenu.className = 'context-menu';
    contextMenu.dataset.serviceId = serviceId; // Store service ID on the menu

    contextMenu.innerHTML = `
        <li onclick="handleEditService('${serviceId}')"><i data-lucide="edit"></i> Edit</li>
        <li onclick="handleDeleteService('${serviceId}')"><i data-lucide="trash-2"></i> Delete</li>
    `;

    // Position the context menu near the target element
    const rect = targetElement.getBoundingClientRect();
    // Position below the target element, aligned to its right edge
    // Get the menu width after it's in the DOM for accurate calculation
    const menuWidth = contextMenu.offsetWidth;
    contextMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    contextMenu.style.left = `${rect.right + window.scrollX - menuWidth}px`;

    document.body.appendChild(contextMenu);
    activeContextMenu = contextMenu;

    // Create icons within the new context menu
    lucide.createIcons({
        parentElement: contextMenu // Only create icons within the context menu
    });

    // Add a click listener to the document to hide the menu when clicking outside
    // Use setTimeout with 0 delay to allow the current click event to bubble and be processed first
    setTimeout(() => {
        // Only add the listener if activeContextMenu is still the one we just created
        if (activeContextMenu === contextMenu) {
             document.addEventListener('click', handleClickOutsideMenu);
        }
    }, 0);
}

function hideContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.remove();
        // Remove the outside click listener when the menu is hidden
        document.removeEventListener('click', handleClickOutsideMenu);
        activeContextMenu = null;
    }
}

function handleClickOutsideMenu(event) {
    // Hide the menu if the click is not inside the menu itself
    if (activeContextMenu && !activeContextMenu.contains(event.target)) {
        hideContextMenu();
    }
}

// ===== EVENT LISTENERS =====

// Event listener for window resize to redraw chart and update tab slider
window.addEventListener('resize', () => {
    setTimeout(resizeCanvas, 100);

    // Update tab slider position
    const tabs = document.querySelectorAll('.tab');
    const tabSlider = document.querySelector('.tab-slider');
    if (!tabs || !tabSlider) return;
    const activeIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active'));

    tabSlider.style.transform = `translateX(${(activeIndex * 100)}%)`; // Use percentage for flexibility
});

// Event listener for orientation change to redraw chart
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});

// Event listener to close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (sidebar && menuBtn && window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target)) {
        closeSidebar();
    }
});

// Event listener to close the modal when clicking outside the modal content
window.addEventListener('click', function(event) {
    const registerServiceModal = document.getElementById('register-service-modal');
    const editServiceModal = document.getElementById('edit-service-modal');

    if (registerServiceModal && event.target == registerServiceModal) {
        closeRegisterServiceModal();
    }
    if (editServiceModal && event.target == editServiceModal) {
        closeEditServiceModal();
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired.');
    
    // Initialize theme
    initializeTheme();

    // Initialize Lucide icons
    // Initial creation of icons for static elements
    lucide.createIcons();

    // Generate initial data
    chartData = generateData();

    // Initialize tab slider
    const tabSlider = document.querySelector('.tab-slider');
    if (tabSlider) tabSlider.style.transform = 'translateX(0%)'; // Ensure initial position

    // Initial chart draw
    setTimeout(resizeCanvas, 100);

    // Setup log search
    setupLogSearch();

    // Start update intervals
    setInterval(updateChartData, 3000);
    setInterval(updateMetrics, 5000);

    // Event listener for opening the Register Service modal when the plus icon is clicked
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', function(event) {
            // Check if the clicked element or its parent is the expand-icon
            if (event.target.closest('.expand-icon')) {
                // Add a small delay to ensure DOM updates are complete
                setTimeout(openRegisterServiceModal, 50);
            }
        });
    }

    // Event listener for the Register Service form submission
    const registerServiceForm = document.getElementById('register-service-form');
    if (registerServiceForm) {
        registerServiceForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission

            const serviceName = document.getElementById('service-name').value;
            const serviceUrl = document.getElementById('service-url').value;
            const servicePort = document.getElementById('service-port').value;

            // Create an object with the service data
            const serviceData = {
                name: serviceName,
                url: serviceUrl,
                port: servicePort
            };

            console.log('Service data to register:', serviceData);

            // Send this data to the backend endpoint to save to properties file
            try {
                const response = await fetch('/api/register-service', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(serviceData)
                });

                if (response.ok) {
                    console.log('Service registered successfully');
                    closeRegisterServiceModal();
                    // Refresh the service list in the sidebar
                    loadServices();
                } else {
                    console.error('Failed to register service');
                    const errorData = await response.json();
                    console.error('Error details:', errorData);
                    // TODO: Display an error message to the user
                }
            } catch (error) {
                console.error('Error registering service:', error);
                // TODO: Display an error message to the user
            }
        });
    }

    // Event delegation for the Register Service modal close button
    const registerModalContent = document.querySelector('#register-service-modal .modal-content');
    if (registerModalContent) {
        console.log('Register modal content found for close button event delegation.', registerModalContent);
        registerModalContent.addEventListener('click', function(event) {
            const closeButton = event.target.closest('.close-button');
            if (closeButton) {
                console.log('Register modal close button clicked (via event delegation).');
                closeRegisterServiceModal();
            }
        });
    } else {
        console.error('Register modal content #register-service-modal .modal-content not found for close button event delegation.');
    }

    // Event listener for the Edit Service form submission
    const editServiceForm = document.getElementById('edit-service-form');
    if (editServiceForm) {
        editServiceForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission

            const serviceId = document.getElementById('edit-service-id').value;
            const serviceName = document.getElementById('edit-service-name').value;
            const serviceUrl = document.getElementById('edit-service-url').value;
            const servicePort = document.getElementById('edit-service-port').value;

            // Create an object with the updated service data
            const updatedServiceData = {
                id: serviceId, // Include ID in the data sent for update
                name: serviceName,
                url: serviceUrl,
                port: servicePort
            };

            console.log('Service data to update:', updatedServiceData);

            // Send this data to the backend endpoint to update the service
            try {
                const response = await fetch(`/api/services/${serviceId}`, {
                    method: 'PUT', // Or 'PATCH' depending on your backend API
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedServiceData)
                });

                if (response.ok) {
                    console.log('Service updated successfully');
                    closeEditServiceModal();
                    // Refresh the service list in the sidebar
                    loadServices();
                } else {
                    console.error('Failed to update service');
                    const errorData = await response.json();
                    console.error('Error details:', errorData);
                    // TODO: Display an error message to the user
                }
            } catch (error) {
                console.error('Error updating service:', error);
                // TODO: Display an error message to the user
            }
        });
    }

    // Event delegation for the Confirm Delete button within the confirmation modal
    const confirmationModalElement = document.getElementById('confirmation-modal');
    if (confirmationModalElement) {
        console.log('Confirmation modal element found for event delegation.', confirmationModalElement);
        confirmationModalElement.addEventListener('click', async function(event) {
            console.log('Click event on confirmation modal captured.', event.target);
            // Check if the clicked element is the confirm delete button
            const confirmDeleteButton = event.target.closest('#confirm-delete-btn');
            if (confirmDeleteButton) {
                console.log('Clicked element is the confirm delete button.');
                if (serviceIdToDelete) {
                    console.log('Executing deletion for service ID:', serviceIdToDelete);
                    try {
                        console.log('Sending DELETE request to:', `/api/services/${serviceIdToDelete}`);
                        const response = await fetch(`/api/services/${serviceIdToDelete}`, {
                            method: 'DELETE',
                        });

                        console.log('Received response from DELETE request:', response);
                        if (response.ok) {
                            console.log('Service deleted successfully. Response OK.');
                            closeConfirmationModal();
                            // Refresh the service list in the sidebar
                            loadServices();
                        } else {
                            console.error('Failed to delete service. Response not OK.', response.status);
                            const errorData = await response.json();
                            console.error('Error details:', errorData);
                            // TODO: Display an error message to the user
                        }
                    } catch (error) {
                        console.error('Error during fetch or processing delete response:', error);
                        // TODO: Display an error message to the user
                    }
                } else {
                    console.error('No service ID set for deletion.');
                }
            }
        });
    } else {
        console.error('Confirmation modal element #confirmation-modal not found for event delegation.');
    }

    // Initial load of services
    loadServices();
});

// Function to open the Confirmation modal
function openConfirmationModal(serviceId) {
    console.log('Attempting to open confirmation modal for service ID:', serviceId);
    serviceIdToDelete = serviceId; // Store the ID
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        console.log('Confirmation modal element found.', modal);
        modal.style.display = 'flex'; // Use flex to center
    } else {
        console.error('Confirmation modal element #confirmation-modal not found.');
    }
}

// Function to close the Confirmation modal
function closeConfirmationModal() {
    console.log('Attempting to close confirmation modal.');
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        console.log('Confirmation modal element found for closing.');
        modal.style.display = 'none';
    }
}