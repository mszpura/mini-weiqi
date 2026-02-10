import { DiscordProxy } from '@robojs/patch'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), DiscordProxy.Vite()],
	server: {
		allowedHosts: true,
		proxy: {
			'/.proxy/api': {
				target: 'http://127.0.0.1:3001',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/\.proxy/, '')
			},
			'/api': {
				target: 'http://127.0.0.1:3001',
				changeOrigin: true
			},
			'/sync': {
				target: 'ws://127.0.0.1:3001',
				changeOrigin: true,
				ws: true
			}
		},
		watch: {
			// Avoid EMFILE on systems with low fs.watch limits.
			usePolling: true,
			interval: 200
		}
	}
})
