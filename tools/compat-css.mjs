// Down-levels the Tailwind v4 output so it renders on older Samsung Tizen
// web engines (Tizen 5.5 - 8, Chromium 69 - 108).
//
// Tailwind v4 emits native CSS nesting (`&:focus`, nested `@media`),
// media range syntax (`width >= 48rem`), oklch()/color-mix() colors and
// cascade layers. Older engines silently drop those rules, which breaks
// every `md:` / `focus:` utility and makes some screens overflow the TV.
//
// Usage (from repo root, needs `npm i lightningcss postcss` somewhere on NODE_PATH):
//   node tools/compat-css.mjs tools/tailwind.src.css css/tailwind.css

import fs from 'node:fs';
import { transform } from 'lightningcss';
import postcss from 'postcss';

const [, , input = 'tools/tailwind.src.css', output = 'css/tailwind.css'] = process.argv;

// Chrome 69 ~= Tizen 5.5 (2020 TVs).
const targets = { chrome: 69 << 16 };

const src = fs.readFileSync(input);
const { code } = transform({
    filename: input,
    code: src,
    minify: false,
    targets,
    drafts: { customMedia: true },
    errorRecovery: true,
});

// Unwrap @layer blocks (unsupported before Chromium 99) while keeping
// their declared order: properties, theme, base, components, utilities.
const root = postcss.parse(code.toString());
const order = ['properties', 'theme', 'base', 'components', 'utilities'];
const buckets = new Map(order.map((n) => [n, []]));
const rest = [];

root.each((node) => {
    if (node.type === 'atrule' && node.name === 'layer') {
        if (!node.nodes) return; // `@layer a, b;` statement
        const name = node.params.trim();
        if (!buckets.has(name)) buckets.set(name, []);
        node.each((child) => { buckets.get(name).push(child.clone()); });
        return;
    }
    rest.push(node.clone());
});

const out = postcss.root();
for (const nodes of buckets.values()) nodes.forEach((n) => out.append(n));
rest.forEach((n) => out.append(n));

// `:where(...)` / `:is(...)` need Chromium 88+. Unwrap the simple (comma-free)
// cases such as `.space-y-4` and `group-*` variants so they still apply.
out.walkRules((rule) => {
    rule.selector = rule.selector
        .replace(/:where\(([^(),]*(?:\([^()]*\))?[^(),]*)\)/g, (m, inner) => inner.trim())
        // `.group-focus\:x:is(.group:focus *)` -> `.group:focus .group-focus\:x`
        .replace(/^(\S+):is\(([^(),]+) \*\)$/, (m, self, ancestor) => `${ancestor} ${self}`);
});

// `inset` shorthand needs Chromium 87+; modal backdrops use `inset-0`.
const hasTopLevelSpace = (v) => {
    let depth = 0;
    for (const ch of v.trim()) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (/\s/.test(ch) && depth === 0) return true;
    }
    return false;
};
out.walkDecls('inset', (d) => {
    if (hasTopLevelSpace(d.value)) return; // only single-value form
    ['top', 'right', 'bottom', 'left'].forEach((p) => d.cloneBefore({ prop: p }));
});

// The individual `translate` / `scale` / `rotate` properties need Chromium 104+.
// Add an equivalent `transform` for engines that do not support them.
const pct = (v) => (/%$/.test(v.trim()) ? String(parseFloat(v) / 100) : v.trim());
out.walkRules((rule) => {
    const decl = (prop) => rule.nodes.find((n) => n.type === 'decl' && n.prop === prop);
    let transformValue = null;
    if (decl('translate')) {
        transformValue = 'translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0))';
    } else if (decl('scale')) {
        const sx = decl('--tw-scale-x'), sy = decl('--tw-scale-y');
        if (sx && sy) transformValue = `scale(${pct(sx.value)}, ${pct(sy.value)})`;
    } else if (decl('rotate')) {
        transformValue = `rotate(${decl('rotate').value})`;
    }
    if (!transformValue) return;
    const fallback = postcss.atRule({ name: 'supports', params: 'not (translate: 0)' });
    fallback.append(postcss.rule({ selector: rule.selector }).append({ prop: 'transform', value: transformValue }));
    let anchor = rule;
    while (anchor.parent && anchor.parent.type !== 'root') anchor = anchor.parent;
    anchor.after(fallback);
});

fs.writeFileSync(output, out.toString());
console.log(`wrote ${output}`);
