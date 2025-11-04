// Typewriter Animation
const typewriterElement = document.getElementById('typewriter');
let typewriterTimeout;

function startTypewriter() {
    const text = 'Kaizen Dental Academy';
    typewriterElement.textContent = '';
    let index = 0;
    
    // Clear any existing timeout
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
    }
    
    function type() {
        if (index < text.length) {
            typewriterElement.textContent += text.charAt(index);
            index++;
            typewriterTimeout = setTimeout(type, 100);
        }
    }
    
    type();
}

// Start typewriter on load
window.addEventListener('load', () => {
    setTimeout(startTypewriter, 500);
});

// Navbar Scroll Effect - Smooth transition with debouncing
const navbar = document.getElementById('navbar');
let navbarTicking = false;
let lastScrollY = 0;

function updateNavbarScroll() {
    if (!navbar) return;
    
    const currentScrollY = window.scrollY;
    
    // Only update if scroll direction changed or threshold crossed
    if (currentScrollY > 50 && lastScrollY <= 50) {
        navbar.classList.add('scrolled');
    } else if (currentScrollY <= 50 && lastScrollY > 50) {
        navbar.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
    navbarTicking = false;
}

if (navbar) {
    // Initialize
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
        lastScrollY = window.scrollY;
    }
    
    window.addEventListener('scroll', () => {
        if (!navbarTicking) {
            window.requestAnimationFrame(updateNavbarScroll);
            navbarTicking = true;
        }
    }, { passive: true });
}

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelector('.nav-links');

mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

// Animated Background Particles - Reduced for performance
const particlesContainer = document.getElementById('particles');
if (particlesContainer && window.innerWidth > 768) {
    const particleCount = 15; // Reduced from 30
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particlesContainer.appendChild(particle);
    }
}

// Scroll Animation Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Observe faculty cards
document.querySelectorAll('.faculty-card').forEach((card, index) => {
    card.classList.add('animate-on-scroll');
    card.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(card);
});

// Observe vision/mission cards
document.querySelectorAll('.vm-card').forEach((card, index) => {
    card.classList.add('animate-on-scroll');
    card.style.transitionDelay = `${index * 0.2}s`;
    observer.observe(card);
});

// Observe feature items
document.querySelectorAll('.feature-item').forEach((item, index) => {
    item.classList.add('animate-on-scroll');
    item.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(item);
});

// Observe course cards
document.querySelectorAll('.course-card').forEach((card, index) => {
    card.classList.add('animate-on-scroll');
    card.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(card);
});

// Faculty Card Hover Effects
document.querySelectorAll('.faculty-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// Course Card Parallax Effect
document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const moveX = (x - centerX) / 20;
        const moveY = (y - centerY) / 20;
        
        const image = card.querySelector('.course-image-placeholder');
        if (image) {
            image.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1) rotate(5deg)`;
        }
    });
    
    card.addEventListener('mouseleave', () => {
        const image = card.querySelector('.course-image-placeholder');
        if (image) {
            image.style.transform = '';
        }
    });
});

// Form Submission Handler
const contactForm = document.getElementById('contactForm');
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1xGtQAsO1jSL3Vv1P2M49DUxDXF1V1x-4wySHi5NU1ZXCG9VepWTW9r7QrjWXddrE/exec';

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Sending...</span>';
    
    try {
        // Get form data
        const formData = new FormData();
        formData.append('firstName', document.getElementById('firstName').value);
        formData.append('lastName', document.getElementById('lastName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('country', document.getElementById('country').value);
        formData.append('interest', document.getElementById('interest').value);
        formData.append('message', document.getElementById('message').value);
        
        // Get selected option text for country and interest
        const countrySelect = document.getElementById('country');
        const countryText = countrySelect.options[countrySelect.selectedIndex].text;
        formData.append('countryText', countryText);
        
        const interestSelect = document.getElementById('interest');
        const interestText = interestSelect.options[interestSelect.selectedIndex].text;
        formData.append('interestText', interestText);
        
        // Send data to Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Required for Google Apps Script web apps
        });
        
        // Since we're using no-cors, we can't read the response
        // But the data should still be sent successfully
        
        // Show success message
        showFormMessage(
            'Thank you for your interest! We will contact you soon.',
            'success'
        );
        
        // Reset form
        contactForm.reset();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        showFormMessage(
            'There was an error submitting your form. Please try again or contact us directly.',
            'error'
        );
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Function to show form messages
function showFormMessage(message, type) {
    // Remove existing message if any
    const existingMessage = contactForm.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Get submit button
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message form-message-${type}`;
    
    // Create icon based on type
    const icon = type === 'success' 
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    messageDiv.innerHTML = `
        <div class="form-message-icon">${icon}</div>
        <div class="form-message-text">${message}</div>
    `;
    
    // Insert message right after the submit button
    submitBtn.parentNode.insertBefore(messageDiv, submitBtn.nextSibling);
    
    // Smooth scroll to message if needed
    setTimeout(() => {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 5000);
}

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = navbar.offsetHeight;
            const targetPosition = target.offsetTop - navHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Cursor Trail Effect (Luxury Touch)
const cursorTrail = [];
const trailLength = 5;

document.addEventListener('mousemove', (e) => {
    cursorTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
    
    if (cursorTrail.length > trailLength) {
        cursorTrail.shift();
    }
});

// Parallax Effect on Scroll - Optimized with throttling
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
    }, 16); // ~60fps
    
    const scrolled = window.pageYOffset;
    
    // Only apply parallax if scrolled past hero
    if (scrolled > window.innerHeight) return;
    
    // Parallax for background orbs only (lightweight)
    const orbs = document.querySelectorAll('.gradient-orb');
    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.02;
        orb.style.transform = `translateY(${scrolled * speed}px)`;
    });
}, { passive: true });

// Counter Animation for Statistics (if needed in the future)
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Intersection Observer for Section Animations
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'all 1s ease';
    sectionObserver.observe(section);
});

// Add Loading Animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 1s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Gradient Animation on Hover for Buttons
document.querySelectorAll('.cta-btn, .submit-btn, .course-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.backgroundSize = '200% 200%';
        this.style.animation = 'gradientShift 2s ease infinite';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.animation = '';
    });
});

// Add gradient shift keyframes dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;
document.head.appendChild(style);

// Magnetic Effect for Important Buttons
document.querySelectorAll('.cta-btn, .submit-btn').forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        this.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) translateY(-3px)`;
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});

// Progress Indicator (for long pages)
const progressBar = document.createElement('div');
progressBar.style.position = 'fixed';
progressBar.style.top = '0';
progressBar.style.left = '0';
progressBar.style.height = '3px';
progressBar.style.background = 'linear-gradient(90deg, #c77111, #ffffff)';
progressBar.style.width = '0%';
progressBar.style.zIndex = '9999';
progressBar.style.transition = 'width 0.3s ease';
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = (window.pageYOffset / documentHeight) * 100;
    progressBar.style.width = scrolled + '%';
});

// Easter Egg: Konami Code for Special Animation
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        document.body.style.animation = 'rainbow 2s linear infinite';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }
});

// Add rainbow animation
const rainbowStyle = document.createElement('style');
rainbowStyle.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(rainbowStyle);

// Performance: Reduce animations on low-end devices
if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.querySelectorAll('.gradient-orb').forEach(orb => {
        orb.style.display = 'none';
    });
    document.getElementById('particles').style.display = 'none';
}

// Accessibility: Pause animations on preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('*').forEach(el => {
        el.style.animation = 'none';
        el.style.transition = 'none';
    });
}

console.log('%cKaizen Dental Academy 🦷', 'font-size: 20px; font-weight: bold; color: #c77111;');
console.log('%c1% better every single day', 'font-size: 14px; font-style: italic; color: #ffffff;');

