// Authentication utility functions
async function logout() {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
        try {
            // Call backend logout endpoint to logout from Tomcat
            const response = await fetch(`/api/auth/logout?sessionId=${encodeURIComponent(sessionId)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
            });
            
            if (response.ok) {
                console.log('Logged out successfully from server');
            } else {
                console.error('Server logout failed:', response.status);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Clear local session data regardless of server response
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userInfo');
    
    // Redirect to login page
    window.location.href = '/login';
}
async function isAuthenticated() {
    const sessionId = localStorage.getItem('sessionId');
    const userInfo = localStorage.getItem('userInfo');
    
    if (!sessionId || !userInfo) return false;
    
    try {
        const response = await fetch('/api/auth/isAdmin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        return await response.text() === '1';
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

function getCurrentUser() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

function getSessionId() {
    return localStorage.getItem('sessionId');
}

async function requireAuth() {
    if (!await isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

window.auth = { logout, isAuthenticated, getCurrentUser, getSessionId, requireAuth };
