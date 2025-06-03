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

// Mobile sidebar functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

function selectService(element) {
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function switchTab(element, tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    element.classList.add('active');
}

// Chart functionality
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawChart();
}

// Generate sample data
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

const data = generateData();

function drawChart() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Responsive padding based on screen size
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const padding = isSmallMobile ? 25 : isMobile ? 30 : 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    const gridLines = isMobile ? 3 : 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.setLineDash([1, 1]);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Vertical grid lines
    const verticalLines = isMobile ? 4 : 6;
    for (let i = 0; i <= verticalLines; i++) {
        const x = padding + (chartWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.setLineDash([1, 1]);
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = isSmallMobile ? '8px sans-serif' : isMobile ? '9px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        const value = 60 - (i * (60 / gridLines));
        ctx.fillText(Math.round(value).toString(), padding - 3, y + 2);
    }
    
    // Draw X-axis labels (time) - fewer labels on mobile
    ctx.textAlign = 'center';
    const timeLabels = isMobile ? 2 : 3;
    for (let i = 0; i <= timeLabels; i++) {
        const x = padding + (chartWidth / timeLabels) * i;
        const dataIndex = Math.floor((data.length - 1) * (i / timeLabels));
        const time = data[dataIndex].time;
        const timeStr = time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit'
        });
        ctx.fillText(timeStr, x, height - padding + 12);
    }
    
    // Draw CPU line (blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - (point.cpu / 60) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw Memory line (purple)
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - (point.memory / 60) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

// Initialize chart
window.addEventListener('resize', () => {
    setTimeout(resizeCanvas, 100);
});

// Close sidebar when clicking outside on mobile
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

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        resizeCanvas();
    }, 100);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    
    // Update chart data periodically
    setInterval(() => {
        // Add new data point
        const lastTime = data[data.length - 1].time;
        const newTime = new Date(lastTime.getTime() + 15000);
        data.push({
            time: newTime,
            cpu: 20 + Math.sin(data.length * 0.1) * 10 + Math.random() * 8,
            memory: 35 + Math.cos(data.length * 0.15) * 8 + Math.random() * 6
        });
        
        // Remove old data point
        if (data.length > 40) {
            data.shift();
        }
        
        drawChart();
    }, 3000);
});

// Update metrics periodically
function updateMetrics() {
    const memoryElement = document.querySelector('.metrics-grid .metric-card:nth-child(2) .metric-value');
    const cpuElement = document.querySelector('.metrics-grid .metric-card:nth-child(3) .metric-value');
    const connectionsElement = document.querySelector('.metrics-grid .metric-card:nth-child(4) .metric-value');
    
    // Simulate real-time updates
    const newMemory = (35 + Math.random() * 10).toFixed(1);
    const newCpu = (20 + Math.random() * 15).toFixed(1);
    const newConnections = Math.floor(70 + Math.random() * 20);
    
    if (memoryElement) memoryElement.textContent = `${newMemory}%`;
    if (cpuElement) cpuElement.textContent = `${newCpu}%`;
    if (connectionsElement) connectionsElement.textContent = newConnections;
}

// Update metrics every 5 seconds
setInterval(updateMetrics, 5000);
