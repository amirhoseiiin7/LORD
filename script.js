"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------------
     CONFIGURATION
  -------------------------------- */

  const CONFIG = {
    email: "a.naghiar@gmail.com",
    scrollPixelsPerSecond: 150,
    seekThreshold: 0.05,
    languageStorageKey: "lord-portfolio-language",
  };

  /* --------------------------------
     ELEMENTS
  -------------------------------- */

  const body = document.body;
  const html = document.documentElement;

  const intro = document.getElementById("intro");
  const enterButton = document.getElementById("enterButton");

  const video = document.getElementById("scrollVideo");
  const stage = document.getElementById("stage");
  const videoCounter = document.getElementById("videoCounter");

  const languageToggle = document.getElementById("languageToggle");
  const languageLabel = document.getElementById("languageLabel");

  const contactModal = document.getElementById("contactModal");
  const openContact = document.getElementById("openContact");
  const closeContact = document.getElementById("closeContact");
  const contactForm = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");

  const backToTop = document.getElementById("backToTop");

  /* --------------------------------
     STATE
  -------------------------------- */

  let currentLanguage = "en";
  let experienceStarted = false;
  let experienceInitialized = false;

  let desiredVideoTime = 0;
  let isSeeking = false;
  let seekFrame = null;

  let masterTimeline = null;

  /* --------------------------------
     LANGUAGE
  -------------------------------- */

  function updatePlaceholders() {
    const placeholders = {
      senderName: {
        en: "Your name",
        fa: "نام شما",
      },
      senderEmail: {
        en: "you@example.com",
        fa: "you@example.com",
      },
      messageSubject: {
        en: "What is this about?",
        fa: "موضوع پیام شما چیست؟",
      },
      messageBody: {
        en: "Write something...",
        fa: "پیامت رو اینجا بنویس...",
      },
    };

    Object.entries(placeholders).forEach(([id, values]) => {
      const element = document.getElementById(id);

      if (element) {
        element.placeholder = values[currentLanguage];
      }
    });
  }

  function setLanguage(language) {
    if (!["en", "fa"].includes(language)) return;

    currentLanguage = language;

    html.lang = language;
    html.dir = language === "fa" ? "rtl" : "ltr";

    languageLabel.textContent = language === "en" ? "FA" : "EN";

    languageToggle.setAttribute(
      "aria-label",
      language === "en" ? "Switch to Persian" : "Switch to English",
    );

    updatePlaceholders();

    try {
      localStorage.setItem(CONFIG.languageStorageKey, language);
    } catch {
      // Language preference still works without localStorage.
    }

    if (window.ScrollTrigger) {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }
  }

  function initializeLanguage() {
    let savedLanguage = "en";

    try {
      const saved = localStorage.getItem(CONFIG.languageStorageKey);

      if (saved === "fa" || saved === "en") {
        savedLanguage = saved;
      }
    } catch {
      // Use English as the default.
    }

    setLanguage(savedLanguage);
  }

  languageToggle.addEventListener("click", () => {
    setLanguage(currentLanguage === "en" ? "fa" : "en");
  });

  initializeLanguage();

  /* --------------------------------
     VIDEO SEEK CONTROLLER

     Scroll controls the video's
     currentTime without playing it.
  -------------------------------- */

  function requestVideoTime(time) {
    if (!video || !Number.isFinite(time)) return;

    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    desiredVideoTime = Math.max(0, Math.min(time, duration));

    if (!seekFrame) {
      seekFrame = requestAnimationFrame(processVideoSeek);
    }
  }

  function processVideoSeek() {
    seekFrame = null;

    if (!video || video.readyState < 2 || isSeeking) return;

    const difference = desiredVideoTime - video.currentTime;

    if (Math.abs(difference) < CONFIG.seekThreshold) return;

    isSeeking = true;

    try {
      video.currentTime = desiredVideoTime;
    } catch {
      isSeeking = false;
    }
  }

  video.addEventListener("seeking", () => {
    isSeeking = true;
  });

  video.addEventListener("seeked", () => {
    isSeeking = false;

    if (Math.abs(desiredVideoTime - video.currentTime) > CONFIG.seekThreshold) {
      if (!seekFrame) {
        seekFrame = requestAnimationFrame(processVideoSeek);
      }
    }
  });

  video.addEventListener("error", () => {
    console.error("Background video could not be loaded.", video.error);
  });

  /* --------------------------------
     SLIDE COUNTER
  -------------------------------- */

  function updateSlideCounter(time, duration) {
    const slides = document.querySelectorAll(".timeline-text");

    if (!slides.length || !duration) return;

    let activeIndex = 0;

    slides.forEach((slide, index) => {
      const start = Number(slide.dataset.start);
      const end = Number(slide.dataset.end);

      if (time >= start && time < end) {
        activeIndex = index + 1;
      }
    });

    if (time >= duration - 0.05) {
      activeIndex = slides.length;
    }

    videoCounter.textContent = `${String(activeIndex).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  }

  /* --------------------------------
     GSAP EXPERIENCE
  -------------------------------- */

  function initializeExperience() {
    if (experienceInitialized) return;

    if (!video || !stage) return;

    if (
      typeof window.gsap === "undefined" ||
      typeof window.ScrollTrigger === "undefined"
    ) {
      console.error("GSAP or ScrollTrigger failed to load.");
      return;
    }

    if (
      video.readyState < 1 ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    experienceInitialized = true;

    const duration = video.duration;

    gsap.registerPlugin(ScrollTrigger);

    const proxy = { time: 0 };

    const slides = gsap.utils.toArray(".timeline-text");

    // Reset slide states before building the timeline.
    gsap.set(slides, {
      autoAlpha: 0,
      y: 35,
    });

    masterTimeline = gsap.timeline({
      defaults: {
        ease: "none",
      },
      scrollTrigger: {
        trigger: "#experience",
        start: "top top",
        end: () => `+=${duration * CONFIG.scrollPixelsPerSecond}`,
        pin: stage,
        pinSpacing: true,
        scrub: 0.25,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Scroll progress controls the video timeline.
    masterTimeline.to(
      proxy,
      {
        time: duration,
        duration,
        ease: "none",
        onUpdate: () => {
          requestVideoTime(proxy.time);
          updateSlideCounter(proxy.time, duration);
        },
      },
      0,
    );

    // Each slide has its own appearance and disappearance.
    slides.forEach((slide) => {
      const start = Number(slide.dataset.start);
      const end = Number(slide.dataset.end);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return;
      }

      const fadeDuration = Math.min(0.4, (end - start) / 4);

      masterTimeline.fromTo(
        slide,
        {
          autoAlpha: 0,
          y: 35,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: fadeDuration,
          ease: "power2.out",
        },
        start,
      );

      masterTimeline.to(
        slide,
        {
          autoAlpha: 0,
          y: -25,
          duration: fadeDuration,
          ease: "power2.in",
        },
        Math.max(start + fadeDuration, end - fadeDuration),
      );
    });

    // Keep the video at the first frame initially.
    requestVideoTime(0);

    ScrollTrigger.refresh();

    console.info("LORD experience initialized.", {
      duration,
      slides: slides.length,
    });
  }

  video.addEventListener("loadedmetadata", () => {
    if (experienceStarted) {
      initializeExperience();
    }
  });

  /* --------------------------------
     INTRO
  -------------------------------- */

  function startExperience() {
    if (experienceStarted) return;

    experienceStarted = true;

    const finishIntro = () => {
      body.classList.remove("is-locked");

      intro?.remove();

      initializeExperience();

      if (video.readyState >= 1) {
        initializeExperience();
      }
    };

    if (window.gsap) {
      gsap.to(intro, {
        autoAlpha: 0,
        duration: 0.9,
        ease: "power2.inOut",
        onComplete: finishIntro,
      });
    } else {
      finishIntro();
    }
  }

  enterButton.addEventListener("click", startExperience);

  /* --------------------------------
     CONTACT MODAL
  -------------------------------- */

  let previousFocusedElement = null;

  function openModal() {
    previousFocusedElement = document.activeElement;

    contactModal.classList.add("is-open");
    contactModal.setAttribute("aria-hidden", "false");

    body.classList.add("modal-open");

    const firstInput = document.getElementById("senderName");

    window.setTimeout(() => {
      firstInput?.focus();
    }, 150);
  }

  function closeModal() {
    contactModal.classList.remove("is-open");
    contactModal.setAttribute("aria-hidden", "true");

    body.classList.remove("modal-open");

    previousFocusedElement?.focus();
  }

  openContact.addEventListener("click", openModal);
  closeContact.addEventListener("click", closeModal);

  contactModal.addEventListener("click", (event) => {
    if (event.target === contactModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && contactModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  // Basic focus containment for keyboard users.
  contactModal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;

    const focusable = contactModal.querySelectorAll(
      'button, input, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );

    const items = Array.from(focusable).filter((element) => !element.disabled);

    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* --------------------------------
     CONTACT FORM

     This uses mailto. It does not
     send directly from the website.
  -------------------------------- */

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const name = document.getElementById("senderName").value.trim();
    const email = document.getElementById("senderEmail").value.trim();
    const subject = document.getElementById("messageSubject").value.trim();
    const message = document.getElementById("messageBody").value.trim();

    if (!name || !email || !subject || !message) return;

    const emailSubject = encodeURIComponent(subject);

    const emailBody = encodeURIComponent(
      `Name: ${name}\n` + `Email: ${email}\n\n` + `Message:\n${message}`,
    );

    const mailtoLink =
      `mailto:${CONFIG.email}` +
      `?subject=${emailSubject}` +
      `&body=${emailBody}`;

    formNote.textContent =
      currentLanguage === "fa"
        ? "برنامه ایمیل شما باز می‌شود. پیام را بررسی و ارسال کنید."
        : "Your email app is opening. Review your message and send it.";

    window.location.href = mailtoLink;
  });

  /* --------------------------------
     BACK TO TOP
  -------------------------------- */

  backToTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  /* --------------------------------
     INITIAL PLACEHOLDERS
  -------------------------------- */

  updatePlaceholders();
});
