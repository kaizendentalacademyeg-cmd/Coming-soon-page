# Kaizen Dental Academy Website

An elegant, bilingual (English/Arabic) website for Kaizen Dental Academy, specializing in continuous development in dental education.

## 🎨 Design Features

- **Elegant & Luxurious Design**: Dark background (#231f20) with gold accent (#c77111) and gradient effects
- **Creative Animations**: 
  - Typewriter animation for hero title
  - Floating gradient orbs in background
  - Particle effects
  - Smooth scroll animations
  - 3D card hover effects
  - Progress indicators
- **Fully Responsive**: Mobile-first design that works on all devices
- **Bilingual Support**: Toggle between English and Arabic with dynamic content switching

## 📁 Project Structure

```
.
├── index.html                  # Main homepage
├── course-3d-bioprinting.html  # Course landing page
├── styles.css                  # Main stylesheet
├── course-styles.css           # Course page specific styles
├── script.js                   # Main JavaScript
├── course-script.js            # Course page JavaScript
├── logo.png                    # Academy logo
├── Logo Icon.png               # Favicon
├── Fonts/                      # Montserrat & Montserrat Arabic fonts
└── README.md                   # This file
```

## 🚀 Features

### Homepage (index.html)
- **Hero Section**: Typewriter animation with "Kaizen Dental Academy"
- **Faculty Section**: 4 faculty members with animated cards
- **Vision & Mission**: Elegant cards with rotating gradient borders
- **Phygital Courses**: Hybrid learning explanation with Venn diagram
- **Courses**: Showcase of available courses
- **Contact Form**: Professional contact form with validation
- **Kaizen Philosophy**: "1% better every single day" motto

### Course Page (course-3d-bioprinting.html)
- **Course Hero**: Animated 3D tooth model, stats, and CTAs
- **Course Overview**: Three key benefits with icons
- **Curriculum**: Detailed breakdown of:
  - 11 Comprehensive Lectures
  - 7 Live Demonstrations
  - 7 Hands-on Workshops
- **Kaizen Philosophy**: Animated progress ring showing 1% improvement
- **Enrollment Form**: Complete registration form

## 🎯 Kaizen Philosophy

The website embodies the Kaizen philosophy of continuous improvement:
- 1% better every single day
- 365 days = 37x better in a year
- Elegant animations showing progress and growth

## 🌐 Bilingual Support

- **English**: Montserrat font family (9 weights)
- **Arabic**: Montserrat Arabic font family (9 weights)
- Toggle button in navigation
- All content dynamically switches
- RTL support for Arabic

## 🎨 Color Palette

- **Background**: #231f20 (Dark charcoal)
- **Primary Text**: #FFFFFF (White)
- **Accent**: #c77111 (Gold)
- **Gradient**: Linear gradient from #c77111 to #FFFFFF

## ✨ Animations

1. **Typewriter Effect**: Hero title types out on page load
2. **Floating Orbs**: Animated gradient orbs in background
3. **Particles**: Rising particles throughout the page
4. **Scroll Animations**: Elements fade in and slide up on scroll
5. **Hover Effects**: 
   - 3D tilt on cards
   - Gradient borders
   - Scale and translate transforms
6. **Progress Bar**: Top of page scroll indicator

## 📱 Responsive Breakpoints

- Desktop: 1024px+
- Tablet: 768px - 1024px
- Mobile: < 768px
- Small Mobile: < 480px

## 🔧 Customization

### To Replace Faculty Images:
Replace the SVG placeholders in faculty cards with:
```html
<img src="path/to/image.jpg" alt="Faculty Name">
```

### To Add More Courses:
Duplicate the course card structure in index.html and create a new course page following the pattern of `course-3d-bioprinting.html`.

### To Change Colors:
Update the CSS variables in `styles.css`:
```css
:root {
    --bg-color: #231f20;
    --text-primary: #ffffff;
    --text-accent: #c77111;
}
```

## 🌟 Performance Optimizations

- Reduced animations on low-end devices
- Respects `prefers-reduced-motion` setting
- Optimized animations with `transform` and `opacity`
- Efficient scroll observers
- Debounced scroll events

## 📧 Form Handling

Currently, forms log to console. To connect to a backend:

1. Update `script.js` form submission handler
2. Replace `console.log()` with actual API calls
3. Add proper validation and error handling

Example:
```javascript
fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
})
```

## 🎓 Faculty Members

1. **Dr. Mahmoud El Gammal** - Biomimetic Restorative Dentist
2. **Dr. Yuussef Hossam** - Biomimetic Restorative Dentist
3. **Dr. Moheb Nady** - Restorative Dentist
4. **Dr. Mohamed Hadida** - Restorative Dentist

## 📚 Featured Course: 3D Bonded Bioprinting

Complete curriculum covering:
- Tooth & Biomechanics
- Caries Removal & Treatment
- Digital Workflows
- 3D Printing Technology
- Finishing & Cementation
- Clinical Case Studies

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

© 2025 Kaizen Dental Academy. All rights reserved.

## 🤝 Support

For questions or support, contact: info@kaizendentalacademy.com

---

**Built with ❤️ for continuous improvement in dental education**
*1% better every single day*

