// MS Education Point - Interactivity

document.addEventListener('DOMContentLoaded', () => {

    // Mobile Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Sticky Navbar & Active Link Switching
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        let current = '';

        // Add scroll shadow to navbar
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Highlight active navigation link based on scroll position
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // Real Form Submission to Firebase
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!window.db) {
                alert("Firebase is not configured! Please see firebase-config.js.");
                return;
            }

            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            btn.disabled = true;

            const inquiryData = {
                studentName: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                course: document.getElementById('course').value,
                message: document.getElementById('message').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'new' // for admin tracking
            };

            try {
                // Save to Firestore collections 'inquiries'
                await window.db.collection('inquiries').add(inquiryData);

                btn.innerHTML = '<i class="fa-solid fa-check"></i> Submitted Successfully';
                btn.classList.replace('btn-primary', 'btn-secondary');
                btn.style.backgroundColor = '#4ade80';
                btn.style.borderColor = '#4ade80';
                btn.style.color = 'white';

                contactForm.reset();

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.replace('btn-secondary', 'btn-primary');
                    btn.style.backgroundColor = '';
                    btn.style.borderColor = '';
                    btn.disabled = false;
                }, 3000);

            } catch (error) {
                console.error("Error adding inquiry: ", error);
                alert("Error submitting inquiry. Please try again.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Fetch Dynamic Fees from Firestore
    if (window.db) {
        window.db.collection('fees').orderBy('order', 'asc').onSnapshot((snapshot) => {
            const tbody = document.getElementById('feeTableBody');
            if (!tbody) return;

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">System initializing fee structure...</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                let rowClass = data.order === 3 ? 'class="highlight-row"' : '';
                tbody.innerHTML += `
                    <tr ${rowClass}>
                        <td>${data.name}</td>
                        <td>₹ ${data.admissionFee}</td>
                        <td>₹ ${data.monthlyFee} / month</td>
                        <td>${data.deadline} of every month</td>
                    </tr>
                `;
            });
        }, (error) => {
            console.error("Error fetching fees:", error);
        });
    }

});
