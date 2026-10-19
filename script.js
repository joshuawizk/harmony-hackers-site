const loader = document.querySelector(".loader");
document.body.classList.add("loading");
window.addEventListener("load", () => {
  window.setTimeout(() => {
    loader.classList.add("done");
    document.body.classList.remove("loading");
  }, 650);
});

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  menuToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
  mainNav.classList.toggle("open", !open);
});
mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
  mainNav.classList.remove("open");
}));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const counterObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const number = entry.target;
    const target = Number(number.dataset.count);
    const duration = 1000;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      number.textContent = String(Math.floor(target * (1 - (1 - progress) ** 3))) + (number.dataset.suffix || "");
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
    observer.unobserve(number);
  });
}, { threshold: 0.65 });
document.querySelectorAll("[data-count]").forEach((number) => counterObserver.observe(number));

const talentTrack = document.querySelector(".talent-track");
document.querySelector(".slide-control.prev").addEventListener("click", () => talentTrack.scrollBy({ left: -talentTrack.clientWidth * 0.75, behavior: "smooth" }));
document.querySelector(".slide-control.next").addEventListener("click", () => talentTrack.scrollBy({ left: talentTrack.clientWidth * 0.75, behavior: "smooth" }));

const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox.querySelector("img");
document.querySelectorAll(".gallery-item").forEach((item) => item.addEventListener("click", () => {
  lightboxImage.src = item.dataset.full;
  lightboxImage.alt = item.querySelector("img").alt;
  lightbox.querySelector("p").textContent = item.querySelector("span").textContent;
  lightbox.showModal();
}));
lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener("close", () => { lightboxImage.removeAttribute("src"); });

function handleDemoForm(form, message) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    form.querySelector(".form-status").textContent = message;
    form.reset();
  });
}
handleDemoForm(document.querySelector("#join-form"), "Thanks for sharing your story. This demo does not deliver applications yet.");
handleDemoForm(document.querySelector("#contact-form"), "Thanks for reaching out. This demo does not deliver messages yet.");

const cursorGlow = document.querySelector(".cursor-glow");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
if (finePointer.matches) {
  window.addEventListener("pointermove", (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
    cursorGlow.style.opacity = "1";
  }, { passive: true });
  window.addEventListener("pointerleave", () => { cursorGlow.style.opacity = "0"; });
}

const hero = document.querySelector(".hero");
if (finePointer.matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    document.querySelector(".orb-one").style.transform = `translate3d(${x * 14}px,${y * 14}px,0)`;
    document.querySelector(".orb-two").style.transform = `translate3d(${x * -20}px,${y * -15}px,0)`;
    document.querySelector(".hero-content").style.transform = `translate3d(${x * -5}px,${y * -4}px,0)`;
  });
  hero.addEventListener("pointerleave", () => {
    document.querySelector(".orb-one").style.transform = "";
    document.querySelector(".orb-two").style.transform = "";
    document.querySelector(".hero-content").style.transform = "";
  });
}
