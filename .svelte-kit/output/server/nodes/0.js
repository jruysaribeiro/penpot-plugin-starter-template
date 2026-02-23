

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.dpKhSHup.js","_app/immutable/chunks/B4fYklla.js","_app/immutable/chunks/BGr-OO7d.js","_app/immutable/chunks/jpnLiNc6.js"];
export const stylesheets = [];
export const fonts = [];
