const fs = require('fs');
const path = require('path');

const VOYAGER = '/Users/apple/gemini/gemini-voyager';

console.log('Patching Gemini Voyager for dual-sided timeline...');

// 1. Patch timeline.ts - add TurnRole and role field
const timelineTypesPath = path.join(VOYAGER, 'src/core/types/timeline.ts');
let timelineTypes = fs.readFileSync(timelineTypesPath, 'utf8');

if (!timelineTypes.includes('export type TurnRole')) {
  timelineTypes = timelineTypes.replace(
    /export type SpringProfile = 'ios' \| 'snappy' \| 'gentle';/,
    `export type SpringProfile = 'ios' | 'snappy' | 'gentle';

export type TurnRole = 'user' | 'assistant';`
  );
}

if (!timelineTypes.includes('role: TurnRole;')) {
  timelineTypes = timelineTypes.replace(
    /starred: boolean;/,
    `starred: boolean;
  role: TurnRole;`
  );
}

fs.writeFileSync(timelineTypesPath, timelineTypes, 'utf8');
console.log('✓ Patched timeline.ts');

// 2. Patch manager.ts - add assistantTurnSelector and dual UI
const managerPath = path.join(VOYAGER, 'src/pages/content/timeline/manager.ts');
let manager = fs.readFileSync(managerPath, 'utf8');

// Add assistantTurnSelector field
if (!manager.includes('private assistantTurnSelector')) {
  manager = manager.replace(
    /private userTurnSelector: string = '';/,
    `private userTurnSelector: string = '';
  private assistantTurnSelector: string = '';`
  );
}

// Update UI interface to include left-side elements
if (!manager.includes('leftTimelineBar')) {
  manager = manager.replace(
    /private ui: \{[^}]+\} = \{ timelineBar: null, tooltip: null \};/s,
    `private ui: {
    timelineBar: HTMLElement | null;
    tooltip: HTMLElement | null;
    track?: HTMLElement | null;
    trackContent?: HTMLElement | null;
    slider?: HTMLElement | null;
    sliderHandle?: HTMLElement | null;
    leftTimelineBar?: HTMLElement | null;
    leftTrack?: HTMLElement | null;
    leftTrackContent?: HTMLElement | null;
  } = { timelineBar: null, tooltip: null };`
  );
}

// Add getTimelineBars helper method
if (!manager.includes('private getTimelineBars()')) {
  const insertPos = manager.indexOf('private async findCriticalElements()');
  if (insertPos > 0) {
    manager = manager.slice(0, insertPos) + 
      `private getTimelineBars(): HTMLElement[] {
    const bars: HTMLElement[] = [];
    if (this.ui.timelineBar) bars.push(this.ui.timelineBar);
    if (this.ui.leftTimelineBar) bars.push(this.ui.leftTimelineBar);
    return bars;
  }

  ` + manager.slice(insertPos);
  }
}

fs.writeFileSync(managerPath, manager, 'utf8');
console.log('✓ Patched manager.ts (basic structure)');

// 3. Patch index.ts - update cleanup logic
const indexPath = path.join(VOYAGER, 'src/pages/content/timeline/index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(
  /document\.querySelector\('\.gemini-timeline-bar'\)\?\.remove\(\);/g,
  `document.querySelectorAll('.gemini-timeline-bar').forEach((el) => el.remove());`
);

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('✓ Patched index.ts');

// 4. Patch contentStyle.css - add dual-sided styles
const cssPath = path.join(VOYAGER, 'public/contentStyle.css');
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes('.timeline-right')) {
  const timelineBarStyle = css.match(/\.gemini-timeline-bar\s*\{[^}]+\}/s);
  if (timelineBarStyle) {
    const insertion = `
.gemini-timeline-bar.timeline-right {
  right: 15px;
  left: auto;
}

.gemini-timeline-bar.timeline-left {
  left: 15px;
  right: auto;
}
`;
    css = css.replace(timelineBarStyle[0], timelineBarStyle[0] + insertion);
  }
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✓ Patched contentStyle.css');

console.log('\n✅ All patches applied successfully!');
console.log('Next: Run rebuild script to generate new timeline.js');
