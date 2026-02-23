export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["index.html","manifest.json","plugin.js","plugin.js.map"]),
	mimeTypes: {".html":"text/html",".json":"application/json",".js":"text/javascript",".map":"application/json"},
	_: {
		client: {start:"_app/immutable/entry/start.nEyyoehX.js",app:"_app/immutable/entry/app.Bu62fzjP.js",imports:["_app/immutable/entry/start.nEyyoehX.js","_app/immutable/chunks/gn4gLrbI.js","_app/immutable/chunks/BGr-OO7d.js","_app/immutable/chunks/DHV9NyHu.js","_app/immutable/entry/app.Bu62fzjP.js","_app/immutable/chunks/BGr-OO7d.js","_app/immutable/chunks/C5z3nB83.js","_app/immutable/chunks/B4fYklla.js","_app/immutable/chunks/DHV9NyHu.js","_app/immutable/chunks/jpnLiNc6.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/gemini",
				pattern: /^\/api\/gemini\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/gemini/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
