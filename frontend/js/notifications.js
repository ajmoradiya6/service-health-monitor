// Notification Management System

// Global variables
const notifications = {
    items: [],
    maxNotifications: 50,
    unreadCount: 0
};

// Track unique log notifications to prevent duplicates
const notificationLogKeys = new Set();

function getNotificationLogKey(logEntry, serviceId) {
    // Use the raw timestamp (not formatted) for deduplication
    const rawTimestamp = logEntry.rawTimestamp || logEntry.timestamp;
    return `${serviceId}|${rawTimestamp}|${logEntry.level}|${logEntry.message}`;
}

// Initialize notifications from localStorage
function initializeNotifications() {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        notifications.items = parsed.items || [];
        notifications.unreadCount = parsed.unreadCount || 0;
        // Rebuild deduplication set from loaded notifications
        notificationLogKeys.clear();
        notifications.items.forEach(n => {
            const logKey = getNotificationLogKey(n, n.serviceId);
            notificationLogKeys.add(logKey);
        });
    }
    updateNotificationBadge();
}

// Save notifications to localStorage
function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify({
        items: notifications.items,
        unreadCount: notifications.unreadCount
    }));
}

// Add a new notification
function addNotification(logEntry, serviceId, serviceName, allowInfo = false) {
    const rawTimestamp = logEntry.rawTimestamp || logEntry.timestamp;
    const logKey = getNotificationLogKey({ ...logEntry, rawTimestamp }, serviceId);
    console.log('Deduplication key:', logKey, 'Entry:', logEntry); // DEBUG
    if (notificationLogKeys.has(logKey)) {
        console.log('Duplicate notification skipped:', logKey);
        return;
    }
    notificationLogKeys.add(logKey);
    
    console.log('Attempting to add notification:', { logEntry, serviceId, serviceName });
    
    // Corrected: Get userSettings > user-settings > notificationSettings
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    const notificationSettings = settings['user-settings']?.notificationSettings || {};
    
    console.log('Notification settings:', notificationSettings);
    
    if (!notificationSettings.inAppEnabled) {
        console.log('In-app notifications are disabled');
        return;
    }

    // Only create notifications for warning and error logs, unless allowInfo is true
    if (!allowInfo && logEntry.level !== 'warning' && logEntry.level !== 'error') {
        console.log('Log level is not warning or error:', logEntry.level);
        return;
    }

    const notification = {
        id: Date.now(),
        type: logEntry.level,
        message: logEntry.message,
        timestamp: rawTimestamp, // store raw timestamp
        serviceId: serviceId,
        serviceName: serviceName,
        read: false,
        logDetails: logEntry
    };

    console.log('Creating new notification:', notification);

    notifications.items.unshift(notification);
    notifications.unreadCount++;

    // Limit total notifications
    if (notifications.items.length > notifications.maxNotifications) {
        notifications.items.pop();
    }

    saveNotifications();
    updateNotificationBadge();
    updateNotificationPanel();
    
    console.log('Current notifications state:', {
        totalNotifications: notifications.items.length,
        unreadCount: notifications.unreadCount
    });
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notification = notifications.items.find(n => n.id === notificationId);
    if (notification && !notification.read) {
        notification.read = true;
        notifications.unreadCount--;
        saveNotifications();
        updateNotificationBadge();
        updateNotificationPanel();
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    notifications.items.forEach(notification => {
        notification.read = true;
    });
    notifications.unreadCount = 0;
    saveNotifications();
    updateNotificationBadge();
    updateNotificationPanel();
}

// Clear all notifications with animation
function clearAllNotifications() {
    const notificationItems = document.querySelectorAll('.notification-item');
    const delay = 50; // 50ms delay between each notification

    // Add slide-out animation to each notification
    notificationItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            item.style.transform = 'translateX(100%)';
            item.style.opacity = '0';
        }, index * delay);
    });

    // Clear notifications after animation completes
    setTimeout(() => {
        notifications.items = [];
        notifications.unreadCount = 0;
        saveNotifications();
        updateNotificationBadge();
        updateNotificationPanel();
    }, notificationItems.length * delay + 300); // Wait for all animations + 300ms extra
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = notifications.unreadCount > 0 ? notifications.unreadCount : '';
        badge.style.display = notifications.unreadCount > 0 ? 'flex' : 'none';
    }
}

// Create notification panel HTML
function createNotificationPanel() {
    const panel = document.createElement('div');
    panel.className = 'notification-panel';
    panel.innerHTML = `
        <div class="notification-header">
            <h3>Notifications</h3>
            <div class="notification-actions">
                <button class="icon-button" title="Mark all as read" onclick="event.stopPropagation(); markAllNotificationsAsRead()">
                    <i data-lucide="square-check-big" class="theme-icon"></i>
                </button>
                <button class="icon-button" title="Clear all" onclick="event.stopPropagation(); clearAllNotifications()">
                    <i data-lucide="trash-2" class="theme-icon"></i>
                </button>
            </div>
        </div>
        <div class="notification-list"></div>
    `;
    
    // Initialize Lucide icons for the panel
    setTimeout(() => {
        lucide.createIcons();
    }, 0);
    
    return panel;
}

// Update notification panel content
function updateNotificationPanel() {
    const notificationList = document.querySelector('.notification-list');
    if (!notificationList) return;

    notificationList.innerHTML = notifications.items.length === 0 
        ? '<div class="no-notifications">No notifications</div>'
        : notifications.items.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 onclick="event.stopPropagation(); markNotificationAsRead(${notification.id})">
                <div class="notification-icon ${notification.type}">
                    <i data-lucide="${notification.type === 'error' ? 'alert-circle' : 'alert-triangle'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="service-name">${notification.serviceName}</span>
                        <span class="notification-time">${formatTimestamp(notification.timestamp)}</span>
                    </div>
                    <div class="notification-message">${notification.message}</div>
                </div>
            </div>
        `).join('');

    // Initialize Lucide icons
    lucide.createIcons();
}

// Toggle notification panel
function toggleNotificationPanel() {
    const panel = document.querySelector('.notification-panel');
    if (!panel) {
        const newPanel = createNotificationPanel();
        document.body.appendChild(newPanel);
        updateNotificationPanel();
        
        // Add click event listener to close panel when clicking outside
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
    } else {
        panel.remove();
        document.removeEventListener('click', handleOutsideClick);
    }
}

// Handle clicks outside the notification panel
function handleOutsideClick(event) {
    const panel = document.querySelector('.notification-panel');
    const notificationIcon = document.querySelector('.notification-action');
    
    if (panel && !panel.contains(event.target) && !notificationIcon.contains(event.target)) {
        panel.remove();
        document.removeEventListener('click', handleOutsideClick);
    }
}

// Initialize notification system
document.addEventListener('DOMContentLoaded', () => {
    initializeNotifications();
    
    // Add click event listener to notification icon
    const notificationIcon = document.querySelector('.notification-action');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleNotificationPanel();
        });
    }
});

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