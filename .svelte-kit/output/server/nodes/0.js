

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.DJjZ5vSW.js","_app/immutable/chunks/CsR19vWY.js","_app/immutable/chunks/c3lXlv0J.js","_app/immutable/chunks/D3GAuJGK.js"];
export const stylesheets = [];
export const fonts = [];
