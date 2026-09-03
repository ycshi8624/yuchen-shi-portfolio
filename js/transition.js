function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function buildRuleBar(word, { interactive = false } = {}) {
  const bar = document.createElement("div");
  bar.className = "rule-bar";

  const lead = document.createElement("i");
  lead.className = "rule-bar__seg rule-bar__seg--lead";
  lead.setAttribute("aria-hidden", "true");
  bar.appendChild(lead);

  [...word].forEach((char, index) => {
    if (index > 0) {
      const seg = document.createElement("i");
      seg.className = "rule-bar__seg";
      seg.setAttribute("aria-hidden", "true");
      bar.appendChild(seg);
    }

    const letter = document.createElement("span");
    letter.className = "rule-bar__letter";
    letter.textContent = char;
    bar.appendChild(letter);
  });

  const grow = document.createElement("i");
  grow.className = "rule-bar__seg rule-bar__seg--grow";
  grow.setAttribute("aria-hidden", "true");
  bar.appendChild(grow);

  const home = interactive
    ? Object.assign(document.createElement("a"), {
        href: "index.html",
        className: "rule-bar__home",
      })
    : Object.assign(document.createElement("span"), {
        className: "rule-bar__home",
      });

  if (interactive) {
    home.setAttribute("aria-label", "Home");
  }

  const img = document.createElement("img");
  img.src = "images/signature.png?v=2";
  img.alt = interactive ? "Home" : "Yuchen Shi signature";
  img.className = "rule-bar__signature";
  home.appendChild(img);
  bar.appendChild(home);

  const trail = document.createElement("i");
  trail.className = "rule-bar__seg rule-bar__seg--trail";
  trail.setAttribute("aria-hidden", "true");
  bar.appendChild(trail);

  return bar;
}

function navigateWithFade(href) {
  if (prefersReducedMotion()) {
    window.location.href = href;
    return;
  }

  document.documentElement.classList.add("is-leaving");
  document.documentElement.classList.remove("is-ready");

  window.setTimeout(() => {
    window.location.href = href;
  }, 550);
}

function initPageFade() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("is-ready");
    });
  });

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) {
      return;
    }

    // Landing nav links use their own transition
    if (link.hasAttribute("data-nav-link")) return;

    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigateWithFade(href);
    });
  });
}

function initLandingTransition() {
  const landing = document.querySelector("[data-landing]");
  const hero = document.querySelector(".landing__hero");
  const links = document.querySelectorAll("[data-nav-link]");

  if (!landing || !hero || links.length === 0) return;

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (landing.classList.contains("is-transitioning")) return;

      const href = link.getAttribute("href");
      const word = link.textContent.trim().replace(/\s+/g, "");

      if (prefersReducedMotion()) {
        window.location.href = href;
        return;
      }

      landing.classList.add("is-transitioning");

      const wrap = document.createElement("div");
      wrap.className = "landing__transition-bar";
      const bar = buildRuleBar(word);
      wrap.appendChild(bar);
      hero.appendChild(wrap);

      requestAnimationFrame(() => {
        wrap.classList.add("is-visible");
        requestAnimationFrame(() => {
          bar.classList.add("is-drawn");
        });
      });

      window.setTimeout(() => {
        document.documentElement.classList.add("is-leaving");
        document.documentElement.classList.remove("is-ready");
      }, 900);

      window.setTimeout(() => {
        window.location.href = href;
      }, 1450);
    });
  });
}

function initStickyHeader() {
  const header = document.querySelector("[data-sticky-header]");
  const spacer = document.querySelector("[data-subpage-spacer]");
  if (!header || !spacer) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      header.classList.toggle("is-stuck", !entry.isIntersecting);
    },
    { threshold: 0 }
  );

  observer.observe(spacer);
}

document.addEventListener("DOMContentLoaded", () => {
  initPageFade();
  initLandingTransition();
  initStickyHeader();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    document.documentElement.classList.remove("is-leaving");
    document.documentElement.classList.add("is-ready");
  }
});
