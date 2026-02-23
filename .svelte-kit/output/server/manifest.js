export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["manifest.json","plugin.js","plugin.js.map","ui.html"]),
	mimeTypes: {".json":"application/json",".js":"text/javascript",".map":"application/json",".html":"text/html"},
	_: {
		client: {start:"_app/immutable/entry/start.CoXrK3jA.js",app:"_app/immutable/entry/app.CM8JcvlG.js",imports:["_app/immutable/entry/start.CoXrK3jA.js","_app/immutable/chunks/CRLewJjD.js","_app/immutable/chunks/c3lXlv0J.js","_app/immutable/chunks/DJQG_C1D.js","_app/immutable/entry/app.CM8JcvlG.js","_app/immutable/chunks/c3lXlv0J.js","_app/immutable/chunks/C3lq1XMD.js","_app/immutable/chunks/CsR19vWY.js","_app/immutable/chunks/DJQG_C1D.js","_app/immutable/chunks/D3GAuJGK.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
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
