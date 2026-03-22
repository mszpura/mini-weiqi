import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove, type GameResult } from '../../models/game'
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
	isViewingLatestMove: boolean
	canMoveBackward: boolean
	canMoveForward: boolean
	onMoveToStart: () => void
	onMoveBackward: () => void
	onMoveForward: () => void
	onMoveToEnd: () => void
	onPlayMove: (y: number, x: number) => void
	onPassTurn: () => void
	onResign: () => void
	onImportSgf: () => void
	gameResult: GameResult | null
	onNewGame: () => void
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
	isViewingLatestMove,
	canMoveBackward,
	canMoveForward,
	onMoveToStart,
	onMoveBackward,
	onMoveForward,
	onMoveToEnd,
	onPlayMove,
	onPassTurn,
	onResign,
	onImportSgf,
	gameResult,
	onNewGame,
	onReturnToMenu,
	hideJoinButtons = false
}: GameBoardProps) => {
	const BOARD_SCALE_STEP = 0.2
	const MIN_BOARD_SCALE = 0.6
	const MAX_BOARD_SCALE = 3
	const boardRef = useRef<HTMLDivElement>(null)
	const gameRef = useRef<Game | null>(null)
	const playerColorRef = useRef<'black' | 'white' | null>(playerColor)
	const gameModeRef = useRef<GameMode>(gameMode)
	const gameResultRef = useRef<GameResult | null>(gameResult)
	const isViewingLatestMoveRef = useRef<boolean>(isViewingLatestMove)
	const [boardScale, setBoardScale] = useState(1)
	const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false)

	const canCurrentUserPlay = (game: Game) => {
		if (gameResultRef.current) return false
		if (!isViewingLatestMoveRef.current) return false
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
		gameResultRef.current = gameResult
	}, [gameResult])

	useEffect(() => {
		isViewingLatestMoveRef.current = isViewingLatestMove
	}, [isViewingLatestMove])

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
	}, [boardScale, boardSize, moves])

	const canReturnToMenu = Boolean(gameResult) || (!blackPlayer && !whitePlayer)
	const shouldHideJoinButtons = hideJoinButtons || gameMode === 'shared'
	const canShowJoinBlack = !blackPlayer && !shouldHideJoinButtons && playerColor !== 'white'
	const canShowJoinWhite = !whitePlayer && !shouldHideJoinButtons && playerColor !== 'black'
	const currentTurn: 'black' | 'white' = moves.length % 2 === 0 ? 'black' : 'white'
	const canPassAs = (color: 'black' | 'white') =>
		gameMode === 'normal' &&
		playerColor === color &&
		!gameResult &&
		!gameRef.current?.isOver() &&
		currentTurn === color
	const showPassForBlack = gameMode === 'normal' && playerColor === 'black'
	const showPassForWhite = gameMode === 'normal' && playerColor === 'white'
	const showResignForBlack = gameMode === 'normal' && playerColor === 'black' && !gameResult
	const showResignForWhite = gameMode === 'normal' && playerColor === 'white' && !gameResult
	const showImportSgf = gameMode === 'shared' && !gameResult
	const showNavigation = gameMode === 'shared'
	const showNewGame = gameMode === 'normal' && Boolean(gameResult)
	const winnerLabel = gameResult?.winner === 'draw' ? 'Draw' : `${gameResult?.winner === 'black' ? 'Black' : 'White'} wins`
	const scoreLabel = gameResult ? `Black ${gameResult.blackScore} - ${gameResult.whiteScore} White` : null
	const reasonLabel =
		gameResult?.reason === 'resign'
			? `${gameResult.resignedBy === 'black' ? 'Black' : 'White'} resigned`
			: gameResult
				? 'Game ended by two passes'
				: null
	const canIncreaseBoardScale = boardScale < MAX_BOARD_SCALE - 0.001
	const canDecreaseBoardScale = boardScale > MIN_BOARD_SCALE + 0.001
	const handleIncreaseBoardScale = () => {
		setBoardScale((previousScale) => Math.min(MAX_BOARD_SCALE, Number((previousScale + BOARD_SCALE_STEP).toFixed(2))))
	}
	const handleDecreaseBoardScale = () => {
		setBoardScale((previousScale) => Math.max(MIN_BOARD_SCALE, Number((previousScale - BOARD_SCALE_STEP).toFixed(2))))
	}
	const handleToggleOptionsPanel = () => {
		setIsOptionsPanelOpen((previous) => !previous)
	}

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
					{showResignForBlack ? (
						<button className="game-side-button game-side-button--resign" type="button" onClick={onResign}>
							Resign
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
					style={{ '--board-scale': boardScale } as CSSProperties}
				/>
				{gameResult ? (
					<div className="game-result-popup" role="status" aria-live="polite">
						<div className="game-result-title">{winnerLabel}</div>
						<div className="game-result-score">{scoreLabel}</div>
						<div className="game-result-reason">{reasonLabel}</div>
					</div>
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
					{showResignForWhite ? (
						<button className="game-side-button game-side-button--resign" type="button" onClick={onResign}>
							Resign
						</button>
					) : null}
					{canShowJoinWhite ? (
						<button className="game-side-button game-side-button--white" type="button" onClick={onJoinWhite}>
							Join as White
						</button>
					) : null}
				</div>
			</div>
			<button
				className="game-options-toggle"
				type="button"
				onClick={handleToggleOptionsPanel}
				aria-expanded={isOptionsPanelOpen}
				aria-controls="game-options-panel"
			>
				Options
			</button>
			{isOptionsPanelOpen ? (
				<aside className="game-options-panel" id="game-options-panel">
					<div className="game-options-panel-title">Options</div>
					<div className="game-board-size-controls">
						<div className="game-board-size-label">Board Size</div>
						<div className="game-board-size-buttons">
							<button
								className="game-board-size-button"
								type="button"
								onClick={handleIncreaseBoardScale}
								disabled={!canIncreaseBoardScale}
								aria-label="Increase board size"
							>
								+
							</button>
							<button
								className="game-board-size-button"
								type="button"
								onClick={handleDecreaseBoardScale}
								disabled={!canDecreaseBoardScale}
								aria-label="Decrease board size"
							>
								-
							</button>
						</div>
					</div>
					{showNavigation ? (
						<div className="game-options-panel-group">
							<div className="game-board-size-label">Navigation</div>
							<div className="game-board-nav-controls">
								<button className="game-nav-button" type="button" onClick={onMoveToStart} disabled={!canMoveBackward}>
									{'<<'}
								</button>
								<button className="game-nav-button" type="button" onClick={onMoveBackward} disabled={!canMoveBackward}>
									{'<'}
								</button>
								<button className="game-nav-button" type="button" onClick={onMoveForward} disabled={!canMoveForward}>
									{'>'}
								</button>
								<button className="game-nav-button" type="button" onClick={onMoveToEnd} disabled={!canMoveForward}>
									{'>>'}
								</button>
							</div>
						</div>
					) : null}
					{showImportSgf || showNewGame || canReturnToMenu ? (
						<div className="game-board-controls">
							{showImportSgf ? (
								<button className="game-side-button game-side-button--import" type="button" onClick={onImportSgf}>
									Import SGF
								</button>
							) : null}
							{showNewGame ? (
								<button className="game-side-button game-side-button--new-game" type="button" onClick={onNewGame}>
									New Game
								</button>
							) : null}
							{canReturnToMenu ? (
								<button className="game-return-button" type="button" onClick={onReturnToMenu}>
									Return
								</button>
							) : null}
						</div>
					) : null}
				</aside>
			) : null}
		</div>
	)
}
