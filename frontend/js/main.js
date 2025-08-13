// Chart.js setup for Tomcat Thread & Connection tab
let threadUsageChart = null;
let memoryUsageChart = null;
let requestsErrorsChart = null;
let memoryPoolChart = null;

window.addEventListener('DOMContentLoaded', function () {
    if (window.Chart) {
        // THREAD USAGE CHART
        const threadUsage = document.getElementById('thread-usage-chart');
        if (threadUsage) {
            threadUsageChart = new Chart(threadUsage.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Max Threads', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 },
                        { label: 'Busy Threads', data: [],  borderColor: '#22d3ee', backgroundColor: 'rgba(34, 211, 238, 0.2)', fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#64748b' } } },
                    scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } }
                }
            });
        }

        // REQUESTS/ERRORS BAR CHART
        const requestsErrors = document.getElementById('requests-errors-chart');
        if (requestsErrors) {
            requestsErrorsChart = new Chart(requestsErrors.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Requests', data: [], backgroundColor: '#f59e0b'},
                        { label: 'Errors', data: [], backgroundColor: '#a21caf'}
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#64748b' } } },
                    scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } }
                }
            });
        }

        // MEMORY USAGE CHART
        const memoryUsage = document.getElementById('memory-usage-chart');
        if (memoryUsage) {
            memoryUsageChart = new Chart(memoryUsage.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Max-Heap Memory', data: [], borderColor: '#0fc5b5', backgroundColor: 'rgba(15, 197, 181, 0.2)', fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 },
                        { label: 'Used-Heap Memory', data: [], borderColor: '#ff6b6b', backgroundColor: 'rgba(255, 107, 107, 0.2)',   fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4}
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#64748b' } } },
                    scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } }
                }
            });
        }

        // MEMORY POOL PIE CHART (non-time series)
        const memoryPool = document.getElementById('memory-pool-chart');
        if (memoryPool) {
            memoryPoolChart = new Chart(memoryPool.getContext('2d'),  {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Max-Non Heap Memory', data: [], borderColor: '#f97316',  backgroundColor: 'rgba(249, 115, 22, 0.2)', fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 },
                        { label: 'Used-Non Heap Memory', data: [], borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#64748b' } } },
                    scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } }
                }
            });
        }
    }
});

function updateLiveChart(chart, label, datasetValues) {
    if (!chart) return;

    chart.data.labels.push(label);
    datasetValues.forEach((value, i) => {
        chart.data.datasets[i].data.push(value);
        if (chart.data.datasets[i].data.length > 10) {
            chart.data.datasets[i].data.shift();
        }
    });

    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
    }

    chart.update();
}

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

    const data = await response.json();
    const windowsServices = data.windowsServices || [];
    const tomcatService = data.tomcatService || null;
    const container = document.getElementById('service-list');
    
    if (!container) {
        console.error('Service list container not found in the DOM.');
        return; 
    }

    container.innerHTML = '';

    // Render windows services
    windowsServices.forEach((service, index) => {
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
      
      // Construct the inner HTML with status dot and service name
      div.innerHTML = `
          <div class="status-dot"></div>
          <span class="service-name" title="${service.DisplayName}">${service.DisplayName}</span>

      `;
      //<div class="service-actions" data-service-type="windows" data-service-id="${service.id}"><i data-lucide="more-vertical"></i></div>
      // Store service data on the element
      div.dataset.service = JSON.stringify(service);

      container.appendChild(div);


    });

    // Render tomcat services dynamically
    const tomcatContainer = document.getElementById('tomcat-service-list');
    if (tomcatContainer && Array.isArray(tomcatService)) {
        tomcatContainer.innerHTML = '';
        
        tomcatService.forEach((service, index) => {
            const div = document.createElement('div');
            div.className = 'service-item';
            div.onclick = (event) => {
                // Prevent the ellipsis click from triggering service selection
                if (event.target.closest('.service-actions')) {
                    return;
                }
                selectService(div, windowsServices.length + index, service);
            };
            
            // Construct the inner HTML with status dot and service name
            div.innerHTML = `
                <div class="status-dot"></div>
                <span class="service-name" title="${service.DisplayName}">${service.DisplayName}</span>

            `;
            //<div class="service-actions" data-service-type="tomcat" data-service-id="${service.id}"><i data-lucide="more-vertical"></i></div>
            // Store service data on the element
            div.dataset.service = JSON.stringify(service);

            tomcatContainer.appendChild(div);



            // Status checks removed
        });
    }

    // After adding all service items, create Lucide icons within the container
    lucide.createIcons({
        parentElement: container // Only create icons within the service list container
    });



    // Auto-select the first service (tomcat or windows)
    if (Array.isArray(tomcatService) && tomcatService.length > 0) {
        const tomcatContainer = document.getElementById('tomcat-service-list');
        const firstTomcatItem = tomcatContainer.querySelector('.service-item');
        if (firstTomcatItem) {
            selectService(firstTomcatItem, 0, tomcatService[0]);
        }

    } else if (windowsServices.length > 0) {
        const firstItem = container.querySelector('.service-item');
        if (firstItem) {
            selectService(firstItem, 0, windowsServices[0]);
        }

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

// ===== GLOBAL VARIABLES =====
let chartData = [];
let activeServiceId = null;
let activeTab = 'metrics';
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
let animationFrame;

// Maintain data per service
const serviceLogs = {};
const serviceMetrics = {};
const MAX_LOGS = 200; // limit stored logs per service

// Get modal elements and forms
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

// Track previous running status for each service
const servicePrevStatus = {};

let resourceChart = null;
let chartDataBuffer = [];

// Global chart data storage for all services
window.serviceChartData = {};

// Global per-service chart data buffers
window.chartDataBuffers = {};

// Add debug log and check for canvas existence in initializeResourceChart
function initializeResourceChart(serviceId) {
    // Use per-service buffer
    if (!window.chartDataBuffers[serviceId]) {
        window.chartDataBuffers[serviceId] = (window.serviceChartData[serviceId] || []).slice();
    }
    chartDataBuffer = window.chartDataBuffers[serviceId];
    const data = chartDataBuffer;
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.resourceChart) {
        window.resourceChart.destroy();
    }
    // Calculate dynamic Y-axis max
    const allValues = [
        ...data.map(d => d.cpu),
        ...data.map(d => d.memory)
    ];
    const maxVal = Math.max(...allValues, 0);
    let yMax = 10;
    if (maxVal > 10) {
        yMax = Math.ceil(maxVal / 5) * 5 + 5;
    }
    window.resourceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.timestamp);
                return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }),
            datasets: [
                {
                    label: 'CPU',
                    data: data.map(d => d.cpu),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0, // Hide dots by default
                    pointHoverRadius: 4, // Show dots on hover
                    pointBackgroundColor: 'rgba(59, 130, 246, 0.7)',
                    pointBorderColor: 'rgba(59, 130, 246, 0.7)',
                },
                {
                    label: 'Memory',
                    data: data.map(d => d.memory),
                    borderColor: 'rgba(139, 92, 246, 1)',
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0, // Hide dots by default
                    pointHoverRadius: 4, // Show dots on hover
                    pointBackgroundColor: 'rgba(139, 92, 246, 0.7)',
                    pointBorderColor: 'rgba(139, 92, 246, 0.7)',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutCubic'
            },
            elements: {
                line: {
                    borderWidth: 1,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                }
            },
            scales: {
                y: {
                    min: 0,
                    // Remove or comment out the hardcoded max: yMax
                    // max: yMax,
                    suggestedMax: 10, // Let Chart.js autoscale, but suggest 10 as a starting point
                    title: { display: true, text: 'Usage (%)', color: '#64748b', font: { weight: 'bold', size: 13 } },
                    ticks: { stepSize: 5, color: '#64748b', callback: value => value + '%', font: { size: 12 } },
                    grid: {
                        color: 'rgba(100,116,139,0.13)',
                        lineWidth: 1.1,
                        drawBorder: false,
                        borderDash: [2, 2],
                    }
                },
                x: {
                    title: { display: false },
                    ticks: {
                        color: '#64748b',
                        autoSkip: true,
                        maxTicksLimit: 8,
                        font: { size: 12 },
                        callback: function(value, index, ticks) {
                            return this.getLabelForValue(value);
                        }
                    },
                    grid: {
                        color: 'rgba(100,116,139,0.2)', // Same visibility as y
                        lineWidth: 1,
                        drawBorder: false,
                        drawTicks: false,
                        drawOnChartArea: true,
                        borderDash: [2, 2],
                        borderDashOffset: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        color: '#64748b',
                        font: { size: 13, weight: 'bold' },
                        boxWidth: 18,
                        boxHeight: 2,
                        usePointStyle: true,
                        padding: 18
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index', // Show all datasets at the hovered X value
                    intersect: false, // Show tooltip even if not directly over a point
                    backgroundColor: 'rgba(30,41,59,0.97)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#64748b',
                    borderWidth: 1,
                    padding: 10,
                    caretSize: 6,
                    cornerRadius: 6,
                    displayColors: false,
                    titleFont: { weight: 'bold', size: 13 },
                    bodyFont: { size: 13 }
                }
            }
        }
    });
}
// Ensure chart is initialized after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initializeResourceChart();
});

function updateResourceChart(cpu, memory, timestamp) {
    // Always update the buffer for the current service
    if (!window.chartDataBuffers[activeServiceId]) {
        window.chartDataBuffers[activeServiceId] = [];
    }
    chartDataBuffer = window.chartDataBuffers[activeServiceId];
    chartDataBuffer.push({ cpu, memory, timestamp });
    if (chartDataBuffer.length > 60) chartDataBuffer.shift();
    if (!window.resourceChart) return;
    window.resourceChart.data.labels = chartDataBuffer.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    window.resourceChart.data.datasets[0].data = chartDataBuffer.map(d => d.cpu);
    window.resourceChart.data.datasets[1].data = chartDataBuffer.map(d => d.memory);
    window.resourceChart.update(); // Enable animation
}

function updateResourceChartForService(serviceId) {
    const data = window.serviceChartData[serviceId] || [];
    if (!window.resourceChart) return;
    window.resourceChart.data.labels = data.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    window.resourceChart.data.datasets[0].data = data.map(d => d.cpu);
    window.resourceChart.data.datasets[1].data = data.map(d => d.memory);

    // Dynamic Y-axis scaling
    const allValues = [
        ...data.map(d => d.cpu),
        ...data.map(d => d.memory)
    ];
    const maxVal = Math.max(...allValues, 0);
    let yMax = 10;
    if (maxVal > 10) {
        yMax = Math.ceil(maxVal / 5) * 5 + 5;
    }
    window.resourceChart.options.scales.y.max = yMax;

    window.resourceChart.update();
}

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
async function getNotificationSummary(logEntry) {
  try {
    const response = await fetch('/api/notification-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logMessage: logEntry })
    });
    const data = await response.json();
    return data.summary || (typeof logEntry === 'string' ? logEntry : logEntry.message); // fallback to original if LLM fails
  } catch (err) {
    console.error('Failed to get user-friendly summary:', err);
    return typeof logEntry === 'string' ? logEntry : logEntry.message; // fallback
  }
}



// Service selection function
function selectService(element, index, service) {
    // Remove active from all service items
    document.querySelectorAll('.service-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    // Get the service data from the data attribute
    const serviceData = JSON.parse(element.dataset.service);
    activeServiceId = serviceData.id;
    console.log('Selected service data:', serviceData);

    // Determine if this is a Tomcat service based on the service name
    const isTomcatService = serviceData.Name && serviceData.Name.toLowerCase().includes('tomcat');
    
    if (isTomcatService) {
        // Show Tomcat panel for Tomcat services
        showTomcatPanel();
        activeServiceType = 'tomcat';
    } else {
        // Show Windows panel for Windows services
        showWindowsPanel();
        activeServiceType = 'windows';
    }

    // Render metrics for selected service
    renderServiceMetrics(serviceData.id);



    

    // Render cached logs
    populateLogs(serviceData.id);

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        closeSidebar();
    }

    // Immediately update chart with past data for the selected service
    initializeResourceChart(activeServiceId);

    // Dispatch event for power button update
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
    (tabIcon, 'chartaddIconAnimation-pulse');
}

// ===== LOGS FUNCTIONS =====
function populateLogs(serviceId) {
    const logsList = document.getElementById('logs-list');
    if (!logsList) return;

    logsList.innerHTML = '';
    const logs = serviceLogs[serviceId] || [];

    logs.forEach((log, i) => {
        if (currentLogFilter !== 'all' && log.level !== currentLogFilter) {
            return;
        }
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.level}`;
        logEntry.style.animationDelay = `${0.05 + i * 0.01}s`;
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

    document.querySelectorAll('.tomcat-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            document.querySelectorAll('.tomcat-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Hide all content sections
            document.querySelectorAll('[class^="tomcat-content-"]').forEach(div => {
                div.style.display = 'none';
            });

            // Show the one linked to the clicked item
            const target = item.getAttribute('data-target');
            const section = document.querySelector(`.${target}`);
            if (section) section.style.display = 'block';

            const titleText = item.textContent.trim();
            const header = document.querySelector('.tomcat-header h1');
            if (header) header.textContent = titleText;
        });
    });

    // --- Server Settings Tab Switching Logic ---
    const settingsTabs = document.querySelectorAll('.tomcat-content-server-settings .tomcat-settings-tabs .tab');
    const tabContents = [
      document.querySelector('.tomcat-content-server-settings .metric-card'),
      document.getElementById('jvm-memory-settings'),
      document.getElementById('session-settings'),
      document.getElementById('logging-settings'),
      document.getElementById('security-settings')
    ];
    function showSettingsTab(idx) {
      settingsTabs.forEach((t, i) => {
        if (i === idx) t.classList.add('active');
        else t.classList.remove('active');
      });
      tabContents.forEach((content, cidx) => {
        if (content) {
          if (cidx === idx) {
            content.style.display = 'block';
            content.style.flexDirection = '';
          } else {
            content.style.display = 'none';
          }
        }
      });
    }
    settingsTabs.forEach((tab, idx) => {
      tab.addEventListener('click', function() {
        showSettingsTab(idx);
      });
      tab.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showSettingsTab(idx);
        }
      });
    });
    // Show only the first tab content by default
    showSettingsTab(0);

    const tabs = document.querySelectorAll(".tomcat-content-log-viewer .tomcat-settings-tabs .tab");
    const containers = {
        "API Access": document.getElementById("api-access-logs-container"),
        "Std Error": document.getElementById("std-error-logs-container")
    };

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            // Remove "active" class from all tabs
            tabs.forEach(t => t.classList.remove("active"));

            // Hide all containers
            Object.values(containers).forEach(c => c.style.display = "none");

            // Add "active" class to clicked tab
            this.classList.add("active");

            // Show the corresponding log container
            const tabLabel = this.textContent.trim();
            if (containers[tabLabel]) {
                containers[tabLabel].style.display = "block";
            }
        });
    });

    // Trigger default active tab content to show
    document.querySelector(".tomcat-settings-tabs .tab.active")?.click();

    // Initialize the app
    initializeApp();
});


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
  // Skip if any required field is missing or empty/whitespace
  if (!serviceName || !entry.timestamp || !entry.level || !entry.message || String(entry.message).trim() === '') {
    console.warn('Skipping notification: missing or empty required field', { serviceName, timestamp: entry.timestamp, type: entry.level, message: entry.message });
    return;
  }
  const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const notificationSettings = settings['user-settings']?.notificationSettings || {};
  let message = entry.message;
  // Always include 'type' in the object for AI summary and backend
  const logForSummary = { ...entry, serviceName, type: entry.level };
  if (notificationSettings.aiAssistEnabled && (entry.level === 'warning' || entry.level === 'error')) {
    let aiSummary = await getNotificationSummary(logForSummary);
    // If AI summary is empty or fallback, use the original message
    if (!aiSummary || aiSummary.trim() === '' || aiSummary.trim() === 'An error occurred, but we are unable to provide more details at this time.') {
      message = entry.message;
    } else {
      message = aiSummary;
    }
    addNotification({ ...entry, message }, serviceId, serviceName);
  } else {
    addNotification(entry, serviceId, serviceName);
  }

  // Send to backend for email/SMS, always include 'type'
  sendNotificationToBackend({
    serviceName: serviceName,
    timestamp: entry.timestamp,
    type: entry.level,
    message: message
  });
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

// Helper to send notification to backend with correct structure
function sendNotificationToBackend({ serviceName, timestamp, type, message }) {
  if (!serviceName || !timestamp || !type || !message) {
    console.warn('Notification not sent: missing required fields', { serviceName, timestamp, type, message });
    return;
  }
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName, timestamp, type, message })
  });
}



function showTomcatPanel() {
    document.getElementById('tomcat-metrics-panel').style.display = 'block';
    document.getElementById('windows-metrics-panel').style.display = 'none';
}

function showWindowsPanel() {
    document.getElementById('tomcat-metrics-panel').style.display = 'none';
    document.getElementById('windows-metrics-panel').style.display = 'block';
}



// Persistent buffers for each log type
const apiAccessLogBuffer = [];
const stdErrorLogBuffer = [];

// Helper to maintain a fixed size buffer
function pushToBuffer(buffer, lines, maxSize = 200) {
    for (const line of lines) {
        if (!buffer.includes(line)) { // Prevent duplicates
            buffer.push(line);
        }
    }
    // Keep only last 'maxSize' lines
    while (buffer.length > maxSize) buffer.shift();
}


async function pollTomcatStatus() {


    //const nowLabel = new Date().toLocaleTimeString().slice(0, 8);
    const nowLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });


    const tomcatSidebarItem = document.getElementById('tomcat-service-list');
    if (!tomcatSidebarItem) return;
    const tomcatData = JSON.parse(tomcatSidebarItem.dataset.service);
    if (!tomcatData || !tomcatData.id) return;

    try {
        const resp = await fetch('/api/service-control/tomcat/metrics');
        if (!resp.ok) return;
        const metrics = await resp.json();
        updateTomcatMetricsUI(metrics);

        updateLiveChart(threadUsageChart, nowLabel, [
            metrics.threads?.max ?? null,
            metrics.threads?.busy ?? null
        ]);

        updateLiveChart(memoryUsageChart, nowLabel, [
            metrics.memory?.heap?.maxMB ?? null,
            metrics.memory?.heap?.usedMB ?? null
        ]);

        updateLiveChart(requestsErrorsChart, nowLabel, [
            metrics.requests?.count ?? null,
            metrics.requests?.errors ?? null
        ]);

        updateLiveChart(memoryPoolChart, nowLabel, [
            metrics.memory?.nonHeap?.maxMB ?? null,
            metrics.memory?.nonHeap?.usedMB ?? null
        ]);



    } catch (err) {
        console.error('Error fetching Tomcat metrics:', err);
    }

    document.querySelectorAll('.tomcat-updated-time').forEach(el => {
        el.textContent = nowLabel;
    });

    // Add logic to fetch logs
    try {
        const logsResp = await fetch(`/api/service-control/tomcat/logs`);
        if (!logsResp.ok) throw new Error('Failed to fetch Tomcat logs');
        const logsData = await logsResp.json();

        const apiAccessLogsEl = document.getElementById('api-access-logs');
        const stdErrorLogsEl = document.getElementById('std-error-logs');

        // Process new logs and add to buffer
        const accessLines = logsData.logs?.localhostAccess
            ? Object.values(logsData.logs.localhostAccess).map(logObj => logObj.line)
            : [];
        const stdErrLines = logsData.logs?.stdError
            ? Object.values(logsData.logs.stdError).map(logObj => logObj.line)
            : [];

        pushToBuffer(apiAccessLogBuffer, accessLines, 200);
        pushToBuffer(stdErrorLogBuffer, stdErrLines, 200);

        // Render current buffers
        if (apiAccessLogsEl) {
            apiAccessLogsEl.innerHTML = '';
            apiAccessLogBuffer.forEach(line => {
                const div = document.createElement('div');
                div.className = 'log-line';
                div.textContent = line;
                apiAccessLogsEl.appendChild(div);
            });
        }
        if (stdErrorLogsEl) {
            stdErrorLogsEl.innerHTML = '';
            stdErrorLogBuffer.forEach(line => {
                const div = document.createElement('div');
                div.className = 'log-line';
                div.textContent = line;
                stdErrorLogsEl.appendChild(div);
            });
        }

    } catch (err) {
        console.error('Error fetching Tomcat logs:', err);
        // Show error but keep current logs in view
    }

}

function updateTomcatMetricsUI(metrics) {

    // Server status, uptime, JVM version, Tomcat version, start time, OS
    const uptimeEl = document.querySelectorAll('.tomcat-uptime-card');
    uptimeEl.forEach(el => {
        el.textContent = metrics.server?.uptime || '--';
    });

    const jvmVerEls = document.querySelectorAll('.tomcat-jvm-version-card');
    jvmVerEls.forEach(el => {
        el.textContent = metrics.server?.jvmVersion || '--';
    });

    const tomcatVerEls = document.querySelectorAll('.tomcat-version-card');
    tomcatVerEls.forEach(el => {
        el.textContent = metrics.server?.tomcatVersion || '--';
    });

    const startTimeEl = document.querySelectorAll('.tomcat-start-time-card');
    startTimeEl.forEach(el => {
        el.textContent = metrics.server?.startTime || '--';
    });

    const osEls = document.querySelectorAll('.tomcat-os-card');
    osEls.forEach(el => {
        el.textContent = metrics.server?.os || '--';
    });

    // Thread metrics
    document.querySelectorAll('.tomcat-max-threads').forEach(el => {
        el.textContent = metrics.threads?.max ?? '--';
    });

    document.querySelectorAll('.tomcat-current-threads').forEach(el => {
        el.textContent = `Current: ${metrics.threads?.current ?? '--'}`;
    });

    // Busy threads
    document.querySelectorAll('.tomcat-busy-threads').forEach(el => {
        el.textContent = metrics.threads?.busy ?? '--';
    });

    // Utilization with % text
    document.querySelectorAll('.tomcat-threads-utilization').forEach(el => {
        el.textContent = `${metrics.threads?.utilization ?? '--'}% utilization`;
    });

    // Request count
    document.querySelectorAll('.tomcat-request-count').forEach(el => {
        el.textContent = metrics.requests?.count ?? '--';
    });

    // Errors with label
    document.querySelectorAll('.tomcat-errors').forEach(el => {
        el.textContent = `Errors: ${metrics.requests?.errors ?? '--'}`;
    });

    // Avg processing time with "ms"
    document.querySelectorAll('.tomcat-avg-processing-time').forEach(el => {
        el.textContent = `${metrics.requests?.avgProcessingTime ?? '--'}ms`;
    });

    // Timeout with label and "ms"
    document.querySelectorAll('.tomcat-request-timeout').forEach(el => {
        el.textContent = `Timeout: ${metrics.requests?.timeout ?? '--'}ms`;
    });

    // Memory metrics
    document.querySelectorAll('.tomcat-heap-used').forEach(el => {
        el.textContent = `${metrics.memory?.heap?.usedMB ?? '--'} MB`;
    });

    document.querySelectorAll('.tomcat-heap-max').forEach(el => {
        el.textContent = `Max: ${metrics.memory?.heap?.maxMB ?? '--'} MB`;
    });

    document.querySelectorAll('.tomcat-heap-percent').forEach(el => {
        el.textContent = `(${metrics.memory?.heap?.usagePercent ?? '--'}%)`;
    });

    document.querySelectorAll('.tomcat-nonheap-used').forEach(el => {
        el.textContent = `${metrics.memory?.nonHeap?.usedMB ?? '--'} MB`;
    });

    document.querySelectorAll('.tomcat-nonheap-max').forEach(el => {
        el.textContent = `Max: ${metrics.memory?.nonHeap?.maxMB ?? '--'} MB`;
    });

    document.querySelectorAll('.tomcat-nonheap-percent').forEach(el => {
        el.textContent = `(${metrics.memory?.nonHeap?.usagePercent ?? '--'}%)`;
    });

    const gcCountEl = document.getElementById('tomcat-gc-count');
    if (gcCountEl) gcCountEl.textContent = metrics.memory?.gc?.count ?? '--';

    const gcTimeEl = document.getElementById('tomcat-gc-time');
    if (gcTimeEl) gcTimeEl.textContent = metrics.memory?.gc?.time ?? '--';

    // Applications table
    const tbody = document.getElementById('tomcat-applications-tbody');
    if (tbody && Array.isArray(metrics.applications)) {
        tbody.innerHTML = '';
        metrics.applications.forEach(app => {
            tbody.innerHTML += `
                <tr>
                    <td>${app.name || ''}</td>
                    <td>${app.contextPath || ''}</td>
                    <td><span class="status-pill ${app.status === 'Running' ? 'running' : 'stopped'}">${app.status || '--'}</span></td>
                    <td>${app.sessions ?? ''}</td>
                </tr>
            `;
        });
    }
}

// Start polling Tomcat status every 5 seconds after DOM is ready
window.addEventListener('DOMContentLoaded', function() {
    setInterval(pollTomcatStatus, 5000);
});

// Open tutorial page in a new tab when the tutorial button is clicked
window.addEventListener('DOMContentLoaded', () => {
    const tutorialBtn = document.getElementById('tutorial-btn');
    if (tutorialBtn) {
        tutorialBtn.addEventListener('click', () => {
            window.open('tutorial.html', '_blank');
        });
    }
});