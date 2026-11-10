const EXTENSIONS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
const SVG_NS = "http://www.w3.org/2000/svg";

const BIRD_SVG = `
<svg viewBox="0 0 48 32">
  <path class="wing back" d="M20 15 C17 4 10 1 6 3 C11 7 15 11 18 17Z"/>
  <path class="tail" d="M14 17 L2 11 L5 18 L2 24Z"/>
  <ellipse class="body" cx="23" cy="18" rx="12" ry="8"/>
  <circle class="head" cx="34" cy="13" r="6"/>
  <circle class="cheek" cx="35" cy="16" r="1.8"/>
  <path class="beak" d="M39 11.5 L46 13 L39 15Z"/>
  <circle class="eye" cx="36" cy="11.5" r="1.2"/>
  <path class="wing" d="M25 15 C23 3 15 -1 10 1 C16 6 20 11 22 19Z"/>
</svg>`;

let river = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function loadPhoto(img, file, onMissing) {
  let i = 0;
  img.onerror = () => {
    i += 1;
    if (i < EXTENSIONS.length) img.src = `photos/${file}.${EXTENSIONS[i]}`;
    else onMissing();
  };
  img.src = `photos/${file}.${EXTENSIONS[0]}`;
}

function offsetWithin(node, ancestor) {
  let x = 0;
  let y = 0;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y };
}

function renderIntro() {
  document.getElementById("intro-title").textContent = INTRO.title;
  const lines = document.getElementById("intro-lines");
  INTRO.lines.forEach((line, i) => {
    const p = el("p", null, line);
    p.style.animationDelay = `${0.4 + i * 1.1}s`;
    lines.appendChild(p);
  });
  const btn = document.getElementById("start");
  btn.textContent = INTRO.button;
  btn.style.animationDelay = `${0.6 + INTRO.lines.length * 1.1}s`;
  btn.onclick = () => {
    document.getElementById("journey").hidden = false;
    document.getElementById("letter").hidden = false;
    buildRiver();
    observeReveals();
    document.getElementById("journey").scrollIntoView();
  };
}

function renderJourney() {
  const main = document.getElementById("journey");
  let index = 0;
  CHAPTERS.forEach((chapter, ci) => {
    const section = el("section", "chapter");
    const heading = el("div", "chapter-title reveal");
    heading.appendChild(el("span", null, `chapter ${ci + 1}`));
    heading.appendChild(el("h2", null, chapter.title));
    section.appendChild(heading);

    chapter.photos.forEach((photo) => {
      const moment = el("div", `moment reveal ${index % 2 === 0 ? "left" : "right"}`);
      index += 1;
      const frame = el("figure", "polaroid");
      const img = el("img");
      img.alt = photo.caption;
      img.loading = "lazy";
      loadPhoto(img, photo.file, () => {
        img.replaceWith(el("div", "placeholder", `Add photos/${photo.file}.jpg`));
        frame.style.cursor = "default";
        frame.onclick = null;
      });
      frame.appendChild(img);
      frame.appendChild(el("span", "num", `#${Number(photo.file)}`));
      frame.onclick = () => openLightbox(img.src, photo.caption);
      moment.appendChild(frame);
      moment.appendChild(el("p", "caption", photo.caption));
      section.appendChild(moment);
    });
    main.appendChild(section);
  });
}

function createRiverLayer(main) {
  const svg = svgEl("svg", { class: "river", "aria-hidden": "true" });
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: "riverGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#ff9ebb" }));
  grad.appendChild(svgEl("stop", { offset: "50%", "stop-color": "#ff4f81" }));
  grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#ff7aa2" }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  const bank = svgEl("path", { class: "bank" });
  const flow = svgEl("path", { class: "flow" });
  const stops = svgEl("g");
  svg.append(bank, flow, stops);
  main.prepend(svg);

  const bird = el("div", "bird");
  bird.innerHTML = BIRD_SVG;
  main.appendChild(bird);

  return { main, svg, bank, flow, stops, bird, total: 0, points: [], facing: 1 };
}

function buildRiver() {
  const main = document.getElementById("journey");
  if (!river) river = createRiverLayer(main);

  const width = main.clientWidth;
  const height = main.scrollHeight;
  river.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  river.svg.style.height = `${height}px`;

  const points = [{ x: width / 2, y: 0 }];
  main.querySelectorAll(".moment").forEach((moment) => {
    const frame = moment.querySelector(".polaroid");
    const pos = offsetWithin(frame, main);
    const y = pos.y + frame.offsetHeight / 2;
    const x = moment.classList.contains("left")
      ? (pos.x + frame.offsetWidth + width) / 2
      : pos.x / 2;
    points.push({ x, y, stop: true });
  });
  points.push({ x: width / 2, y: height });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const midY = (a.y + b.y) / 2;
    d += ` C ${a.x} ${midY} ${b.x} ${midY} ${b.x} ${b.y}`;
  }
  river.bank.setAttribute("d", d);
  river.flow.setAttribute("d", d);
  river.total = river.flow.getTotalLength();
  river.flow.style.strokeDasharray = `${river.total}`;

  river.stops.replaceChildren();
  river.points = points;
  points.filter((p) => p.stop).forEach((p) => {
    p.node = svgEl("circle", { class: "stop", cx: p.x, cy: p.y, r: 7 });
    river.stops.appendChild(p.node);
  });

  updateRiver();
}

function lengthAtY(targetY) {
  let lo = 0;
  let hi = river.total;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (river.flow.getPointAtLength(mid).y < targetY) lo = mid;
    else hi = mid;
  }
  return lo;
}

function updateRiver() {
  if (!river || !river.total) return;
  const mainTop = river.main.getBoundingClientRect().top + window.scrollY;
  const targetY = window.scrollY + window.innerHeight * 0.55 - mainTop;
  const len = Math.max(0, Math.min(river.total, lengthAtY(targetY)));

  river.flow.style.strokeDashoffset = `${river.total - len}`;

  const p = river.flow.getPointAtLength(len);
  const ahead = river.flow.getPointAtLength(Math.min(river.total, len + 2));
  const dx = ahead.x - p.x;
  const dy = ahead.y - p.y;
  if (Math.abs(dx) > 0.3) river.facing = dx > 0 ? 1 : -1;
  const tilt = Math.min(40, (Math.atan2(dy, Math.abs(dx) || 0.001) * 180) / Math.PI);
  river.bird.style.transform = `translate(${p.x}px, ${p.y}px) scaleX(${river.facing}) rotate(${tilt}deg)`;

  river.points.forEach((pt) => pt.node && pt.node.classList.toggle("lit", pt.y <= p.y + 1));
}

function renderLetter() {
  document.getElementById("letter-title").textContent = LETTER.title;
  const body = document.getElementById("letter-body");
  LETTER.paragraphs.forEach((p) => body.appendChild(el("p", null, p)));
  document.getElementById("letter-closing").textContent = LETTER.closing;
}

function openLightbox(src, caption) {
  const box = document.getElementById("lightbox");
  box.querySelector("img").src = src;
  box.querySelector("p").textContent = caption;
  box.hidden = false;
}

function observeReveals() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("shown");
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((n) => observer.observe(n));
}

function floatingHearts() {
  const layer = el("div", "hearts");
  for (let i = 0; i < 16; i++) {
    const h = el("span", null, "♥");
    h.style.left = `${Math.random() * 100}%`;
    h.style.fontSize = `${10 + Math.random() * 18}px`;
    h.style.animationDuration = `${14 + Math.random() * 16}s`;
    h.style.animationDelay = `${-Math.random() * 20}s`;
    layer.appendChild(h);
  }
  document.body.prepend(layer);
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updateRiver(); ticking = false; });
}, { passive: true });

let resizeTimer;
function scheduleRebuild() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => river && buildRiver(), 150);
}
window.addEventListener("resize", scheduleRebuild);
new ResizeObserver(scheduleRebuild).observe(document.getElementById("journey"));
document.fonts.ready.then(scheduleRebuild);

document.getElementById("lightbox").onclick = (e) => { e.currentTarget.hidden = true; };

renderIntro();
renderJourney();
renderLetter();
floatingHearts();
