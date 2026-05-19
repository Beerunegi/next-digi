const menuButton = document.querySelector('.menu-toggle');
const topNav = document.querySelector('#topNav');
const localImageFallbacks = [
  '/images/home/photo-1542744094-3a31f272c490.jpg',
  '/images/home/photo-1460925895917-afdab827c52f.jpg',
  '/images/home/photo-1516321318423-f06f85e504b3.jpg',
  '/images/home/photo-1562577309-4932fdd64cd1.jpg',
  '/images/services/photo-seo-dash.jpg',
  '/images/services/photo-meta-ads.jpg'
];

const applyImageFallback = (img) => {
  if (!img || img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  const index = Math.abs((img.alt || img.src || '').length) % localImageFallbacks.length;
  img.src = localImageFallbacks[index];
};

document.querySelectorAll('img').forEach((img) => {
  img.addEventListener('error', () => applyImageFallback(img), { once: true });

  if (img.complete && img.naturalWidth === 0) {
    applyImageFallback(img);
  }
});

if (menuButton && topNav) {
  const closeMenu = () => {
    topNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = topNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  topNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 760 && link.classList.contains('nav-dropdown-toggle')) {
        e.preventDefault();
        link.parentElement.classList.toggle('active');
        return;
      }
      closeMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!topNav.classList.contains('open')) return;
    if (topNav.contains(event.target) || menuButton.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) {
      closeMenu();
    }
  });
}

const revealTargets = document.querySelectorAll('.reveal');
 
if (revealTargets.length) {
  document.documentElement.classList.add('reveal-ready');

  if (!('IntersectionObserver' in window)) {
    revealTargets.forEach((item) => item.classList.add('show'));
  } else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          // Optionally unobserve if we only want one-way animation
          // observer.unobserve(entry.target);
        }
      });
    },
    { 
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before it hits the viewport
    }
  );
 
  revealTargets.forEach((item, index) => {
    // Dynamic stagger based on screen position or index
    const rect = item.getBoundingClientRect();
    const delay = Math.min((rect.top / 10) + (index % 3 * 100), 400);
    item.style.transitionDelay = `${delay}ms`;
    observer.observe(item);
  });
  }
}

const counters = document.querySelectorAll('[data-counter]');

const animateCounter = (el) => {
  const target = Number(el.getAttribute('data-counter'));
  const duration = 1100;
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(progress * target);
    el.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target;
    }
  };

  requestAnimationFrame(step);
};

if (counters.length) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

const allowTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiltCards = document.querySelectorAll('[data-tilt]');

if (allowTilt && !reduceMotion) {
  tiltCards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const rotateX = ((y / rect.height) - 0.5) * -8;
      const rotateY = ((x / rect.width) - 0.5) * 8;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

const typewriterWord = document.querySelector('#typewriterWord');

if (typewriterWord) {
  const words = (typewriterWord.getAttribute('data-words') || '')
    .split('|')
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length) {
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const currentWord = words[wordIndex];

      if (!deleting) {
        charIndex += 1;
        typewriterWord.textContent = currentWord.slice(0, charIndex);

        if (charIndex === currentWord.length) {
          deleting = true;
          setTimeout(tick, 900);
          return;
        }
      } else {
        charIndex -= 1;
        typewriterWord.textContent = currentWord.slice(0, charIndex);

        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
        }
      }

      const speed = deleting ? 40 : 75;
      setTimeout(tick, speed);
    };

    typewriterWord.textContent = '';
    tick();
  }
}

const whatsappHref = 'https://wa.me/919871264699?text=Hello%20Digi%20Web%20Tech%2C%20I%20need%20digital%20marketing%20services.';
const ctaGroups = document.querySelectorAll('.hero-actions, .final-cta-inner');

ctaGroups.forEach((group) => {
  // Prevent aggressive script from injecting WhatsApp into specific grid layouts or sections like "Why Choose"
  if (group.closest('.why-choose-section')) return;
  
  const hasWhatsapp = group.querySelector('.btn-whatsapp');
  if (!hasWhatsapp) {
    const link = document.createElement('a');
    link.href = whatsappHref;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'btn btn-whatsapp';
    link.textContent = 'WhatsApp Now';
    group.appendChild(link);
  }
});

const sliderRoots = document.querySelectorAll('[data-slider-root]');

sliderRoots.forEach((sliderRoot) => {
  const sliderTrack = sliderRoot.querySelector('[data-slider-track]');
  const sliderCards = sliderTrack ? Array.from(sliderTrack.querySelectorAll('[data-slider-card], .sample-testimonial-card, .about-testimonial-card')) : [];

  if (!sliderTrack || sliderCards.length < 2) {
    return;
  }

  const getScrollAmount = () => {
    const firstCard = sliderCards[0];
    return firstCard ? firstCard.getBoundingClientRect().width + 16 : 340;
  };

  const scrollToCard = (index) => {
    const boundedIndex = index >= sliderCards.length ? 0 : index < 0 ? sliderCards.length - 1 : index;
    const targetCard = sliderCards[boundedIndex];
    if (!targetCard) return boundedIndex;

    sliderTrack.scrollTo({
      left: targetCard.offsetLeft - sliderTrack.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    return boundedIndex;
  };

  let activeIndex = 0;
  let autoSlideTimer = null;
  let resumeTimer = null;

  const isMobileSlider = () => window.innerWidth <= 760;

  const syncActiveIndex = () => {
    const scrollLeft = sliderTrack.scrollLeft;
    const scrollAmount = getScrollAmount();
    activeIndex = scrollAmount > 0 ? Math.round(scrollLeft / scrollAmount) : 0;
    activeIndex = Math.max(0, Math.min(activeIndex, sliderCards.length - 1));
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer) {
      window.clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  };

  const startAutoSlide = () => {
    stopAutoSlide();

    if (!isMobileSlider() || reduceMotion) {
      return;
    }

    autoSlideTimer = window.setInterval(() => {
      activeIndex = scrollToCard(activeIndex + 1);
    }, 3200);
  };

  const pauseAndResumeAutoSlide = () => {
    stopAutoSlide();
    if (resumeTimer) {
      window.clearTimeout(resumeTimer);
    }

    resumeTimer = window.setTimeout(() => {
      syncActiveIndex();
      startAutoSlide();
    }, 4200);
  };

  sliderTrack.addEventListener('scroll', syncActiveIndex, { passive: true });
  sliderTrack.addEventListener('pointerdown', pauseAndResumeAutoSlide, { passive: true });
  sliderTrack.addEventListener('touchstart', pauseAndResumeAutoSlide, { passive: true });
  sliderTrack.addEventListener('mouseenter', stopAutoSlide);
  sliderTrack.addEventListener('mouseleave', startAutoSlide);
  window.addEventListener('resize', startAutoSlide);

  startAutoSlide();
});

