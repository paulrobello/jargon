import { activeTickIndex, DENSITY_LABELS } from './density';
import { jargonate } from './jargonate';
import { loadJargonData } from './loadData';

const data = loadJargonData();

function required<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`PAR Jargonator: missing required element ${selector}`);
  return el;
}

const form = required<HTMLFormElement>('#jargon-form');
const input = required<HTMLTextAreaElement>('#in');
const output = required<HTMLTextAreaElement>('#out');
const densitySlider = required<HTMLInputElement>('#level');
const tickRow = required<HTMLElement>('#level-ticks');
const stampButton = required<HTMLButtonElement>('#submit');

const stampMark = document.querySelector<HTMLElement>('#stamp-mark');
const copyButton = document.querySelector<HTMLButtonElement>('#copy');
const statusEl = document.querySelector<HTMLElement>('#status');
const memoDate = document.querySelector<HTMLTimeElement>('#memo-date');

function renderTicks(): void {
  tickRow.replaceChildren(
    ...DENSITY_LABELS.map(([, label]) => {
      const span = document.createElement('span');
      span.className = 'level-tick';
      span.textContent = label;
      return span;
    }),
  );
}

function updateActiveTick(): void {
  const value = Number(densitySlider.value);
  const index = activeTickIndex(value);
  const ticks = Array.from(tickRow.querySelectorAll<HTMLElement>('.level-tick'));
  ticks.forEach((tick, i) => {
    tick.classList.toggle('level-tick--active', i === index);
  });
}

function replayAnimation(el: HTMLElement | null, className: string): void {
  if (!el) return;
  el.classList.remove(className);
  // Force reflow so the animation restarts on repeated triggers.
  void el.offsetWidth;
  el.classList.add(className);
}

function runJargonate(): void {
  // The slider reads left-to-right as "more jargon", but the substitution
  // roll fires more often at *lower* level values, so invert here.
  const density = Number(densitySlider.value);
  const level = 100 - density;

  output.value = jargonate(input.value, data, level);
  if (statusEl) statusEl.textContent = 'Approved copy updated.';

  replayAnimation(stampMark, 'stamp-mark--visible');
  replayAnimation(stampButton, 'stamp-button--pressed');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  runJargonate();
});

densitySlider.addEventListener('input', updateActiveTick);

for (const chip of document.querySelectorAll<HTMLButtonElement>('.chip')) {
  chip.addEventListener('click', () => {
    input.value = chip.dataset.example ?? '';
    input.focus();
  });
}

if (copyButton) {
  copyButton.addEventListener('click', () => {
    if (!output.value) return;
    const originalLabel = 'Copy to Clipboard';
    navigator.clipboard
      .writeText(output.value)
      .then(() => {
        copyButton.textContent = 'Copied';
      })
      .catch(() => {
        copyButton.textContent = 'Copy Failed';
      })
      .finally(() => {
        setTimeout(() => {
          copyButton.textContent = originalLabel;
        }, 1500);
      });
  });
}

if (memoDate) {
  const today = new Date();
  memoDate.textContent = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  memoDate.dateTime = today.toISOString().slice(0, 10);
}

renderTicks();
updateActiveTick();
input.value = 'We should finish this soon.';
runJargonate();
