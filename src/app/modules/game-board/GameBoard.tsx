import { useEffect, useRef } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove } from '../../models/game'
import type { PlayerSlot } from '../../models/player'
import '../../svg-renderer.scss'

type GameBoardProps = {
	boardSize: number
	blackPlayer: PlayerSlot | null
	whitePlayer: PlayerSlot | null
	onJoinBlack: () => void
	onJoinWhite: () => void
	playerColor: 'black' | 'white' | null
	gameMode: GameMode
	moves: GameMove[]
	capturedByBlack: number
	capturedByWhite: number
	onPlayMove: (y: number, x: number) => void
	onPassTurn: () => void
	onReturnToMenu: () => void
	hideJoinButtons?: boolean
}

export const GameBoard = ({
	boardSize,
	blackPlayer,
	whitePlayer,
	onJoinBlack,
	onJoinWhite,
	playerColor,
	gameMode,
	moves,
	capturedByBlack,
	capturedByWhite,
	onPlayMove,
	onPassTurn,
	onReturnToMenu,
	hideJoinButtons = false
}: GameBoardProps) => {
	const boardRef = useRef<HTMLDivElement>(null)
	const gameRef = useRef<Game | null>(null)
	const playerColorRef = useRef<'black' | 'white' | null>(playerColor)
	const gameModeRef = useRef<GameMode>(gameMode)

	const canCurrentUserPlay = (game: Game) => {
		if (gameModeRef.current === 'shared') return true
		const activeColor = playerColorRef.current
		return Boolean(activeColor && game.currentPlayer() === activeColor)
	}

	useEffect(() => {
		playerColorRef.current = playerColor
	}, [playerColor])

	useEffect(() => {
		gameModeRef.current = gameMode
	}, [gameMode])

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return

		boardElement.innerHTML = ''
		const game = new Game({
			element: boardElement,
			boardSize,
			_hooks: {
				handleClick: (y, x) => {
					const g = gameRef.current
					if (!g) return
					if (g.isOver()) return
					if (g.isIllegalAt(y, x)) return
					if (!canCurrentUserPlay(g)) return
					onPlayMove(y, x)
				},
				hoverValue: (y, x) => {
					const g = gameRef.current
					if (!g) return undefined
					if (g.isOver() || g.isIllegalAt(y, x) || !canCurrentUserPlay(g)) {
						return undefined
					}
					if (!g.isOver() && !g.isIllegalAt(y, x)) {
						return g.currentPlayer()
					}
					return undefined
				},
				gameIsOver: () => gameRef.current?.isOver() ?? false
			}
		})

		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}

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
	}, [boardSize, moves])

	const canReturnToMenu = !blackPlayer && !whitePlayer
	const shouldHideJoinButtons = hideJoinButtons || gameMode === 'shared'
	const canShowJoinBlack = !blackPlayer && !shouldHideJoinButtons && playerColor !== 'white'
	const canShowJoinWhite = !whitePlayer && !shouldHideJoinButtons && playerColor !== 'black'
	const currentTurn: 'black' | 'white' = moves.length % 2 === 0 ? 'black' : 'white'
	const canPassAs = (color: 'black' | 'white') =>
		gameMode === 'normal' &&
		playerColor === color &&
		!gameRef.current?.isOver() &&
		currentTurn === color
	const showPassForBlack = gameMode === 'normal' && playerColor === 'black'
	const showPassForWhite = gameMode === 'normal' && playerColor === 'white'

	return (
		<div className="game-board">
			<div className="game-side-slot">
				<div className="player-card player-card--black">
					<div className="player-avatar-wrap player-avatar-wrap--black">
						{blackPlayer?.avatar ? (
							<img
								className="player-avatar"
								src={`https://cdn.discordapp.com/avatars/${blackPlayer.id}/${blackPlayer.avatar}.png?size=128`}
								alt={`${blackPlayer.username} avatar`}
							/>
						) : (
							<div className="player-avatar placeholder placeholder--black" aria-hidden="true" />
						)}
					</div>
					<div className="player-card-name">{blackPlayer?.username ?? 'Black'}</div>
					<div className="player-card-captured">Captured: {capturedByBlack}</div>
					{showPassForBlack ? (
						<button
							className="game-side-button game-side-button--pass"
							type="button"
							onClick={onPassTurn}
							disabled={!canPassAs('black')}
						>
							Pass
						</button>
					) : null}
					{canShowJoinBlack ? (
						<button className="game-side-button game-side-button--black" type="button" onClick={onJoinBlack}>
							Join as Black
						</button>
					) : null}
				</div>
			</div>
			<div className="game-board-center">
				<div
					ref={boardRef}
					className="tenuki-board tenuki-svg-renderer"
					data-include-coordinates="true"
				/>
				{canReturnToMenu ? (
					<button className="game-return-button" type="button" onClick={onReturnToMenu}>
						Return
					</button>
				) : null}
			</div>
			<div className="game-side-slot">
				<div className="player-card player-card--white">
					<div className="player-avatar-wrap player-avatar-wrap--white">
						{whitePlayer?.avatar ? (
							<img
								className="player-avatar"
								src={`https://cdn.discordapp.com/avatars/${whitePlayer.id}/${whitePlayer.avatar}.png?size=128`}
								alt={`${whitePlayer.username} avatar`}
							/>
						) : (
							<div className="player-avatar placeholder placeholder--white" aria-hidden="true" />
						)}
					</div>
					<div className="player-card-name">{whitePlayer?.username ?? 'White'}</div>
					<div className="player-card-captured">Captured: {capturedByWhite}</div>
					{showPassForWhite ? (
						<button
							className="game-side-button game-side-button--pass"
							type="button"
							onClick={onPassTurn}
							disabled={!canPassAs('white')}
						>
							Pass
						</button>
					) : null}
					{canShowJoinWhite ? (
						<button className="game-side-button game-side-button--white" type="button" onClick={onJoinWhite}>
							Join as White
						</button>
					) : null}
				</div>
			</div>
		</div>
	)
}
