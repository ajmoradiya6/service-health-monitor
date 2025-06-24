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
      div.innerHTML = `
          <div class="status-dot"></div>
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

    // Auto-select the first service and attempt connections to all services
    if (services.length > 0) {
        const firstItem = container.querySelector('.service-item');
        if (firstItem) {
            selectService(firstItem, 0, services[0]);
        }

        services.forEach((srv, idx) => {
            if (idx !== 0) {
                connectToSignalR(srv);
            }
        });
    }

  } catch (error) {
    console.error('Network error or exception while loading services:', error);
  }
}

async function initializeApp() {
    console.log('Initializing application...'); // Debug log
    try {
        // Initialize theme first
        initializeTheme();
        
        // Initialize notification settings
        await initializeNotificationSettings();
        
        // Load services
        await loadServices();
        
        // Initialize settings sections
        initializeSettingsSections();
        
        console.log('Application initialization complete'); // Debug log
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Failed to initialize application', 'error');
    }
}

// Set up the window.onload handler
window.onload = initializeApp;

// Remove any existing event listeners to prevent duplicate initialization
window.removeEventListener('load', initializeApp);
document.removeEventListener('DOMContentLoaded', initializeApp);

// ===== GLOBAL VARIABLES =====
let chartData = [];
let activeServiceId = null;
let activeTab = 'metrics';
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
let animationFrame;

// Maintain connections and data per service
const serviceConnections = {};
const serviceLogs = {};
const serviceMetrics = {};
const MAX_LOGS = 200; // limit stored logs per service

// Get modal elements and forms
const registerServiceModal = document.getElementById('register-service-modal');
const registerServiceForm = document.getElementById('register-service-form');
const editServiceModal = document.getElementById('edit-service-modal');
const editServiceForm = document.getElementById('edit-service-form');
const settingsModal = document.getElementById('settings-modal');

// Get SMTP configuration elements
const smtpHost = document.getElementById('smtp-host');
const smtpPort = document.getElementById('smtp-port');
const smtpUsername = document.getElementById('smtp-username');
const smtpPassword = document.getElementById('smtp-password');
const smtpFromEmail = document.getElementById('smtp-from-email');
const smtpFromName = document.getElementById('smtp-from-name');
const smtpSsl = document.getElementById('smtp-ssl');
const testEmailConfig = document.getElementById('test-email-config');

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

// Global variable to store current log filter
let currentLogFilter = 'all';

// Email and SMS settings elements
const notifEmailToggle = document.getElementById('notif-email');
const emailSubsection = document.getElementById('email-settings-subsection');
const emailInput = document.getElementById('email-input');
const addEmailBtn = document.getElementById('add-email-btn');
const emailListContainer = document.getElementById('email-list');
const notifSmsToggle = document.getElementById('notif-sms');
const smsSubsection = document.getElementById('sms-settings-subsection');
const phoneInput = document.getElementById('phone-input');
const addPhoneBtn = document.getElementById('add-phone-btn');
const phoneListContainer = document.getElementById('phone-list');

// Add this after the global variables section
const serviceNames = {}; // Store service names for notifications

// 1. Add a reference to the AI Assist toggle
const notifAIAssistToggle = document.getElementById('notif-ai-assist');

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

// Function to open the Settings modal
function openSettingsModal() {
    if (settingsModal) {
        settingsModal.style.display = 'flex';
        initializeSettingsSections();
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

// Function to close the Settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
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

// Logic to fetch data from hosted service
const outputToConsole = true; // set false to disable console logs

// Add animation function
function animateValue(element, start, end, duration, suffix = '', decimals = 1) {
    const startTime = performance.now();
    
    function updateValue(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2; // Ease in-out quad
        
        const value = start + (end - start) * easeProgress;
        element.textContent = `${value.toFixed(decimals)}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            // Always show the specified number of decimal places for the final value
            element.textContent = `${Number(end).toFixed(decimals)}${suffix}`;
        }
    }
    
    requestAnimationFrame(updateValue);
}

function parseMetricValue(value, isPercentage = false) {
    if (typeof value === 'string') {
        // Remove any non-numeric characters except decimal point
        const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(numericValue) ? 0 : numericValue;
    }
    return value || 0;
}

function parseLogEntry(log) {
    console.log('Parsing log entry:', log);
    
    if (typeof log === 'object' && log !== null) {
        const entry = {
            level: (log.level || 'info').toLowerCase(),
            timestamp: formatTimestamp(log.timestamp || new Date()),
            message: log.message || ''
        };
        console.log('Parsed object log entry:', entry);
        return entry;
    }

    const logStr = String(log);
    console.log('Parsing string log:', logStr);
    
    const match = logStr.match(/^(.*?)\s*\[(\w+)\]\s*(.*)$/);
    if (match) {
        const [, time, code, msg] = match;
        let level = 'info';
        const upper = code.toUpperCase();
        if (upper.startsWith('WRN')) level = 'warning';
        else if (upper.startsWith('ERR')) level = 'error';
        else if (upper.startsWith('INF')) level = 'info';
        
        const entry = { level, timestamp: formatTimestamp(time.trim()), message: msg };
        console.log('Parsed string log entry:', entry);
        return entry;
    }

    const defaultEntry = {
        level: 'info',
        timestamp: formatTimestamp(new Date()),
        message: logStr
    };
    console.log('Parsed default log entry:', defaultEntry);
    return defaultEntry;
}

// Helper to get user-friendly summary from backend
async function getNotificationSummary(logMessage) {
  try {
    const response = await fetch('/api/notification-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logMessage })
    });
    const data = await response.json();
    return data.summary || logMessage; // fallback to original if LLM fails
  } catch (err) {
    console.error('Failed to get user-friendly summary:', err);
    return logMessage; // fallback
  }
}

function connectToSignalR(serviceData) {
    if (serviceConnections[serviceData.id]) {
        return serviceConnections[serviceData.id];
    }
    // Build the SignalR URL from service data
    const baseUrl = serviceData.url.replace('https://', 'http://'); // Convert https to http for local development
    const port = serviceData.port;
    const signalRUrl = `${baseUrl}:${port}/healthhub`;

    let dataTimeout;
    const DATA_TIMEOUT_DURATION = 5000; // 5 seconds timeout
    let reconnectTimeout;
    const RECONNECT_INTERVAL = 5000; // Try to reconnect every 5 seconds
    let isFirstData = true;
    let hasShownInitialStatus = false;
    let isServiceRunning = false;

    // Reset status display when connecting if this service is active
    const statusElement = document.querySelector('.status-running');
    if (activeServiceId === serviceData.id && statusElement) {
        statusElement.style.setProperty('--dot-color', 'var(--yellow-primary)');
        const statusText = statusElement.querySelector('span');
        statusText.textContent = 'Connecting...';
    }

    // Reset service dot in sidebar
    const serviceItem = document.querySelector(`.service-item[data-service*="${serviceData.id}"]`);
    if (serviceItem) {
        const serviceDot = serviceItem.querySelector('.status-dot');
        if (serviceDot) {
            serviceDot.style.setProperty('--dot-color', 'var(--yellow-primary)'); // Yellow color
        }
        serviceItem.classList.add('connected');
    }

    function updateServiceStatus(isRunning) {
        isServiceRunning = isRunning;

        // Update status in the metrics card only for the active service
        const statusElement = document.querySelector('.status-running');
        if (activeServiceId === serviceData.id && statusElement) {
            statusElement.style.setProperty('--dot-color', isRunning ? 'var(--green-primary)' : 'var(--red-primary)');
            const statusText = statusElement.querySelector('span');
            statusText.textContent = isRunning ? 'Running' : 'Stopped';
        }

        // Update the service dot in the sidebar
        const serviceItem = document.querySelector(`.service-item[data-service*="${serviceData.id}"]`);
        if (serviceItem) {
            const serviceDot = serviceItem.querySelector('.status-dot');
            if (serviceDot) {
                const color = isRunning ? 'var(--green-primary)' : 'var(--red-primary)';
                serviceDot.style.setProperty('--dot-color', color);
            }
            serviceItem.classList.add('connected');
        }
    }

    function startConnection() {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(signalRUrl, { 
                withCredentials: true,
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .configureLogging(signalR.LogLevel.Debug)
            .build();

        connection.on("ReceiveHealthUpdate", (data) => {
            clearTimeout(dataTimeout);

            if (isFirstData) {
                hasShownInitialStatus = true;
                updateServiceStatus(true);
                isFirstData = false;
            }

            // Store latest metrics
            serviceMetrics[serviceData.id] = {
                cpuUsage: data.cpuUsage,
                memoryUsage: data.memoryUsage,
                activeConnections: data.activeConnections,
                serviceRunning: true,
                serviceUptime: data.serviceUptime,
                timestamp: data.timestamp
            };

            // Store service name for notifications
            serviceNames[serviceData.id] = serviceData.name;

            if (!serviceLogs[serviceData.id]) serviceLogs[serviceData.id] = [];
            if (Array.isArray(data.applicationLogs)) {
                console.log('Processing application logs:', data.applicationLogs);
                data.applicationLogs.forEach(async (log) => {
                    const entry = parseLogEntry(log);
                    console.log('Processed log entry:', entry);
                    serviceLogs[serviceData.id].push(entry);
                    if (serviceLogs[serviceData.id].length > MAX_LOGS) {
                        serviceLogs[serviceData.id].shift();
                    }
                    // Add notification for warning and error logs with user-friendly summary
                    if (entry.level === 'warning' || entry.level === 'error') {
                        console.log('Found warning/error log, creating notification:', entry);
                        await processLogForNotification(entry, serviceData.id, serviceData.name);
                    }
                });
            }

            if (activeServiceId === serviceData.id) {
                const cpuElement = document.getElementById("cpu-value");
                const memoryElement = document.getElementById("memory-value");
                const connectionsElement = document.getElementById("connections-value");

                const currentCpu = parseMetricValue(cpuElement.textContent, true);
                const currentMemory = parseMetricValue(memoryElement.textContent, true);
                const currentConnections = parseMetricValue(connectionsElement.textContent);

                const newCpu = parseMetricValue(data.cpuUsage, true);
                const newMemory = parseMetricValue(data.memoryUsage, true);
                const newConnections = parseMetricValue(data.activeConnections);

                animateValue(cpuElement, currentCpu, newCpu, 1000, '%', 2);
                animateValue(memoryElement, currentMemory, newMemory, 1000, '%', 2);
                animateValue(connectionsElement, currentConnections, newConnections, 1000, '', 1);

                const logsList = document.getElementById("logs-list");
                if (logsList && Array.isArray(data.applicationLogs)) {
                    const wasAtBottom =
                        Math.abs(logsList.scrollHeight - logsList.clientHeight - logsList.scrollTop) <= 5;
                    data.applicationLogs.forEach((log) => {
                        const entry = parseLogEntry(log);

                        const logDiv = document.createElement('div');
                        logDiv.className = `log-entry ${entry.level}`;
                        logDiv.innerHTML = `
                            <div class="log-level ${entry.level}">${entry.level}</div>
                            <div class="log-timestamp">${entry.timestamp}</div>
                            <div class="log-message">${entry.message}</div>
                        `;
                        logsList.appendChild(logDiv);
                    });
                    if (wasAtBottom) {
                        logsList.scrollTop = logsList.scrollHeight;
                    }
                }

                updateLogStats();
            } else {
                // Update sidebar dot only
                updateServiceStatus(true);
            }

            console.log('applicationLogs:', data.applicationLogs);
        });

        connection
            .start()
            .then(() => {
                console.log("Successfully connected to SignalR hub at:", signalRUrl);
            })
            .catch((err) => {
                console.error("SignalR connection error:", err);
                console.error("Failed to connect to:", signalRUrl);
                hasShownInitialStatus = true;
                updateServiceStatus(false);
                
                // Try to reconnect after a delay
                reconnectTimeout = setTimeout(() => {
                    startConnection();
                }, RECONNECT_INTERVAL);
            });

        // Clean up timeout when connection is closed
        connection.onclose(() => {
            clearTimeout(dataTimeout);
            hasShownInitialStatus = true;
            updateServiceStatus(false);
            if (serviceMetrics[serviceData.id]) {
                serviceMetrics[serviceData.id].serviceRunning = false;
            }
            isFirstData = true; // Reset first data flag when connection closes

            reconnectTimeout = setTimeout(() => {
                startConnection();
            }, RECONNECT_INTERVAL);
        });

        return connection;
    }

    const conn = startConnection();
    serviceConnections[serviceData.id] = conn;
    return conn;
}

// Modify the selectService function to establish SignalR connection
function selectService(element, index, service) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');

    // Get the service data from the data attribute
    const serviceData = JSON.parse(element.dataset.service);
    activeServiceId = serviceData.id;
    console.log('Selected service data:', serviceData);

    // If this service has never been connected, show "Connecting..." feedback
    if (!serviceConnections[serviceData.id]) {
        const statusElement = document.querySelector('.status-running');
        if (statusElement) {
            statusElement.style.setProperty('--dot-color', 'var(--yellow-primary)');
            const statusText = statusElement.querySelector('span');
            statusText.textContent = 'Connecting...';
        }
    }

    // Connect to SignalR for this service if not already connected
    if (!serviceConnections[serviceData.id]) {
        serviceConnections[serviceData.id] = connectToSignalR(serviceData);
    }

    // Render cached metrics and logs
    renderServiceMetrics(serviceData.id);
    populateLogs(serviceData.id);

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
        renderServiceMetrics(activeServiceId);
    } else if (tabName === 'logs') {
        chartContainer.style.display = 'none';
        logsContainer.classList.add('active');
        populateLogs(activeServiceId);
    }
    
    // Add animation to tab icon
    const tabIcon = element.querySelector('i');
    addIconAnimation(tabIcon, 'chart-pulse');
}

// ===== LOGS FUNCTIONS =====
function populateLogs(serviceId) {
    const logsList = document.getElementById('logs-list');
    if (!logsList) return;

    logsList.innerHTML = '';
    const logs = serviceLogs[serviceId] || [];

    logs.forEach((log) => {
        if (currentLogFilter !== 'all' && log.level !== currentLogFilter) {
            return;
        }
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.level}`;
        logEntry.innerHTML = `
            <div class="log-level ${log.level}">${log.level}</div>
            <div class="log-timestamp">${log.timestamp}</div>
            <div class="log-message">${log.message}</div>
        `;
        logsList.appendChild(logEntry);
    });

    logsList.scrollTop = logsList.scrollHeight;

    updateLogStats();
}

function renderServiceMetrics(serviceId) {
    const metrics = serviceMetrics[serviceId];
    if (!metrics) return;

    const cpuElement = document.getElementById('cpu-value');
    const memoryElement = document.getElementById('memory-value');
    const connectionsElement = document.getElementById('connections-value');

    if (cpuElement) cpuElement.textContent = parseMetricValue(metrics.cpuUsage, true).toFixed(2) + '%';
    if (memoryElement) memoryElement.textContent = parseMetricValue(metrics.memoryUsage, true).toFixed(2) + '%';
    if (connectionsElement) connectionsElement.textContent = parseMetricValue(metrics.activeConnections).toFixed(1);

    const statusElement = document.querySelector('.status-running');
    if (statusElement) {
        statusElement.style.setProperty('--dot-color', metrics.serviceRunning ? 'var(--green-primary)' : 'var(--red-primary)');
        const statusText = statusElement.querySelector('span');
        statusText.textContent = metrics.serviceRunning ? 'Running' : 'Stopped';
    }
}

// Function to toggle filter dropdown
function toggleFilter() {
    const filterDropdown = document.querySelector('.filter-dropdown .filter-options');
    if (filterDropdown) {
        filterDropdown.classList.toggle('show');
    }
}

// Function to filter logs by level
function filterLogsByLevel(level) {
    currentLogFilter = level;
    const filterButton = document.querySelector('.filter-button span');

    // Update filter button text
    filterButton.textContent = level.charAt(0).toUpperCase() + level.slice(1);

    // Hide dropdown
    const filterDropdown = document.querySelector('.filter-dropdown .filter-options');
    if (filterDropdown) {
        filterDropdown.classList.remove('show');
    }

    populateLogs(activeServiceId);
}

// Function to update log statistics
function updateLogStats(serviceId = activeServiceId) {
    const logs = serviceLogs[serviceId] || [];
    let info = 0, warning = 0, error = 0;

    logs.forEach(entry => {
        if (entry.level === 'info') info++;
        else if (entry.level === 'warning') warning++;
        else if (entry.level === 'error') error++;
    });

    const total = logs.length;

    const totalStat = document.querySelector('.log-stat.total strong');
    const infoStat = document.querySelector('.log-stat.info strong');
    const warnStat = document.querySelector('.log-stat.warning strong');
    const errorStat = document.querySelector('.log-stat.error strong');

    if (totalStat) totalStat.textContent = total;
    if (infoStat) infoStat.textContent = info;
    if (warnStat) warnStat.textContent = warning;
    if (errorStat) errorStat.textContent = error;
}

// Function to export logs to CSV
function exportLogs() {
    const logs = Array.from(document.querySelectorAll('.log-entry'));
    const visibleLogs = logs.filter(entry => entry.style.display !== 'none');
    
    if (visibleLogs.length === 0) {
        alert('No logs to export!');
        return;
    }
    
    // Create CSV content
    let csvContent = 'Timestamp,Level,Message\n';

    visibleLogs.forEach(entry => {
        const timestamp = entry.querySelector('.log-timestamp').textContent;
        const level = entry.querySelector('.log-level').textContent;
        const message = entry.querySelector('.log-message').textContent;
        const escapedMessage = message.replace(/"/g, '""');
        csvContent += `${timestamp},${level},"${escapedMessage}"\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `service_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== CHART FUNCTIONS =====
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
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
    if (settingsModal && event.target == settingsModal) {
        closeSettingsModal();
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired.');
    
    // Initialize theme
    initializeTheme();

    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize tab slider
    const tabSlider = document.querySelector('.tab-slider');
    if (tabSlider) tabSlider.style.transform = 'translateX(0%)';

    // Setup log search
    setupLogSearch();

    // Event listener for opening the Register Service modal when the plus icon is clicked
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', function(event) {
            if (event.target.closest('.expand-icon')) {
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

    // Event delegation for the Settings modal close button
    const settingsModalContent = document.querySelector('#settings-modal .modal-content');
    if (settingsModalContent) {
        settingsModalContent.addEventListener('click', function(event) {
            const closeButton = event.target.closest('.close-button');
            if (closeButton) {
                closeSettingsModal();
            }
        });
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
            
            // Prevent deletion if clicking the cancel button or the modal background/content directly
            if (event.target.classList.contains('secondary') || event.target.id === 'confirmation-modal' || event.target.classList.contains('modal-content') || event.target.classList.contains('close')) {
                console.log('Click was on cancel button, close button, modal background, or modal content. Aborting delete.');
                // The closeConfirmationModal is already handled by onclick on these elements
                return; 
            }

            // Check if the clicked element is the confirm delete button or an element inside it
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

    // Add filter options to the dropdown
    const filterDropdown = document.querySelector('.filter-dropdown');
    if (filterDropdown) {
        const filterOptions = document.createElement('div');
        filterOptions.className = 'filter-options';
        filterOptions.innerHTML = `
            <div class="filter-option" onclick="filterLogsByLevel('all')">All Levels</div>
            <div class="filter-option" onclick="filterLogsByLevel('info')">Info</div>
            <div class="filter-option" onclick="filterLogsByLevel('warning')">Warning</div>
            <div class="filter-option" onclick="filterLogsByLevel('error')">Error</div>
        `;
        filterDropdown.appendChild(filterOptions);
    }
    
    // Close filter dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const filterDropdown = document.querySelector('.filter-dropdown');
        if (filterDropdown && !filterDropdown.contains(event.target)) {
            const filterOptions = filterDropdown.querySelector('.filter-options');
            if (filterOptions) {
                filterOptions.classList.remove('show');
            }
        }
    });

    // Initialize settings when the page loads
    // initializeNotificationSettings();

    // Initial load of services
    // loadServices();
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

// ===== NEW NOTIFICATION SETTINGS FUNCTIONS =====
// Helper to load settings from backend or localStorage
async function loadSettingsFromBackendOrCache() {
    console.log('Loading settings...'); // Debug log
    try {
        const response = await fetch('/api/user-settings');
        if (!response.ok) throw new Error('Backend fetch failed');
        const data = await response.json();
        console.log('Received data from backend:', data); // Debug log
        // Update localStorage cache for faster reloads
        localStorage.setItem('userSettings', JSON.stringify(data));
        return data;
    } catch (err) {
        console.error('Error loading settings:', err); // Debug log
        // Fallback to localStorage
        const cachedData = JSON.parse(localStorage.getItem('userSettings')) || {};
        console.log('Using cached data:', cachedData); // Debug log
        return cachedData;
    }
}

// Update initializeNotificationSettings to use backend or cache
async function initializeNotificationSettings() {
    console.log('Initializing notification settings...'); // Debug log
    const savedSettings = await loadSettingsFromBackendOrCache();
    console.log('Loaded settings:', savedSettings); // Debug log
    
    // Handle both single and double nested user-settings
    const userSettings = savedSettings['user-settings']?.['user-settings'] || savedSettings['user-settings'] || {};
    console.log('User settings:', userSettings); // Debug log
    
    const notificationSettings = userSettings.notificationSettings || {};
    console.log('Notification settings:', notificationSettings); // Debug log
    
    const emailConfig = userSettings.emailConfig || {};
    console.log('Email config:', emailConfig); // Debug log

    // Apply toggle states
    console.log('Setting toggle states...'); // Debug log
    notifEmailToggle.checked = notificationSettings.emailEnabled || false;
    notifSmsToggle.checked = notificationSettings.smsEnabled || false;
    document.getElementById('notif-inapp').checked = notificationSettings.inAppEnabled || false;
    document.getElementById('notif-down').checked = notificationSettings.serviceDownEnabled || false;
    document.getElementById('notif-error').checked = notificationSettings.serviceErrorEnabled || false;
    document.getElementById('notif-restart').checked = notificationSettings.serviceRestartEnabled || false;
    document.getElementById('notif-start').checked = notificationSettings.serviceStartEnabled || false;
    document.getElementById('notif-high-cpu').checked = notificationSettings.highCpuEnabled || false;
    document.getElementById('notif-high-memory').checked = notificationSettings.highMemoryEnabled || false;
    notifAIAssistToggle.checked = notificationSettings.aiAssistEnabled || false;

    // Load and render emails
    console.log('Loading emails...'); // Debug log
    const savedEmails = notificationSettings.emails || [];
    emailListContainer.innerHTML = '';
    savedEmails.forEach(email => addEmailToList(email, false));

    // Load and render phone numbers
    console.log('Loading phone numbers...'); // Debug log
    const savedPhones = notificationSettings.phones || [];
    phoneListContainer.innerHTML = '';
    savedPhones.forEach(phone => addPhoneToList(phone, false));

    // Set initial visibility of subsections
    console.log('Setting subsection visibility...'); // Debug log
    toggleSubsection(emailSubsection, notifEmailToggle.checked);
    toggleSubsection(smsSubsection, notifSmsToggle.checked);

    // Initialize email configuration fields
    console.log('Initializing email config fields...'); // Debug log
    smtpHost.value = emailConfig.host || '';
    smtpPort.value = emailConfig.port || '';
    smtpUsername.value = emailConfig.username || '';
    smtpPassword.value = emailConfig.password || '';
    smtpFromEmail.value = emailConfig.fromEmail || '';
    smtpFromName.value = emailConfig.fromName || '';
    smtpSsl.checked = emailConfig.useSsl || false;

    // Ensure all lucide icons in the settings modal are created
    if (window.lucide) {
        lucide.createIcons({ parentElement: settingsModal });
    }

    // Add event listeners for toggles
    notifEmailToggle.addEventListener('change', () => toggleSubsection(emailSubsection, notifEmailToggle.checked));
    notifSmsToggle.addEventListener('change', () => toggleSubsection(smsSubsection, notifSmsToggle.checked));

    // Add event listeners for add buttons
    addEmailBtn.addEventListener('click', handleAddEmail);
    addPhoneBtn.addEventListener('click', handleAddPhone);
    
    console.log('Settings initialization complete'); // Debug log
}

function toggleSubsection(subsection, isChecked) {
    if (isChecked) {
        subsection.classList.add('expanded');
    } else {
        subsection.classList.remove('expanded');
    }
}

// Function to show notification
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `${type}-message`;
    notification.textContent = message;
    document.body.appendChild(notification);
    // Trigger reflow
    notification.offsetHeight;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function addEmailToList(email, save = true) {
    if (!email) {
        showNotification('Please enter an email address');
        return;
    }
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address');
        return;
    }

    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.innerHTML = `
        <span>${email}</span>
        <button class="delete-icon"><i data-lucide="trash-2"></i></button>
    `;
    emailListContainer.appendChild(listItem);

    // Create Lucide icon
    lucide.createIcons({ parentElement: listItem });

    // Add delete functionality
    listItem.querySelector('.delete-icon').addEventListener('click', () => {
        listItem.remove();
        removeEmailFromStorage(email);
    });

    if (save) {
        saveEmailToStorage(email);
    }
    emailInput.value = ''; // Clear input
}

function addPhoneToList(phone, save = true) {
    if (!phone) {
        showNotification('Please enter a phone number');
        return;
    }
    if (!isValidPhoneNumber(phone)) {
        showNotification('Please enter a valid phone number (e.g., +1234567890 or 123-456-7890)');
        return;
    }

    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.innerHTML = `
        <span>${phone}</span>
        <button class="delete-icon"><i data-lucide="trash-2"></i></button>
    `;
    phoneListContainer.appendChild(listItem);

    // Create Lucide icon
    lucide.createIcons({ parentElement: listItem });

    // Add delete functionality
    listItem.querySelector('.delete-icon').addEventListener('click', () => {
        listItem.remove();
        removePhoneFromStorage(phone);
    });

    if (save) {
        savePhoneToStorage(phone);
    }
    phoneInput.value = ''; // Clear input
}

function handleAddEmail() {
    addEmailToList(emailInput.value.trim());
}

function handleAddPhone() {
    addPhoneToList(phoneInput.value.trim());
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhoneNumber(phone) {
    // Basic validation for phone numbers, can be enhanced
    return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);
}

function saveEmailToStorage(email) {
    const emails = JSON.parse(localStorage.getItem('notificationEmails')) || [];
    if (!emails.includes(email)) {
        emails.push(email);
        localStorage.setItem('notificationEmails', JSON.stringify(emails));
    }
}

function removeEmailFromStorage(email) {
    let emails = JSON.parse(localStorage.getItem('notificationEmails')) || [];
    emails = emails.filter(e => e !== email);
    localStorage.setItem('notificationEmails', JSON.stringify(emails));
}

function savePhoneToStorage(phone) {
    const phones = JSON.parse(localStorage.getItem('notificationPhones')) || [];
    if (!phones.includes(phone)) {
        phones.push(phone);
        localStorage.setItem('notificationPhones', JSON.stringify(phones));
    }
}

function removePhoneFromStorage(phone) {
    let phones = JSON.parse(localStorage.getItem('notificationPhones')) || [];
    phones = phones.filter(p => p !== phone);
    localStorage.setItem('notificationPhones', JSON.stringify(phones));
}

// Save settings to backend and update localStorage
async function saveAllSettingsToBackend() {
    const settings = {
        'user-settings': {
            notificationSettings: {
                inAppEnabled: document.getElementById('notif-inapp').checked,
                emailEnabled: notifEmailToggle.checked,
                smsEnabled: notifSmsToggle.checked,
                serviceDownEnabled: document.getElementById('notif-down').checked,
                serviceErrorEnabled: document.getElementById('notif-error').checked,
                serviceRestartEnabled: document.getElementById('notif-restart').checked,
                serviceStartEnabled: document.getElementById('notif-start').checked,
                highCpuEnabled: document.getElementById('notif-high-cpu').checked,
                highMemoryEnabled: document.getElementById('notif-high-memory').checked,
                aiAssistEnabled: notifAIAssistToggle.checked,
                emails: Array.from(emailListContainer.querySelectorAll('.list-item span')).map(e => e.textContent),
                phones: Array.from(phoneListContainer.querySelectorAll('.list-item span')).map(e => e.textContent)
            },
            emailConfig: {
                host: smtpHost.value,
                port: smtpPort.value,
                username: smtpUsername.value,
                password: smtpPassword.value,
                fromEmail: smtpFromEmail.value,
                fromName: smtpFromName.value,
                useSsl: smtpSsl.checked
            }
        }
    };

    try {
        const response = await fetch('/api/user-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        // Update localStorage cache after successful save
        localStorage.setItem('userSettings', JSON.stringify(settings));
        // Close the modal after successful save
        closeSettingsModal();
        // Show success message
        showNotification('Settings saved successfully', 'success');
    } catch (err) {
        showNotification('Failed to save settings: ' + err.message, 'error');
    }
}

// Function to initialize settings sections
function initializeSettingsSections() {
    // Hide all sections except the active one
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the active section
    const activeItem = document.querySelector('.settings-item.active');
    if (activeItem) {
        const targetSection = document.getElementById(activeItem.dataset.target);
        if (targetSection) {
            targetSection.style.display = 'flex';
        }
    }
}

// Add click handlers for settings items
document.querySelectorAll('.settings-item').forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all items
        document.querySelectorAll('.settings-item').forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
        // Initialize sections
        initializeSettingsSections();
    });
});

// Add event listener for test email configuration
document.getElementById('test-email-config').addEventListener('click', async () => {
    try {
        const settings = await loadSettingsFromBackendOrCache();
        const emailConfig = settings.emailConfig || {};
        
        const response = await fetch('/api/settings/test-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailConfig)
        });

        if (!response.ok) {
            throw new Error('Failed to test email configuration');
        }

        // Show success message
        showNotification('Test email sent successfully', 'success');

    } catch (error) {
        console.error('Error testing email configuration:', error);
        // Show error message
        showNotification('Failed to test email configuration', 'error');
    }
});

// 5. Update notification creation logic to use AI Assist toggle
async function processLogForNotification(entry, serviceId, serviceName) {
  const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const notificationSettings = settings['user-settings']?.notificationSettings || {};
  let message = entry.message;
  if (notificationSettings.aiAssistEnabled && (entry.level === 'warning' || entry.level === 'error')) {
    message = await getNotificationSummary(entry.message);
    console.log('Deduplication key:', logKey, 'Entry:', logEntry);
    addNotification({ ...entry, message }, serviceId, serviceName);
  } else {
    addNotification(entry, serviceId, serviceName);
  }
}

// ===== UTILITY FUNCTIONS =====
function formatTimestamp(ts) {
    if (!ts) return '';
    let dateObj;
    if (typeof ts === 'string' && ts.match(/^\d{4}-\d{2}-\d{2}T/)) {
        dateObj = new Date(ts);
    } else if (typeof ts === 'number') {
        dateObj = new Date(ts);
    } else {
        dateObj = new Date(ts);
        if (isNaN(dateObj)) return ts;
    }
    return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}


