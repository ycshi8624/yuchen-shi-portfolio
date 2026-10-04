function mediaURL(src) {
  if (/^https?:\/\//i.test(src)) return src;
  return src.split("/").map(encodeURIComponent).join("/");
}

function vimeoId(src) {
  const match = String(src || "").match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : "";
}

function vimeoPlayerURL(src) {
  const id = vimeoId(src);
  return id ? `https://player.vimeo.com/video/${id}` : "";
}

function vimeoStill(src) {
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  const id = vimeoId(src);
  if (!id) return image;
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`;
  fetch(endpoint)
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data || !data.thumbnail_url) return;
      image.src = data.thumbnail_url;
    })
    .catch(() => {});
  return image;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function groupWorks(list) {
  const groups = [];
  const byName = new Map();
  list.forEach((work) => {
    let group = byName.get(work.project);
    if (!group) {
      group = { project: work.project, works: [] };
      byName.set(work.project, group);
      groups.push(group);
    }
    group.works.push(work);
  });
  groups.forEach((group) => {
    group.works.sort((a, b) => a.index - b.index);
  });
  return groups;
}

function sortedGroups() {
  return projectsSorted();
}

function createMedia(item, title) {
  const name = title || "";
  const player = item.kind === "video" ? vimeoPlayerURL(item.src) : "";
  if (player) {
    const frame = document.createElement("iframe");
    frame.className = "media-embed";
    frame.src = player;
    frame.title = name || "video";
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    frame.setAttribute("frameborder", "0");
    return frame;
  }
  if (item.kind === "video") {
    const video = document.createElement("video");
    video.src = mediaURL(item.src);
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", name);
    return video;
  }
  const img = document.createElement("img");
  img.src = mediaURL(item.src);
  img.alt = name;
  img.loading = "lazy";
  img.decoding = "async";
  img.draggable = false;
  return img;
}

function yearValue(year) {
  const numbers = String(year || "").match(/\d{4}/g);
  return numbers ? Number(numbers[numbers.length - 1]) : 0;
}

function projectsSorted() {
  return [...PROJECTS].sort(
    (a, b) => yearValue(b.year) - yearValue(a.year) || a.title.localeCompare(b.title)
  );
}

function projectHref(id) {
  return `project.html?p=${encodeURIComponent(id)}`;
}

function mediumLines(work) {
  return String(work.medium || "")
    .split(/\s*\/\s*/)
    .map((line) => line.trim())
    .filter((line) => line && line !== String(work.year));
}

function renderIndex(nav, activeSlug) {
  if (!nav) return;
  nav.replaceChildren();

  const label = document.createElement("a");
  label.className = "index-nav__label";
  label.href = "index.html";
  label.textContent = "work";
  nav.appendChild(label);

  projectsSorted().forEach((project) => {
    const link = document.createElement("a");
    link.href = projectHref(project.id);
    link.dataset.slug = project.id;
    link.textContent = project.title;
    if (project.id === activeSlug) link.classList.add("is-current");
    nav.appendChild(link);
  });

  ["about", "contact"].forEach((page) => {
    const link = document.createElement("a");
    link.className = page === "about" ? "index-nav__aside index-nav__gap" : "index-nav__aside";
    link.href = `${page}.html`;
    link.textContent = page;
    if (document.body.dataset.page === page) link.setAttribute("aria-current", "page");
    nav.appendChild(link);
  });
}

function appendText(element, text) {
  text.split(/(https?:\/\/[^\s]+)/g).forEach((part) => {
    if (/^https?:\/\//.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = part;
      element.appendChild(link);
      return;
    }
    element.appendChild(document.createTextNode(part));
  });
}

function renderBlock(project) {
  const article = document.createElement("article");
  article.className = "block";
  article.id = project.id;

  const head = document.createElement("header");
  head.className = "block__meta";

  const left = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "block__title";
  title.textContent = project.title;
  left.appendChild(title);

  const lines = String(project.medium || "")
    .split(/\s*\/\s*/)
    .map((line) => line.trim())
    .filter((line) => line && line !== String(project.year));
  if (lines.length) {
    const note = document.createElement("p");
    note.className = "block__note";
    note.textContent = lines.join("\n");
    left.appendChild(note);
  }

  const right = document.createElement("div");
  const label = document.createElement("p");
  label.className = "block__label";
  label.textContent = project.categories.join("\n");
  right.appendChild(label);

  if (project.year) {
    const year = document.createElement("p");
    year.className = "block__note";
    year.textContent = String(project.year);
    right.appendChild(year);
  }

  head.append(left, right);
  article.appendChild(head);

  if (project.text) {
    const copy = document.createElement("p");
    copy.className = "block__text";
    appendText(copy, project.text);
    article.appendChild(copy);
  }

  project.media.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "block__figure";
    figure.appendChild(createMedia(item, project.title));
    if (project.media.length > 1) {
      const caption = document.createElement("figcaption");
      caption.textContent = `${index + 1} / ${project.media.length}`;
      figure.appendChild(caption);
    }
    article.appendChild(figure);
  });

  return article;
}

function bindScrollSpy() {
  const nav = document.querySelector("[data-index]");
  const links = [...document.querySelectorAll(".index-nav a[data-slug]")];
  const blocks = [...document.querySelectorAll(".col--work .block[id]")];
  if (!nav || !links.length || !blocks.length) return;

  const setCurrent = (slug) => {
    links.forEach((link) => {
      const on = link.dataset.slug === slug;
      link.classList.toggle("is-current", on);
      if (!on) return;
      const top = link.offsetTop;
      const bottom = top + link.offsetHeight;
      if (top < nav.scrollTop) nav.scrollTop = top;
      else if (bottom > nav.scrollTop + nav.clientHeight) {
        nav.scrollTop = bottom - nav.clientHeight;
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setCurrent(visible.target.id);
    },
    { rootMargin: "-8% 0px -55% 0px", threshold: [0.05, 0.2, 0.5] }
  );

  blocks.forEach((block) => observer.observe(block));
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  setCurrent(blocks.some((block) => block.id === hash) ? hash : blocks[0].id);
}
