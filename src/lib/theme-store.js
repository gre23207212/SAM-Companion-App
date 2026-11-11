// Theme + accent + font management. Persists to localStorage and applies
// CSS variables and data attributes to the document root.
export const THEMES = {
    midnight: {
        name: "Midnight",
        description: "Classic deep navy command shell.",
        vars: {
            background: "220 45% 5%", foreground: "210 25% 96%", card: "220 38% 9%",
            popover: "220 38% 11%", secondary: "220 30% 13%", secondaryFg: "210 20% 85%",
            muted: "220 30% 11%", mutedFg: "218 15% 55%", border: "220 25% 16%",
            sidebarBg: "220 48% 4%", sidebarBorder: "220 28% 11%", topbarBg: "220 45% 4%",
            isLight: false,
        },
    },
    abyss: {
        name: "Abyss",
        description: "Deeper blacks, higher contrast.",
        vars: {
            background: "222 60% 3%", foreground: "210 30% 97%", card: "222 50% 6%",
            popover: "222 50% 8%", secondary: "222 40% 10%", secondaryFg: "210 20% 88%",
            muted: "222 40% 8%", mutedFg: "218 12% 55%", border: "222 35% 14%",
            sidebarBg: "222 60% 2.5%", sidebarBorder: "222 35% 9%", topbarBg: "222 60% 3%",
            isLight: false,
        },
    },
    charcoal: {
        name: "Charcoal",
        description: "Warm grey tones, easy on the eyes.",
        vars: {
            background: "0 0% 8%", foreground: "30 10% 94%", card: "0 0% 12%",
            popover: "0 0% 14%", secondary: "0 0% 16%", secondaryFg: "30 8% 88%",
            muted: "0 0% 14%", mutedFg: "30 5% 58%", border: "0 0% 20%",
            sidebarBg: "0 0% 6%", sidebarBorder: "0 0% 14%", topbarBg: "0 0% 7%",
            isLight: false,
        },
    },
    steel: {
        name: "Steel",
        description: "Cool blue grey industrial palette.",
        vars: {
            background: "215 25% 11%", foreground: "210 20% 95%", card: "215 22% 15%",
            popover: "215 22% 17%", secondary: "215 20% 19%", secondaryFg: "210 18% 88%",
            muted: "215 20% 16%", mutedFg: "215 12% 60%", border: "215 18% 22%",
            sidebarBg: "215 30% 8%", sidebarBorder: "215 22% 14%", topbarBg: "215 28% 9%",
            isLight: false,
        },
    },
    ember: {
        name: "Ember",
        description: "Warm dark tones with a reddish hue.",
        vars: {
            background: "10 30% 7%", foreground: "20 30% 96%", card: "10 28% 11%",
            popover: "10 28% 13%", secondary: "10 25% 16%", secondaryFg: "20 25% 88%",
            muted: "10 25% 13%", mutedFg: "15 12% 60%", border: "10 22% 19%",
            sidebarBg: "10 35% 5%", sidebarBorder: "10 24% 12%", topbarBg: "10 32% 6%",
            isLight: false,
        },
    },
    forest: {
        name: "Forest",
        description: "Deep greens, nature inspired.",
        vars: {
            background: "150 30% 6%", foreground: "140 20% 95%", card: "150 28% 10%",
            popover: "150 28% 12%", secondary: "150 22% 15%", secondaryFg: "140 18% 88%",
            muted: "150 22% 12%", mutedFg: "150 10% 58%", border: "150 20% 18%",
            sidebarBg: "150 35% 4%", sidebarBorder: "150 22% 11%", topbarBg: "150 32% 5%",
            isLight: false,
        },
    },
    light: {
        name: "Light",
        description: "Clean bright mode for daytime use.",
        vars: {
            background: "210 30% 98%", foreground: "220 35% 10%", card: "0 0% 100%",
            popover: "0 0% 100%", secondary: "210 25% 94%", secondaryFg: "220 30% 18%",
            muted: "210 25% 94%", mutedFg: "220 12% 42%", border: "210 22% 88%",
            sidebarBg: "210 30% 96%", sidebarBorder: "210 22% 86%", topbarBg: "0 0% 100%",
            isLight: true,
        },
    },
    snow: {
        name: "Snow",
        description: "Ultra minimal white on white.",
        vars: {
            background: "0 0% 100%", foreground: "220 25% 12%", card: "0 0% 100%",
            popover: "0 0% 100%", secondary: "210 20% 97%", secondaryFg: "220 25% 18%",
            muted: "210 20% 97%", mutedFg: "220 10% 45%", border: "210 20% 92%",
            sidebarBg: "0 0% 99%", sidebarBorder: "210 20% 92%", topbarBg: "0 0% 100%",
            isLight: true,
        },
    },
};
export const ACCENTS = {
    orange: { name: "Orange", hex: "#ff7a2a", primary: "22 100% 58%", glow: "30 100% 65%" },
    blue: { name: "Blue", hex: "#3b82f6", primary: "217 91% 60%", glow: "210 100% 70%" },
    cyan: { name: "Cyan", hex: "#22d3ee", primary: "189 84% 53%", glow: "187 92% 65%" },
    violet: { name: "Violet", hex: "#8b5cf6", primary: "258 90% 66%", glow: "262 90% 75%" },
    rose: { name: "Rose", hex: "#f43f5e", primary: "350 89% 60%", glow: "350 95% 70%" },
    amber: { name: "Amber", hex: "#f59e0b", primary: "38 92% 50%", glow: "44 100% 60%" },
    emerald: { name: "Emerald", hex: "#10b981", primary: "160 84% 39%", glow: "152 70% 50%" },
    pink: { name: "Pink", hex: "#ec4899", primary: "330 81% 60%", glow: "326 90% 70%" },
    red: { name: "Red", hex: "#ef4444", primary: "0 84% 60%", glow: "5 90% 68%" },
    teal: { name: "Teal", hex: "#14b8a6", primary: "172 75% 41%", glow: "170 80% 52%" },
    lime: { name: "Lime", hex: "#84cc16", primary: "84 81% 44%", glow: "82 80% 58%" },
    sky: { name: "Sky", hex: "#0ea5e9", primary: "199 89% 48%", glow: "200 95% 62%" },
};
export const FONTS = {
    inter: { name: "Inter", stack: "'Inter', 'Segoe UI', system-ui, sans-serif", sample: "The quick brown fox jumps over the lazy dog." },
    orbitron: { name: "Orbitron + Inter", stack: "'Orbitron', 'Inter', system-ui, sans-serif", sample: "Tactical display ready." },
    rajdhani: { name: "Rajdhani + Inter", stack: "'Rajdhani', 'Inter', system-ui, sans-serif", sample: "Calm wide letterforms." },
    jetbrains: { name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace", sample: "console > ready" },
    system: { name: "System Default", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif", sample: "Native to your OS." },
};
const KEY = "sam-theme-v1";
const DEFAULTS = { theme: "midnight", accent: "orange", font: "inter" };
function readStored() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return DEFAULTS;
        return { ...DEFAULTS, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULTS;
    }
}
let state = readStored();
const listeners = new Set();
export function getThemeState() {
    return state;
}
export function subscribeTheme(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
function notify() {
    listeners.forEach((l) => l());
}
export function applyTheme(next) {
    state = { ...state, ...next };
    localStorage.setItem(KEY, JSON.stringify(state));
    paint();
    notify();
}
export function paint() {
    const root = document.documentElement;
    const t = THEMES[state.theme].vars;
    const a = ACCENTS[state.accent];
    const f = FONTS[state.font];
    root.style.setProperty("--background", t.background);
    root.style.setProperty("--foreground", t.foreground);
    root.style.setProperty("--card", t.card);
    root.style.setProperty("--card-foreground", t.foreground);
    root.style.setProperty("--popover", t.popover);
    root.style.setProperty("--popover-foreground", t.foreground);
    root.style.setProperty("--secondary", t.secondary);
    root.style.setProperty("--secondary-foreground", t.secondaryFg);
    root.style.setProperty("--muted", t.muted);
    root.style.setProperty("--muted-foreground", t.mutedFg);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--input", t.border);
    root.style.setProperty("--sidebar-background", t.sidebarBg);
    root.style.setProperty("--sidebar-foreground", t.foreground);
    root.style.setProperty("--sidebar-accent", t.secondary);
    root.style.setProperty("--sidebar-accent-foreground", t.foreground);
    root.style.setProperty("--sidebar-border", t.sidebarBorder);
    root.style.setProperty("--topbar-bg", t.topbarBg);
    root.style.setProperty("--primary", a.primary);
    root.style.setProperty("--primary-glow", a.glow);
    root.style.setProperty("--ring", a.primary);
    root.style.setProperty("--sidebar-primary", a.primary);
    root.style.setProperty("--sidebar-ring", a.primary);
    root.style.setProperty("--accent", a.primary);
    root.style.setProperty("--accent-glow", a.glow);
    // Gradients use new primary
    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${a.primary}), hsl(${a.glow}))`);
    root.style.setProperty("--gradient-hero", `radial-gradient(ellipse at top, hsl(${a.primary} / 0.12), transparent 60%), radial-gradient(ellipse at bottom right, hsl(${a.primary} / 0.10), transparent 60%)`);
    // Apply font globally. Use a CSS variable + inline style on <html> so it
    // beats the stylesheet rule in index.css and cascades into every element.
    root.style.setProperty("--app-font", f.stack);
    root.style.setProperty("font-family", f.stack);
    document.body.style.setProperty("font-family", f.stack, "important");
    root.setAttribute("data-theme", state.theme);
    root.setAttribute("data-font", state.font);
    root.setAttribute("data-accent", state.accent);
    if (t.isLight) {
        root.classList.add("light");
        root.classList.remove("dark");
    }
    else {
        root.classList.add("dark");
        root.classList.remove("light");
    }
}
export function initTheme() {
    paint();
}
