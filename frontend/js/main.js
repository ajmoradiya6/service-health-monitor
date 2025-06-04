async function loadServices() {
  const response = await fetch('/api/services');
  const services = await response.json();

  const container = document.getElementById('services');
  container.innerHTML = '';  // Clear any existing content

  services.forEach(service => {
    const div = document.createElement('div');
    div.className = 'service';
    div.innerHTML = Object.entries(service)
      .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
      .join('');
    container.appendChild(div);
  });
}

window.onload = loadServices;

// ===== GLOBAL VARIABLES =====
let chartData = [];
let activeService = 0;
let activeTab = 'metrics';
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
let animationFrame;

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
    
    // Create ripple effect
    const themeButton = document.querySelector('.theme-button');
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
            themeIcon.setAttribute('data-lucide', 'moon');
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            themeIcon.setAttribute('data-lucide', 'sun');
            localStorage.setItem('theme', 'dark');
        }
        
        // Recreate icons to update the theme icon and other icons
        lucide.createIcons();

        // Re-attach event listener to the plus icon after re-creation
        const newOpenModalButton = document.querySelector('.sidebar-header .expand-icon');
        if (newOpenModalButton) {
            // Remove old listener if it exists on the previous element instance
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
        themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        themeIcon.setAttribute('data-lucide', 'moon');
    }
}

// ===== SIDEBAR FUNCTIONS =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    
    // Add animation to menu icon
    const menuIcon = document.querySelector('.mobile-menu-btn i');
    addIconAnimation(menuIcon, 'menu-slide');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

function selectService(element, index) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    activeService = index;
    
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

// ===== EVENT LISTENERS =====
window.addEventListener('resize', () => {
    setTimeout(resizeCanvas, 100);
    
    // Update tab slider position
    const tabs = document.querySelectorAll('.tab');
    const tabSlider = document.querySelector('.tab-slider');
    const activeIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active'));
    
    tabSlider.style.transform = `translateX(${activeIndex * 100}%)`;
});

window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target)) {
        closeSidebar();
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initializeTheme();
    
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Generate initial data
    chartData = generateData();
    
    // Initialize tab slider
    const tabSlider = document.querySelector('.tab-slider');
    tabSlider.style.transform = 'translateX(0%)';
    
    // Initial chart draw
    setTimeout(resizeCanvas, 100);

    // Setup log search
    setupLogSearch();
    
    // Start update intervals
    setInterval(updateChartData, 3000);
    setInterval(updateMetrics, 5000);

    // ===== REGISTER SERVICE MODAL FUNCTIONS =====
    const registerServiceModal = document.getElementById('register-service-modal');
    const registerServiceForm = document.getElementById('register-service-form');

    // Function to open the modal
    function openRegisterServiceModal() {
        registerServiceModal.style.display = 'flex';
    }

    // Function to close the modal
    function closeRegisterServiceModal() {
        registerServiceModal.style.display = 'none';
        registerServiceForm.reset(); // Reset form fields
    }

    // Event delegation for opening the modal when the plus icon is clicked
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

    // Event delegation for closing the modal when the close button is clicked
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(event) {
            // Check if the clicked element or its parent is the close-button
            if (event.target.closest('.close-button')) {
                closeRegisterServiceModal();
            }
        });
    }

    // Event listener to close the modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target == registerServiceModal) {
            closeRegisterServiceModal();
        }
    });

    // Event listener for form submission
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

        // TODO: Send this data to the backend endpoint to save to properties file
        // Example fetch call (this endpoint doesn't exist yet):
        /*
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
                // TODO: Refresh the service list in the sidebar
            } else {
                console.error('Failed to register service');
                // TODO: Display an error message to the user
            }
        } catch (error) {
            console.error('Error registering service:', error);
            // TODO: Display an error message to the user
        }
        */

        // For now, just close the modal after logging the data
        closeRegisterServiceModal();
    });
}); // End of DOMContentLoaded

// Sidebar resizing functionality
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('sidebar-resizer');
const mainContent = document.querySelector('.main-content');

let isResizing = false;
let lastDownX = 0;
let initialSidebarWidth = 0;

// Minimum and maximum sidebar widths
const MIN_SIDEBAR_WIDTH = 200; // Adjust as needed
const MAX_SIDEBAR_WIDTH = 400; // Adjust as needed

resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    lastDownX = e.clientX;
    initialSidebarWidth = sidebar.offsetWidth;

    // Add event listeners to document to track mouse movement globally
    document.addEventListener('mousemove', mousemoveHandler);
    document.addEventListener('mouseup', mouseupHandler);
});

function mousemoveHandler(e) {
    if (!isResizing) return;

    const dx = e.clientX - lastDownX;
    let newWidth = initialSidebarWidth + dx;

    // Apply constraints
    newWidth = Math.max(MIN_SIDEBAR_WIDTH, newWidth);
    newWidth = Math.min(MAX_SIDEBAR_WIDTH, newWidth);

    sidebar.style.width = `${newWidth}px`;
    // Optionally adjust main content's left margin if needed, but flexbox should handle it
    // mainContent.style.marginLeft = `${newWidth}px`;

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
}

function mouseupHandler() {
    isResizing = false;
    // Remove event listeners
    document.removeEventListener('mousemove', mousemoveHandler);
    document.removeEventListener('mouseup', mouseupHandler);

    // Restore text selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Trigger canvas resize if it's visible (for chart) - important!
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer && chartContainer.style.display !== 'none') {
        resizeCanvas();
    }
}