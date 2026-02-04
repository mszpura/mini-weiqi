import { useEffect, useRef } from 'react'
import { Game } from 'tenuki'

export const Activity = () => {
	const boardRef = useRef<HTMLDivElement>(null)
	const gameRef = useRef<Game | null>(null)

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return

		boardElement.innerHTML = ''
		const game = new Game({
			element: boardElement,
			boardSize: 19,
			_hooks: {
				handleClick: (y, x) => {
					console.log(`clicked: ${y},${x}`)
					const g = gameRef.current
					if (!g) return
					if (g.isOver()) {
						g.toggleDeadAt(y, x)
					} else {
						g.playAt(y, x)
					}
				},
				hoverValue: (y, x) => {
					const g = gameRef.current
					if (!g) return undefined
					if (!g.isOver() && !g.isIllegalAt(y, x)) {
						return g.currentPlayer()
					}
					return undefined
				},
				gameIsOver: () => gameRef.current?.isOver() ?? false,
			},
		})
		gameRef.current = game

		return () => {
			const current = gameRef.current
			if (current?.renderer) {
				// Avoid resize callbacks running after unmount (dev/StrictMode)
				current.renderer.computeSizing = () => {}
			}
			boardElement.innerHTML = ''
			gameRef.current = null
		}
	}, [])

	return (
		<div>
			<div className="game-title">MINI WEIQI</div>
			<br />
			<div
				ref={boardRef}
				className="tenuki-board"
				data-include-coordinates="true"
				style={{ width: 552, height: 552, margin: '0 auto' }}
			/>
		</div>
	)
}
