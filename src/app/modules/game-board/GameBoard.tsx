import { useEffect, useRef } from 'react'
import { Game } from 'tenuki'

type PlayerSlot = {
	id: string
	username: string
	avatar: string | null
}

type GameBoardProps = {
	boardSize: number
	blackPlayer: PlayerSlot | null
	whitePlayer: PlayerSlot | null
	onJoinBlack: () => void
	onJoinWhite: () => void
}

export const GameBoard = ({ boardSize, blackPlayer, whitePlayer, onJoinBlack, onJoinWhite }: GameBoardProps) => {
	const boardRef = useRef<HTMLDivElement>(null)
	const gameRef = useRef<Game | null>(null)

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return

		boardElement.innerHTML = ''
		const game = new Game({
			element: boardElement,
			boardSize,
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
				gameIsOver: () => gameRef.current?.isOver() ?? false
			}
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
	}, [boardSize])

	return (
		<div className="game-board">
			<div className="game-side-slot">
				{blackPlayer ? (
					<div className="player-avatar-wrap player-avatar-wrap--black">
						{blackPlayer.avatar ? (
							<img
								className="player-avatar"
								src={`https://cdn.discordapp.com/avatars/${blackPlayer.id}/${blackPlayer.avatar}.png?size=128`}
								alt={`${blackPlayer.username} avatar`}
							/>
						) : (
							<div className="player-avatar placeholder" aria-hidden="true" />
						)}
					</div>
				) : (
					<button className="game-side-button game-side-button--black" type="button" onClick={onJoinBlack}>
						Join as Black
					</button>
				)}
			</div>
			<div ref={boardRef} className="tenuki-board" data-include-coordinates="true" />
			<div className="game-side-slot">
				{whitePlayer ? (
					<div className="player-avatar-wrap player-avatar-wrap--white">
						{whitePlayer.avatar ? (
							<img
								className="player-avatar"
								src={`https://cdn.discordapp.com/avatars/${whitePlayer.id}/${whitePlayer.avatar}.png?size=128`}
								alt={`${whitePlayer.username} avatar`}
							/>
						) : (
							<div className="player-avatar placeholder" aria-hidden="true" />
						)}
					</div>
				) : (
					<button className="game-side-button game-side-button--white" type="button" onClick={onJoinWhite}>
						Join as White
					</button>
				)}
			</div>
		</div>
	)
}
