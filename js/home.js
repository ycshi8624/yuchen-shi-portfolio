const WORDS = [
  { category: "editorial", at: [22, 16] },
  { category: "painting", at: [8, 34] },
  { category: "merchandise", at: [0, 66] },
  { category: "art direction", at: [32, 48] },
  { category: "architecture", at: [38, 84] },
  { category: "branding", at: [58, 18] },
  { category: "3d", at: [62, 44] },
  { category: "coding", at: [70, 66] },
];

const SLOTS = [
  { category: "editorial", at: [1, 5], w: 21.6 },
  { category: "art direction", at: [40, 12], w: 17.28, chip: "sw", color: "#f0761a" },
  { category: "3d", at: [72, 34], w: 24.48, chip: "nw", color: "#3b82f6" },
  { category: "painting", at: [10, 46], w: 20.16 },
  { category: "architecture", at: [42, 58], w: 18.72, chip: "ne", color: "#f0c400" },
  { category: "coding", at: [74, 72], w: 20.16, chip: "sw", color: "#3da86a" },
];

const MARKS = [
  { at: [32, 2], color: "#ef4b3a" },
  { at: [94, 18], color: "#7c5cdb" },
  { at: [6, 42], color: "#6b5344" },
  { at: [28, 70], color: "#f0a0c8" },
  { at: [16, 90], color: "#7ec8f0" },
];

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function fileName(src) {
  return src.split("/").pop().toLowerCase();
}

function isCoverFile(src) {
  return fileName(src).startsWith("cover.");
}

function isLooseFile(src) {
  return src.split("/").length <= 3;
}

function homepageMedia(project) {
  const covers = project.media.filter((item) => isCoverFile(item.src));
  if (covers.length) return covers.find((item) => item.kind === "image") || covers[0];
  const loose = project.media.filter((item) => isLooseFile(item.src));
  if (!loose.length) return null;
  return loose.find((item) => item.kind === "image") || loose[0];
}

function thumbMedia(project) {
  return homepageMedia(project) || project.media.find((item) => item.kind === "image") || project.media[0] || null;
}

function shortTitle(title) {
  const quoted = String(title).match(/[“"]([^”"]+)[”"]/);
  if (quoted) return quoted[1];
  return String(title)
    .replace(/^graphic design & photography for\s+/i, "")
    .replace(/^editing & cinematography for\s+/i, "")
    .replace(/^digital typesetting for\s+/i, "")
    .replace(/^typesetting for\s+/i, "")
    .replace(/^cover design for\s+/i, "")
    .replace(/^collateral material for\s+/i, "");
}

function projectsWithCovers() {
  return PROJECTS.filter((project) => homepageMedia(project));
}

function projectForCategory(category, used) {
  const pool = projectsWithCovers().filter((item) => item.categories.includes(category));
  const fresh = shuffle(pool.filter((item) => !used.has(item.id)));
  const project = fresh[0] || pool[0];
  if (project) used.add(project.id);
  return project || null;
}

function place(element, point) {
  element.style.left = `${point[0]}%`;
  element.style.top = `${point[1]}%`;
}

function buildWords(stage) {
  WORDS.forEach((spec) => {
    const word = document.createElement("button");
    word.type = "button";
    word.className = "word";
    word.dataset.cat = spec.category;
    word.textContent = spec.category;
    place(word, spec.at);
    stage.appendChild(word);
  });

  MARKS.forEach((spec) => {
    const mark = document.createElement("span");
    mark.className = "mark-dot";
    mark.style.background = spec.color;
    mark.setAttribute("aria-hidden", "true");
    place(mark, spec.at);
    stage.appendChild(mark);
  });
}

function thumbElement(project, spec, category) {
  const link = document.createElement("a");
  link.className = "thumb";
  link.href = projectHref(project.id);
  link.dataset.id = project.id;
  link.setAttribute("aria-label", project.title);
  link.style.setProperty("--w", `${spec.w}%`);
  place(link, spec.at);

  if (spec.chip) {
    const chip = document.createElement("span");
    chip.className = `chip chip--${spec.chip}`;
    chip.style.background = spec.color;
    chip.setAttribute("aria-hidden", "true");
    link.appendChild(chip);
  }

  const label = document.createElement("span");
  label.className = "thumb__label";
  label.textContent = shortTitle(project.title);
  link.appendChild(label);

  const cover = homepageMedia(project);
  if (!cover) return link;
  if (cover.kind === "video" && vimeoPlayerURL(cover.src)) {
    link.appendChild(vimeoStill(cover.src));
  } else if (cover.kind === "video") {
    const video = document.createElement("video");
    video.src = mediaURL(cover.src);
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-hidden", "true");
    link.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.src = mediaURL(cover.src);
    image.alt = "";
    image.draggable = false;
    link.appendChild(image);
  }

  return link;
}

let renderToken = 0;

function renderImages(stage, projects, category) {
  const token = ++renderToken;
  const previous = [...stage.querySelectorAll(".thumb")];
  previous.forEach((node) => node.classList.add("is-out"));

  window.setTimeout(() => {
    if (token !== renderToken) return;
    previous.forEach((node) => node.remove());
    projects.slice(0, SLOTS.length).forEach((project, index) => {
      const spec = SLOTS[index];
      const link = thumbElement(project, spec, category || spec.category);
      stage.appendChild(link);
      requestAnimationFrame(() => link.classList.add("is-in"));
    });
    requestAnimationFrame(() => {
      separateFromWords(stage);
      stage.querySelectorAll(".thumb img").forEach((image) => {
        if (!image.complete) image.addEventListener("load", () => separateFromWords(stage), { once: true });
      });
    });
  }, previous.length ? 420 : 0);
}

function bounds(el) {
  const rect = el.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  el.querySelectorAll(".chip").forEach((chip) => {
    const chipRect = chip.getBoundingClientRect();
    left = Math.min(left, chipRect.left);
    top = Math.min(top, chipRect.top);
    right = Math.max(right, chipRect.right);
    bottom = Math.max(bottom, chipRect.bottom);
  });
  return { left, top, right, bottom };
}

function hitsWord(box, words, gap) {
  return words.find((word) => {
    const wordRect = word.getBoundingClientRect();
    return box.left < wordRect.right + gap
      && box.right > wordRect.left - gap
      && box.top < wordRect.bottom + gap
      && box.bottom > wordRect.top - gap;
  });
}

function separateFromWords(stage) {
  const stageRect = stage.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;
  const words = [...stage.querySelectorAll(".word")].filter(
    (word) => parseFloat(getComputedStyle(word).opacity) > 0.4
  );
  const gap = 10;

  stage.querySelectorAll(".thumb, .mark-dot").forEach((el) => {
    for (let pass = 0; pass < 8; pass += 1) {
      let moved = false;
      for (let step = 0; step < 14; step += 1) {
        const box = bounds(el);
        const hit = hitsWord(box, words, gap);
        if (!hit) return;
        const wordRect = hit.getBoundingClientRect();
        const overlapX = Math.min(box.right, wordRect.right + gap) - Math.max(box.left, wordRect.left - gap);
        const overlapY = Math.min(box.bottom, wordRect.bottom + gap) - Math.max(box.top, wordRect.top - gap);
        const before = `${el.style.left}|${el.style.top}`;
        let left = parseFloat(el.style.left) || 0;
        let top = parseFloat(el.style.top) || 0;
        if (overlapY <= overlapX) {
          const dir = (box.top + box.bottom) / 2 < (wordRect.top + wordRect.bottom) / 2 ? -1 : 1;
          top += dir * ((overlapY + 6) / stageRect.height) * 100;
        } else {
          const dir = (box.left + box.right) / 2 < (wordRect.left + wordRect.right) / 2 ? -1 : 1;
          left += dir * ((overlapX + 6) / stageRect.width) * 100;
        }
        const maxLeft = Math.max(0, 100 - (el.offsetWidth / stageRect.width) * 100);
        const maxTop = Math.max(0, 100 - (el.offsetHeight / stageRect.height) * 100);
        el.style.left = `${Math.min(maxLeft, Math.max(0, left))}%`;
        el.style.top = `${Math.min(maxTop, Math.max(0, top))}%`;
        moved = `${el.style.left}|${el.style.top}` !== before;
        if (!moved) break;
      }
      if (!el.classList.contains("thumb") || !hitsWord(bounds(el), words, gap)) return;
      const width = parseFloat(getComputedStyle(el).getPropertyValue("--w")) || parseFloat(el.style.getPropertyValue("--w")) || 16;
      el.style.setProperty("--w", `${Math.max(9, width * 0.86)}%`);
    }
  });
}

function initHome() {
  const stage = document.querySelector("[data-field]");
  if (!stage || typeof PROJECTS === "undefined") return;

  buildWords(stage);

  const used = new Set();
  const mixed = SLOTS.map((spec) => projectForCategory(spec.category, used)).filter(Boolean);
  let current = null;

  function show(category) {
    if (category === current) return;
    current = category;
    stage.classList.toggle("is-filtering", Boolean(category));
    stage.querySelectorAll(".word").forEach((word) => {
      word.classList.toggle("is-hot", !category || word.dataset.cat === category);
    });
    const projects = category
      ? projectsSorted().filter((project) => project.categories.includes(category) && homepageMedia(project))
      : mixed;
    renderImages(stage, projects, category);
  }

  show("");

  document.addEventListener("click", (event) => {
    if (event.target.closest(".sheet")) return;
    const word = event.target.closest(".word");
    if (word) {
      show(word.dataset.cat);
      return;
    }
    if (event.target.closest(".thumb, .corner, .intro__nav, a, button")) return;
    show("");
  });

  stage.addEventListener("click", (event) => {
    const thumb = event.target.closest(".thumb");
    if (!thumb) return;
    event.preventDefault();
    event.stopPropagation();
    if (!current) return;
    const project = PROJECTS.find((item) => item.id === thumb.dataset.id);
    if (project) openSheet(project);
  });

  window.addEventListener("resize", () => separateFromWords(stage));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
  });

  const infoButton = document.querySelector("[data-info]");
  const indexButton = document.querySelector("[data-index]");
  if (infoButton) infoButton.addEventListener("click", openInfo);
  if (indexButton) indexButton.addEventListener("click", openIndex);
}

function sheetBack(onClose) {
  const back = document.createElement("a");
  back.className = "sheet__back";
  back.href = "index.html";
  back.textContent = "← work";
  back.addEventListener("click", (event) => {
    event.preventDefault();
    onClose();
  });
  return back;
}

function roleLine(name, year) {
  const line = document.createElement("p");
  line.className = "dossier__role";
  const label = document.createElement("span");
  label.className = "dossier__name";
  label.textContent = name;
  line.appendChild(label);
  if (year) {
    const when = document.createElement("span");
    when.textContent = year;
    line.appendChild(when);
  }
  return line;
}

function note(text) {
  const line = document.createElement("p");
  line.className = "dossier__note";
  line.textContent = text;
  return line;
}

function heading(text) {
  const line = document.createElement("h2");
  line.textContent = text;
  return line;
}

function skillGroup(text) {
  const line = document.createElement("p");
  line.className = "dossier__skill dossier__name";
  line.textContent = text;
  return line;
}

function skillLine(text) {
  const line = document.createElement("p");
  line.className = "dossier__skill";
  line.textContent = text;
  return line;
}

function openInfo() {
  const root = document.createElement("article");
  root.className = "sheet";
  const head = document.createElement("header");
  head.className = "sheet__head";
  const copy = document.createElement("div");
  copy.className = "sheet__info dossier";

  copy.append(
    note("yuchen shi is an artist and designer based in princeton, working across image-making, visual identity, publication, digital media, and space. her practice moves between art, design, and technology, using research, experimentation, and a sense of serious play to explore how ideas shift across mediums."),
    heading("education"),
    roleLine("princeton university — princeton, nj", "2024–2028"),
    note("a.b. candidate, art & archaeology (practice of art)"),
    note("minors: computer science; architecture & engineering"),
    roleLine("united world college of south east asia, east campus — singapore", "2020–2024"),
    heading("experience"),
    roleLine("associate director — tigergear, princeton university student agencies", "2024–present"),
    note("design lead for princeton’s largest student-run apparel agency; 40+ concepts, 31,000+ units, $50k+ order value."),
    roleLine("creative technology & visualization associate — princeton research computing", "2025–present"),
    note("created the visual identity and brand system for princeton’s visualization lab; produce 3d, motion, and interactive work for research and exhibitions."),
    roleLine("communications & design intern — princeton university art museum", "summer 2026"),
    note("designed print, digital, social, exhibition, and wayfinding graphics; developed 3d models and prototyped exhibition display systems."),
    roleLine("branding team lead — tigerlaunch, princeton entrepreneurship club", "2024–present"),
    note("led visual identity refresh and campaign design; generated 300k+ social views across a four-country startup competition."),
    roleLine("communications intern — exelauno llc", "2024–2025"),
    note("designed digital content and developed editorial/social strategy for an xr and entertainment technology consultancy."),
    heading("skills"),
    skillGroup("design"),
    skillLine("illustrator, indesign, photoshop, after effects, premiere pro, figma"),
    skillGroup("3d / creative technology"),
    skillLine("cinema 4d, blender, touchdesigner, processing"),
    skillGroup("web / programming"),
    skillLine("html/css/javascript"),
    heading("selected exhibitions & publications"),
    roleLine("time space existence, venice architecture biennale", "2025"),
    note("the princeton puzzle, european cultural centre"),
    roleLine("official catalog, time space existence", "2025"),
    note("exhibition graphics & editorial work"),
    roleLine("workbook, princeton university school of architecture", "2025"),
    roleLine("genius loci, university art biennial", "2025"),
    note("graphic design; program awarded best institutional proposal")
  );

  head.append(sheetBack(() => closeSheet(false)), copy);
  root.appendChild(head);
  presentSheet(root);
}

function openIndex() {
  const root = document.createElement("article");
  root.className = "sheet";
  const head = document.createElement("header");
  head.className = "sheet__head sheet__head--index";
  head.appendChild(sheetBack(() => closeSheet(false)));

  const grid = document.createElement("div");
  grid.className = "index-grid";

  projectsSorted().forEach((project) => {
    const media = thumbMedia(project);
    if (!media) return;
    const link = document.createElement("a");
    link.href = projectHref(project.id);
    link.setAttribute("aria-label", project.title);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openSheet(project);
    });

    if (media.kind === "video" && vimeoPlayerURL(media.src)) {
      link.appendChild(vimeoStill(media.src));
    } else if (media.kind === "video") {
      const video = document.createElement("video");
      video.src = mediaURL(media.src);
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      link.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = mediaURL(media.src);
      image.alt = "";
      image.draggable = false;
      link.appendChild(image);
    }
    grid.appendChild(link);
  });

  root.append(head, grid);
  presentSheet(root);
}

document.addEventListener("DOMContentLoaded", initHome);
