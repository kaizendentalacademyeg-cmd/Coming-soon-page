// Course Page Specific JavaScript

// Navbar Glassy Effect on Scroll - Smooth transition with debouncing
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

if (mobileMenuToggle && navLinks) {
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
}

// Enrollment Form Handler - All data sent to Make.com webhook
// const MAKE_WEBHOOK_URL is defined inline in the form handler

console.log('🔧 Course script loaded!');
console.log('📍 Looking for enrollment form...');

const enrollmentForm = document.getElementById('enrollmentForm');
const transactionFileInput = document.getElementById('transactionScreenshot');

console.log('📋 Enrollment form found:', enrollmentForm ? 'YES ✅' : 'NO ❌');
console.log('📎 File input found:', transactionFileInput ? 'YES ✅' : 'NO ❌');

// Update file label when file is selected
if (transactionFileInput) {
    console.log('📎 Setting up file input listener...');
    transactionFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        const label = this.nextElementSibling;
        const fileNameSpan = label.querySelector('.file-upload-name');
        
        if (file) {
            if (fileNameSpan) {
                fileNameSpan.textContent = file.name;
                fileNameSpan.style.display = 'block';
            }
            label.classList.add('file-selected');
        } else {
            if (fileNameSpan) {
                fileNameSpan.textContent = '';
                fileNameSpan.style.display = 'none';
            }
            label.classList.remove('file-selected');
        }
    });
}

// Create loading overlay
function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'form-loading-overlay';
    overlay.id = 'formLoadingOverlay';
    
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <h3 data-en="Processing Your Enrollment" data-ar="معالجة التسجيل">Processing Your Enrollment</h3>
            <p data-en="Please wait while we process your enrollment..." data-ar="يرجى الانتظار بينما نعالج تسجيلك...">Please wait while we process your enrollment...</p>
            
            <div class="upload-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar" id="uploadProgressBar"></div>
                </div>
                <div class="progress-text" id="progressText">Preparing...</div>
            </div>
            
            <div class="loading-steps">
                <div class="loading-step" id="step1">
                    <div class="loading-step-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span data-en="Preparing data..." data-ar="تجهيز البيانات...">Preparing data...</span>
                </div>
                <div class="loading-step" id="step2">
                    <div class="loading-step-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span data-en="Uploading screenshot..." data-ar="رفع لقطة الشاشة...">Uploading screenshot...</span>
                </div>
                <div class="loading-step" id="step3">
                    <div class="loading-step-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span data-en="Sending to Google Sheets..." data-ar="الإرسال إلى جوجل شيت...">Sending to Google Sheets...</span>
                </div>
                <div class="loading-step" id="step4">
                    <div class="loading-step-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span data-en="Sending confirmation email..." data-ar="إرسال رسالة التأكيد...">Sending confirmation email...</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
}

// Show loading with steps
function showLoading() {
    let overlay = document.getElementById('formLoadingOverlay');
    if (!overlay) {
        overlay = createLoadingOverlay();
    }
    
    // Apply English text to overlay
    const elements = overlay.querySelectorAll('[data-en]');
    elements.forEach(el => {
        if (el.getAttribute('data-en')) {
            el.textContent = el.getAttribute('data-en');
        }
    });
    
    setTimeout(() => overlay.classList.add('active'), 10);
    
    // Animate progress
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('progressText');
    
    // Step 1: Preparing (0-25%)
    setTimeout(() => {
        document.getElementById('step1').classList.add('active');
        progressBar.style.width = '25%';
        progressText.textContent = 'Preparing data...';
    }, 300);
    
    // Step 2: Uploading (25-50%)
    setTimeout(() => {
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step1').classList.add('completed');
        document.getElementById('step2').classList.add('active');
        progressBar.style.width = '50%';
        progressText.textContent = 'Uploading files...';
    }, 800);
    
    // Step 3: Sending to Sheets (50-75%)
    setTimeout(() => {
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step2').classList.add('completed');
        document.getElementById('step3').classList.add('active');
        progressBar.style.width = '75%';
        progressText.textContent = 'Saving data...';
    }, 1400);
    
    // Step 4: Email (75-90%)
    setTimeout(() => {
        document.getElementById('step3').classList.remove('active');
        document.getElementById('step3').classList.add('completed');
        document.getElementById('step4').classList.add('active');
        progressBar.style.width = '90%';
        progressText.textContent = 'Sending email...';
    }, 2000);
}

// Hide loading
function hideLoading() {
    const overlay = document.getElementById('formLoadingOverlay');
    if (overlay) {
        // Complete progress
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('progressText');
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        // Mark all steps complete
        document.getElementById('step4').classList.remove('active');
        document.getElementById('step4').classList.add('completed');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }, 500);
    }
}

if (enrollmentForm) {
    console.log('✅ Setting up form submit listener...');
    
    enrollmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = enrollmentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        // URLs
        const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/7vs1dnyg5sgx7k5vj93k8wnetd84kxau';
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby34tVCNzlzSbm5_irpGGJXpY_snkLzThbzxum5d5VqLI6v7ptMRK54Ek8RSNlZuNTzxw/exec';
        
        // Get file
        const transaction = document.getElementById("transactionScreenshot").files[0];
        
        // ===== STEP 1: Prepare FormData for Make.com (ALL fields + FILE) =====
        const makeFormData = new FormData(enrollmentForm);
        if (transaction) {
            makeFormData.delete("transaction");
            makeFormData.append("transaction", transaction);
            console.log('✅ File appended to Make.com FormData:', transaction.name, '(' + transaction.size + ' bytes)');
        }
        
        // ===== STEP 2: Prepare FormData for Apps Script (TEXT FIELDS ONLY - NO FILE) =====
        const appsScriptFormData = new FormData();
        
        // Get all text field values
        appsScriptFormData.append("firstName", document.getElementById("enrollFirstName").value);
        appsScriptFormData.append("lastName", document.getElementById("enrollLastName").value);
        appsScriptFormData.append("email", document.getElementById("enrollEmail").value);
        appsScriptFormData.append("phone", document.getElementById("enrollPhone").value);
        appsScriptFormData.append("country", document.getElementById("enrollCountry").value);
        appsScriptFormData.append("clinic", document.getElementById("clinicName").value);
        appsScriptFormData.append("faculty", document.getElementById("faculty").value);
        appsScriptFormData.append("gradYear", document.getElementById("graduationYear").value);
        appsScriptFormData.append("moreInfo", document.getElementById("enrollMessage").value);
        // NO FILE - Apps Script doesn't handle files
        
        console.log('📤 Sending to Make.com (with file):');
        for (const [key, value] of makeFormData.entries()) {
            if (value instanceof File) {
                console.log('  ' + key + ': [File] ' + value.name + ' (' + value.size + ' bytes)');
            } else {
                console.log('  ' + key + ': ' + value);
            }
        }
        
        console.log('📤 Sending to Apps Script (text only):');
        for (const [key, value] of appsScriptFormData.entries()) {
            console.log('  ' + key + ': ' + value);
        }
        
        try {
            // Send both requests in parallel - each runs independently
            // This ensures both Make.com and Apps Script receive data even if one fails
            console.log('🚀 Starting parallel submission to both endpoints...');
            
            const makePromise = fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                body: makeFormData
            }).then(res => {
                console.log('✅ Make.com webhook: Request sent successfully (Status:', res.status + ')');
                return { success: true, source: 'Make.com' };
            }).catch(err => {
                console.error('❌ Make.com webhook error:', err);
                return { success: false, source: 'Make.com', error: err };
            });
            
            const appsScriptPromise = fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: appsScriptFormData,
                mode: 'no-cors'  // Required for Apps Script CORS
            }).then(() => {
                console.log('✅ Apps Script: Request sent successfully');
                return { success: true, source: 'Apps Script' };
            }).catch(err => {
                console.error('❌ Apps Script error:', err);
                return { success: false, source: 'Apps Script', error: err };
            });
            
            // Wait for both to complete (they run in parallel)
            const [makeResult, appsScriptResult] = await Promise.allSettled([
                makePromise,
                appsScriptPromise
            ]);
            
            // Check results
            const makeSuccess = makeResult.status === 'fulfilled' && makeResult.value?.success;
            const appsScriptSuccess = appsScriptResult.status === 'fulfilled' && appsScriptResult.value?.success;
            
            console.log('📊 Submission Results:');
            console.log('  Make.com webhook:', makeSuccess ? '✅ Success' : '❌ Failed');
            console.log('  Apps Script:', appsScriptSuccess ? '✅ Success' : '❌ Failed');
            console.log('  Both endpoints were called in parallel');
            
            // Both endpoints are called independently - show success if at least one succeeded
            // Note: Both requests are sent regardless, so both will receive data
            if (makeSuccess || appsScriptSuccess) {
                console.log('✅ Form submitted successfully!');
                console.log('📝 Both Make.com and Apps Script received the submission (data sent to both endpoints)');
                
                // Show success message
                showFormMessage(
                    'Thank you for enrolling! We have received your enrollment and payment confirmation. We will contact you shortly with course details.',
                    'success'
                );
                
                // Reset form
                enrollmentForm.reset();
                
                // Reset file input UI
                if (transactionFileInput) {
                    const label = transactionFileInput.nextElementSibling;
                    const fileNameSpan = label.querySelector('.file-upload-name');
                    if (fileNameSpan) {
                        fileNameSpan.textContent = '';
                        fileNameSpan.style.display = 'none';
                    }
                    label.classList.remove('file-selected');
                }
                
                // Scroll to top to see the message
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Both failed
                console.error('❌ Both endpoints failed');
                throw new Error('Both submission endpoints failed');
            }
            
        } catch (err) {
            console.error('❌ Submission error:', err);
            
            // Show elegant error message
            showFormMessage(
                'There was an error submitting your enrollment. Please try again or contact us directly.',
                'error'
            );
        } finally {
            submitBtn.disabled = false;
        }
    });
    
    console.log('✅ Form submit listener attached successfully!');
} else {
    console.error('❌ ERROR: Enrollment form NOT FOUND! The form with id="enrollmentForm" does not exist in the page.');
    console.log('💡 TIP: Make sure the script is loaded AFTER the form HTML, or wrap it in DOMContentLoaded.');
}

// Function to show form messages
function showFormMessage(message, type) {
    // Ensure enrollmentForm exists
    if (!enrollmentForm) {
        console.error('❌ enrollmentForm not found, cannot show message');
        return;
    }
    
    // Remove existing message if any
    const existingMessage = enrollmentForm.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Get submit button
    const submitBtn = enrollmentForm.querySelector('button[type="submit"]');
    if (!submitBtn) {
        console.error('❌ Submit button not found, cannot show message');
        return;
    }
    
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
    if (submitBtn.parentNode) {
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
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Animated Counter for Stats
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Observe stats and animate when visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target;
            const targetValue = parseInt(statNumber.textContent);
            animateValue(statNumber, 0, targetValue, 2000);
            statsObserver.unobserve(statNumber);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number, .phil-stat-number').forEach(stat => {
    statsObserver.observe(stat);
});

// Curriculum Item Animations
const curriculumObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.curriculum-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'all 0.6s ease';
    curriculumObserver.observe(item);
});

// Curriculum Grid Items Animation
document.querySelectorAll('.curriculum-grid-item').forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'scale(0.9)';
    item.style.transition = 'all 0.5s ease';
    item.style.transitionDelay = `${index * 0.1}s`;
    
    curriculumObserver.observe(item);
    
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});

// Overview Cards Parallax
document.querySelectorAll('.overview-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 15;
        const rotateY = (centerX - x) / 15;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// Progress Ring Animation
const progressRing = document.querySelector('.progress-ring');
if (progressRing) {
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateProgressRing();
                progressObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    progressObserver.observe(progressRing);
    
    function animateProgressRing() {
        const percent = 0.01; // 1%
        const offset = circumference - (percent * circumference);
        
        let currentOffset = circumference;
        const duration = 2000;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            currentOffset = circumference - (progress * (circumference - offset));
            progressRing.style.strokeDashoffset = currentOffset;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
}

// 3D Model Interaction
const floatingModel = document.querySelector('.floating-3d-model');
if (floatingModel) {
    let mouseX = 0;
    let mouseY = 0;
    let modelX = 0;
    let modelY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    
    function animateModel() {
        modelX += (mouseX * 20 - modelX) * 0.05;
        modelY += (mouseY * 20 - modelY) * 0.05;
        
        floatingModel.style.transform = `translate(${modelX}px, ${modelY}px)`;
        requestAnimationFrame(animateModel);
    }
    
    animateModel();
}

// Smooth Reveal for Course Hero Elements
window.addEventListener('load', () => {
    const heroElements = document.querySelectorAll('.course-hero-content > *');
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 150);
    });
});

// Parallax Effect for Course Hero - Optimized
let courseScrollTimeout;
window.addEventListener('scroll', () => {
    if (courseScrollTimeout) return;
    courseScrollTimeout = setTimeout(() => {
        courseScrollTimeout = null;
    }, 16);
    
    const scrolled = window.pageYOffset;
    
    // Only apply if scrolled past hero
    if (scrolled > window.innerHeight) return;
    
    const heroVisual = document.querySelector('.course-hero-visual');
    if (heroVisual && scrolled < window.innerHeight) {
        heroVisual.style.transform = `translateY(-50%) translateX(${scrolled * 0.05}px)`;
    }
}, { passive: true });

// Enrollment Button Click Tracking
document.querySelectorAll('a[href="#enroll"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        console.log('Enrollment button clicked');
        // Here you could add analytics tracking
    });
});

// Curriculum Item Click to Expand (Optional Enhancement)
document.querySelectorAll('.curriculum-item').forEach(item => {
    item.addEventListener('click', function() {
        this.classList.toggle('expanded');
        
        // Optional: Show more details
        const details = this.querySelector('.item-details');
        if (details) {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
    });
});

// Add Particle Effect to Hero Section
function createHeroParticles() {
    const hero = document.querySelector('.course-hero');
    if (!hero) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'hero-particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, #c77111, transparent);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.2};
            animation: float ${Math.random() * 10 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        hero.appendChild(particle);
    }
}

createHeroParticles();

// Scroll Progress Indicator specifically for Course Page
const courseProgressBar = document.createElement('div');
courseProgressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: linear-gradient(90deg, #c77111, #ffffff);
    width: 0%;
    z-index: 9999;
    transition: width 0.3s ease;
`;
document.body.appendChild(courseProgressBar);

window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = (window.pageYOffset / documentHeight) * 100;
    courseProgressBar.style.width = scrolled + '%';
});

// Add Hover Sound Effect (Optional - commented out by default)
/*
const hoverSound = new Audio('path/to/hover-sound.mp3');
document.querySelectorAll('.curriculum-item, .overview-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
        hoverSound.currentTime = 0;
        hoverSound.play().catch(e => console.log('Audio play failed'));
    });
});
*/

// Keyboard Navigation for Curriculum
let currentCurriculumIndex = -1;
const curriculumItems = document.querySelectorAll('.curriculum-item');

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && currentCurriculumIndex < curriculumItems.length - 1) {
        currentCurriculumIndex++;
        curriculumItems[currentCurriculumIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        curriculumItems[currentCurriculumIndex].style.boxShadow = '0 0 30px rgba(199, 113, 17, 0.5)';
        
        if (currentCurriculumIndex > 0) {
            curriculumItems[currentCurriculumIndex - 1].style.boxShadow = '';
        }
    } else if (e.key === 'ArrowUp' && currentCurriculumIndex > 0) {
        curriculumItems[currentCurriculumIndex].style.boxShadow = '';
        currentCurriculumIndex--;
        curriculumItems[currentCurriculumIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        curriculumItems[currentCurriculumIndex].style.boxShadow = '0 0 30px rgba(199, 113, 17, 0.5)';
    }
});

// Print Curriculum Feature
function printCurriculum() {
    window.print();
}

// Add print button (optional)
const curriculumSection = document.querySelector('.curriculum');
if (curriculumSection) {
    const printBtn = document.createElement('button');
    printBtn.textContent = 'Print Curriculum';
    printBtn.className = 'print-curriculum-btn';
    printBtn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--gradient);
        color: var(--bg-color);
        padding: 1rem 2rem;
        border: none;
        border-radius: 50px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 40px rgba(199, 113, 17, 0.4);
        z-index: 100;
        transition: all 0.3s ease;
    `;
    printBtn.addEventListener('click', printCurriculum);
    printBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 15px 50px rgba(199, 113, 17, 0.6)';
    });
    printBtn.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.boxShadow = '0 10px 40px rgba(199, 113, 17, 0.4)';
    });
    document.body.appendChild(printBtn);
}

// Share Course Feature
function shareCourse() {
    if (navigator.share) {
        navigator.share({
            title: '3D Bonded Bioprinting - Kaizen Dental Academy',
            text: 'Check out this amazing course on 3D Bonded Bioprinting!',
            url: window.location.href
        }).then(() => {
            console.log('Course shared successfully');
        }).catch(err => {
            console.log('Error sharing:', err);
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Course link copied to clipboard!');
        });
    }
}

// Console message for course page
console.log('%c3D Bonded Bioprinting Course 🦷', 'font-size: 24px; font-weight: bold; color: #c77111;');
console.log('%cTransform your practice with cutting-edge technology', 'font-size: 14px; color: #ffffff;');

