function mediumLine(project) {
  return String(project.medium || "")
    .split(/\s*\/\s*/)
    .map((line) => line.trim())
    .filter((line) => line && line !== String(project.year))
    .join(", ");
}

function renderSheet(project, onClose) {
  const root = document.createElement("article");
  root.className = "sheet";

  const head = document.createElement("header");
  head.className = "sheet__head";

  const back = document.createElement("a");
  back.className = "sheet__back";
  back.href = "index.html";
  back.textContent = "← work";
  back.addEventListener("click", (event) => {
    if (!onClose) return;
    event.preventDefault();
    onClose();
  });

  const info = document.createElement("div");
  info.className = "sheet__info";

  const titleLine = document.createElement("div");
  titleLine.className = "sheet__titleline";

  const title = document.createElement("h1");
  title.textContent = project.title;
  titleLine.appendChild(title);

  const asideBits = [];
  if (project.year) asideBits.push(String(project.year));
  const medium = mediumLine(project);
  if (medium) asideBits.push(medium);
  if (asideBits.length) {
    const aside = document.createElement("p");
    aside.className = "sheet__aside";
    aside.textContent = asideBits.join(" ");
    titleLine.appendChild(aside);
  }

  info.appendChild(titleLine);

  if (project.text) {
    const caption = document.createElement("div");
    caption.className = "sheet__caption";
    project.text.split(/\n\s*\n/).forEach((paragraph) => {
      const block = document.createElement("p");
      const continuous = paragraph.replace(/\s*\n\s*/g, " ").trim();
      if (!continuous) return;
      appendText(block, continuous);
      caption.appendChild(block);
    });
    info.appendChild(caption);
  }

  head.append(back, info);

  const gallery = document.createElement("div");
  gallery.className = "sheet__gallery";
  const preview = document.createElement("div");
  preview.className = "sheet__preview";
  const thumbs = document.createElement("div");
  thumbs.className = "sheet__thumbs";
  gallery.append(preview, thumbs);

  const media = project.media;
  let index = 0;
  const buttons = [];

  function show(next) {
    if (!media.length) return;
    index = (next + media.length) % media.length;
    preview.replaceChildren(createMedia(media[index], project.title));
    buttons.forEach((button, buttonIndex) => {
      const on = buttonIndex === index;
      button.classList.toggle("is-on", on);
      if (on) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  media.forEach((item, itemIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${project.title}, image ${itemIndex + 1}`);
    if (item.kind === "video" && vimeoPlayerURL(item.src)) {
      button.appendChild(vimeoStill(item.src));
    } else if (item.kind === "video") {
      const video = document.createElement("video");
      video.src = mediaURL(item.src);
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      button.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = mediaURL(item.src);
      image.alt = "";
      image.draggable = false;
      button.appendChild(image);
    }
    button.addEventListener("click", () => show(itemIndex));
    buttons.push(button);
    thumbs.appendChild(button);
  });

  if (media.length < 2) thumbs.hidden = true;
  show(0);

  root.append(head, gallery);
  return root;
}

function presentSheet(sheet) {
  closeSheet(true);
  document.body.appendChild(sheet);
  document.body.classList.add("is-sheet");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => sheet.classList.add("is-open"));
  });
}

function openSheet(project) {
  presentSheet(renderSheet(project, () => closeSheet(false)));
}

function closeSheet(immediate) {
  const sheet = document.querySelector(".sheet:not(.sheet--page)");
  if (!sheet) return;
  document.body.classList.remove("is-sheet");
  if (immediate) {
    sheet.remove();
    return;
  }
  sheet.classList.remove("is-open");
  const remove = () => {
    if (sheet.isConnected) sheet.remove();
  };
  sheet.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 900);
}

function initProject() {
  if (document.body.dataset.page !== "project") return;

  const name = new URLSearchParams(window.location.search).get("p");
  const project = PROJECTS.find((item) => item.id === name);
  const stage = document.querySelector("[data-stage]");

  if (!name || !project || !stage) {
    window.location.replace("index.html");
    return;
  }

  document.title = `${project.title} — yuchen shi`;
  const sheet = renderSheet(project);
  sheet.classList.add("sheet--page", "is-open");
  stage.appendChild(sheet);
}

document.addEventListener("DOMContentLoaded", initProject);
