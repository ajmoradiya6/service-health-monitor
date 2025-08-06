// Modern SPA style navigation
document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // Sidebar selection
    document.querySelectorAll('.sidebar nav ul li a').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    // Section switching
    document.querySelectorAll('.doc-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(this.dataset.section).classList.add('active');
    // Optional: Scroll to top of main content
    document.querySelector('.content').scrollTop = 0;
  });
});
