document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');

    if (form) {
        if (window.lucide) {
            lucide.createIcons({ parentElement: form });
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = '/home';
        });
    }
});

