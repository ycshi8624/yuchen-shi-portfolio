import fs from "fs";
import path from "path";

const root = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), "..");
const source = path.join(root, "images&txt");
const CATEGORIES = [
  "editorial",
  "branding",
  "art direction",
  "coding",
  "3d",
  "painting",
  "architecture",
  "merchandise",
];

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const IMAGE = /\.(jpe?g|png|gif|webp|svg)$/i;

function parseLabel(filename) {
  const base = filename.replace(/\.[^.]+$/i, "").trim();
  const parts = base.split(/\s*:\s*/).map((part) => part.trim()).filter(Boolean);
  const isYear = (value) => /^\d{4}(?:\s*[-–]\s*\d{4})?$/.test(value);
  const yearIndex = parts.findIndex(isYear);
  let title = base;
  let year = "";
  let medium = "";

  if (parts.length === 1) {
    const match = parts[0].match(/^(.*?)(?:\s+)(\d{4}(?:\s*[-–]\s*\d{4}))\s*$/);
    if (match) {
      title = match[1];
      year = match[2];
    }
  } else if (yearIndex >= 0) {
    year = parts[yearIndex];
    const before = parts.slice(0, yearIndex);
    const after = parts.slice(yearIndex + 1);
    title = before[0] || after[0] || base;
    const mediumParts = before.length > 1 ? before.slice(1).concat(after) : after;
    medium = mediumParts.join(" / ");
  } else {
    title = parts[0];
    medium = parts.slice(1).join(" / ");
  }

  title = title.replace(/^["“]([\s\S]*)["”]$/, "$1").trim().normalize("NFC");
  year = year.replace(/\s+/g, "").replace("-", "–");
  return { title, year, medium };
}

function projectKey(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rtfToText(rtf) {
  let text = rtf.replace(/\r\n/g, "\n");
  const pard = text.lastIndexOf("\\pard");
  if (pard >= 0) text = text.slice(pard);
  text = text.replace(/\\'92/g, "’").replace(/\\'93/g, "“").replace(/\\'94/g, "”").replace(/\\'97/g, "—").replace(/\\'96/g, "–");
  text = text.replace(/\\u(-?\d+)\??/g, (_, n) => {
    const code = Number(n);
    return String.fromCodePoint(code < 0 ? code + 65536 : code);
  });
  text = text.replace(/\\'([0-9a-f]{2})/gi, (_, hex) => Buffer.from([parseInt(hex, 16)]).toString("latin1"));
  text = text.replace(/\\-/g, "");
  text = text.replace(/\\\n/g, "\n\n");
  text = text.replace(/\\pard[\w-]* ?/gi, "");
  text = text.replace(/\\par(?![a-z])/gi, "\n\n");
  text = text.replace(/\\[a-z*]+-?\d* ?/gi, "");
  text = text.replace(/[{}]/g, "");
  const lines = text.split("\n").map((line) => line.trim());
  const paragraphs = [];
  let current = [];
  let started = false;
  const push = () => {
    if (!current.length) return;
    paragraphs.push(current.join(" ").replace(/ +([,.;:!?])/g, "$1"));
    current = [];
  };
  for (const line of lines) {
    if (!line) {
      if (started) push();
      continue;
    }
    if (!started) {
      if (/[a-z]{4,}/.test(line)) started = true;
      else continue;
    }
    current.push(line);
  }
  push();
  return paragraphs.join("\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function mediaRank(name) {
  const base = name.replace(/\.[^.]+$/i, "");
  if (/^cover$/i.test(base)) return [0, 0, base.toLowerCase()];
  const number = base.match(/^(\d+)/);
  if (number) return [1, Number(number[1]), base.toLowerCase()];
  return [2, 9999, base.toLowerCase()];
}

function listMedia(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (IMAGE.test(entry.name) || VIDEO.test(entry.name)))
    .sort((a, b) => {
      const [ar, an, as] = mediaRank(a.name);
      const [br, bn, bs] = mediaRank(b.name);
      return ar - br || an - bn || as.localeCompare(bs);
    })
    .map((entry) => ({
      src: path.relative(root, path.join(dir, entry.name)).split(path.sep).join("/"),
      kind: VIDEO.test(entry.name) ? "video" : "image",
      name: entry.name,
    }));
}

const projects = new Map();

function ensure(title) {
  const key = projectKey(title);
  if (!projects.has(key)) {
    projects.set(key, {
      id: key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: title.toLowerCase(),
      year: "",
      medium: "",
      categories: [],
      text: "",
      media: [],
    });
  }
  return projects.get(key);
}

function addMedia(project, files) {
  const seen = new Set(project.media.map((item) => path.basename(item.src).toLowerCase()));
  files.forEach((file) => {
    const name = file.name.toLowerCase();
    if (seen.has(name)) return;
    seen.add(name);
    project.media.push({ src: file.src, kind: file.kind });
  });
}

for (const category of CATEGORIES) {
  const dir = path.join(source, category);
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const parsed = parseLabel(entry.name);
      const project = ensure(parsed.title);
      if (parsed.year && !project.year) project.year = parsed.year;
      if (parsed.medium && !project.medium) project.medium = parsed.medium;
      if (!project.categories.includes(category)) project.categories.push(category);
      const files = listMedia(full);
      addMedia(project, files);
      if (!project.year || !project.medium) {
        for (const file of files) {
          const fromFile = parseLabel(file.name);
          if (!project.year && fromFile.year) project.year = fromFile.year;
          if (!project.medium && fromFile.medium) project.medium = fromFile.medium;
        }
      }
      const note = fs.readdirSync(full).find((name) => name.toLowerCase().endsWith(".rtf"));
      if (note) {
        const fromNote = parseLabel(note);
        if (!project.year && fromNote.year) project.year = fromNote.year;
        if (!project.medium && fromNote.medium) project.medium = fromNote.medium;
        const text = rtfToText(fs.readFileSync(path.join(full, note), "utf8"));
        if (text.length > project.text.length) project.text = text;
      }
    } else if (IMAGE.test(entry.name) || VIDEO.test(entry.name)) {
      const parsed = parseLabel(entry.name);
      const project = ensure(parsed.title);
      if (parsed.year && !project.year) project.year = parsed.year;
      if (parsed.medium && !project.medium) project.medium = parsed.medium;
      if (!project.categories.includes(category)) project.categories.push(category);
      addMedia(project, [
        {
          src: path.relative(root, full).split(path.sep).join("/"),
          kind: VIDEO.test(entry.name) ? "video" : "image",
          name: entry.name,
        },
      ]);
    }
  }
}

function absorbCaption(project) {
  if (!project.text) return;
  const lines = project.text.split("\n");
  const match = lines[0].trim().match(/^(.*?)\s*\/\s*(\d{4}(?:\s*[–-]\s*\d{4})?)\s*(?:\/\s*(.*))?$/);
  if (!match) return;
  if (!project.year) project.year = match[2].replace(/\s+/g, "").replace("-", "–");
  if (!project.medium && match[3]) project.medium = match[3].trim();
  const rest = lines.slice(1);
  while (rest.length && !rest[0].trim()) rest.shift();
  const bare = (value) => value.replace(/[“”"]/g, "").trim().toLowerCase();
  if (rest[0] && bare(rest[0]) === project.title) {
    rest.shift();
    while (rest.length && !rest[0].trim()) rest.shift();
  } else if (rest[0]) {
    const quoted = rest[0].match(/^[“"]([^”"]+)[”"]\s*(.*)$/);
    if (quoted && bare(quoted[1]) === project.title) {
      const next = quoted[2].trim();
      if (next) rest[0] = next;
      else rest.shift();
    }
  }
  project.text = rest.join("\n").trim();
}

const list = [...projects.values()].sort((a, b) => a.title.localeCompare(b.title));
list.forEach(absorbCaption);

const output = `const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};\n\nconst PROJECTS = ${JSON.stringify(list, null, 2)};\n`;
fs.writeFileSync(path.join(root, "js/catalog.js"), output);
console.log(list.map((project) => `${project.title} | ${project.year || "—"} | ${project.categories.join(", ")} | ${project.media.length} files | ${project.text ? "text" : "no text"}`).join("\n"));
