document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');

    if (form) {
        if (window.lucide) {
            lucide.createIcons({ parentElement: form });
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) {
                loginScreen.style.display = 'none';
            }
            if (appContainer) {
                appContainer.style.display = 'flex';
            }
        });
    }
});

