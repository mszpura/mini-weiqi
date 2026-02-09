const port = Number.parseInt(
	process.env.PORT ?? (process.env.NODE_ENV === 'production' ? '8080' : '3000'),
	10
)

export default {
	cors: true,
	hostname: process.env.ROBO_HOSTNAME ?? '0.0.0.0',
	port: Number.isFinite(port) ? port : 3000
}
