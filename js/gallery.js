function initSlideshows() {
  document.querySelectorAll("[data-slideshow]").forEach((section) => {
    const scrollEl = section.querySelector(".slideshow__scroll");
    const slides = [...section.querySelectorAll(".slideshow__slide")];
    const titleEl = section.querySelector(".slideshow__title");
    const yearEl = section.querySelector(".slideshow__year");
    const infoEl = section.querySelector(".slideshow__info");
    const prevBtn = section.querySelector("[data-prev]");
    const nextBtn = section.querySelector("[data-next]");

    if (!scrollEl || slides.length === 0) return;

    slides.forEach((slide) => {
      slide.querySelector("img")?.setAttribute("draggable", "false");
    });

    let activeIndex = 0;
    let ticking = false;

    function getActiveIndex() {
      const center = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
      let closestIndex = 0;
      let minDistance = Infinity;

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(center - slideCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    function scrollToIndex(index) {
      const slide = slides[index];
      if (!slide) return;

      const target = slide.offsetLeft + slide.offsetWidth / 2 - scrollEl.clientWidth / 2;
      scrollEl.scrollTo({ left: target, behavior: "smooth" });
    }

    function updateInfo(index) {
      if (index === activeIndex) return;

      const slide = slides[index];
      activeIndex = index;
      infoEl.classList.add("is-updating");

      requestAnimationFrame(() => {
        titleEl.textContent = slide.dataset.title;
        yearEl.textContent = slide.dataset.year;

        requestAnimationFrame(() => {
          infoEl.classList.remove("is-updating");
        });
      });
    }

    function updateOpacity(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle("is-active", i === index);
        slide.classList.toggle("is-next", i === index + 1);
      });
    }

    function updateControls(index) {
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    }

    function syncState() {
      const index = getActiveIndex();
      updateInfo(index);
      updateOpacity(index);
      updateControls(index);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const index = getActiveIndex();
        updateOpacity(index);
        updateControls(index);
        updateInfo(index);
        ticking = false;
      });
    }

    prevBtn?.addEventListener("click", () => {
      const index = getActiveIndex();
      if (index > 0) scrollToIndex(index - 1);
    });

    nextBtn?.addEventListener("click", () => {
      const index = getActiveIndex();
      if (index < slides.length - 1) scrollToIndex(index + 1);
    });

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("scrollend", syncState);
    window.addEventListener("resize", syncState);

    scrollEl.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        scrollEl.scrollLeft += event.deltaY;
      }
    }, { passive: false });

    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;

    scrollEl.addEventListener("mousedown", (event) => {
      if (event.target.closest(".slideshow__control")) return;
      isDragging = true;
      startX = event.pageX;
      scrollStart = scrollEl.scrollLeft;
      scrollEl.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;
      event.preventDefault();
      scrollEl.scrollLeft = scrollStart - (event.pageX - startX);
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      scrollEl.classList.remove("is-dragging");
      syncState();
    });

    window.addEventListener("load", syncState);
    syncState();
  });
}

function initGalleryMenu() {
  const menuBtn = document.querySelector("[data-menu-open]");
  const nav = document.querySelector("[data-menu]");
  const closeBtn = document.querySelector("[data-menu-close]");

  if (!menuBtn || !nav) return;

  menuBtn.addEventListener("click", () => {
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });

  closeBtn?.addEventListener("click", () => {
    nav.classList.remove("is-open");
    document.body.style.overflow = "";
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSlideshows();
  initGalleryMenu();
});
