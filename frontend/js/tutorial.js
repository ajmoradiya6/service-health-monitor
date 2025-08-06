// Sidebar navigation: replace main content on click
const navLinks = document.querySelectorAll('#navList a');
const sections = document.querySelectorAll('.doc-section');

// Show correct section & set active class
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // Remove active from all links
    navLinks.forEach(l => l.classList.remove('active'));
    // Hide all sections
    sections.forEach(s => s.classList.remove('active'));
    // Activate this link & matching section
    this.classList.add('active');
    const sectionId = this.getAttribute('data-section');
    document.getElementById(sectionId).classList.add('active');
  });
});

// Optional: Auto focus on section 1 at load
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('section1').classList.add('active');
});
