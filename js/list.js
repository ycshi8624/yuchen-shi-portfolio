function initList() {
  const contents = document.querySelector("[data-contents]");
  const nav = document.querySelector("[data-index]");
  if (!contents || !nav) return;

  renderIndex(nav);
  projectsSorted().forEach((project) => {
    const link = document.createElement("a");
    link.href = projectHref(project.id);

    const title = document.createElement("strong");
    title.textContent = project.title;

    const meta = document.createElement("span");
    meta.textContent = `${project.categories.join(", ")}\n${project.year}`;

    link.append(title, meta);
    contents.appendChild(link);
  });
}

document.addEventListener("DOMContentLoaded", initList);
