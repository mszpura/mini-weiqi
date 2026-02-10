// @ts-check

/**
 * @type {import('robo.js').Config}
 **/
export default {
	experimental: {
		disableBot: true
	},
	plugins: [],
	type: 'robo',
	watcher: {
		ignore: [
			'.git',
			'.robo',
			'node_modules',
			'public',
			'src/app',
			'src/components',
			'src/hooks'
		]
	}
}
