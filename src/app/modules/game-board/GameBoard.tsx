import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Game } from 'tenuki'
import {
	getTimeLimitOptionsForBoardSize,
	isPassMove,
	type GameMode,
	type GameMove,
	type GameResult,
	type GameTimeLimit
} from '../../models/game'
import type { PlayerSlot } from '../../models/player'
import '../../svg-renderer.scss'

type GameBoardProps = {
	boardSize: number
	onBoardSizeChange: (size: number) => void
	handicapStones: number
	onHandicapChange: (stones: number) => void
	blackPlayer: PlayerSlot | null
	whitePlayer: PlayerSlot | null
	onJoinBlack: () => void
	onJoinWhite: () => void
	playerColor: 'black' | 'white' | null
	gameMode: GameMode
	onGameModeChange: (mode: GameMode) => void
	timeLimit: GameTimeLimit
	onTimeLimitChange: (timeLimit: GameTimeLimit) => void
	gameStarted: boolean
	onStartGame: () => void
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
	onDownloadSgf: () => void
	gameResult: GameResult | null
	blackTimeMs: number | null
	whiteTimeMs: number | null
	onExitMode: () => void
	hideJoinButtons?: boolean
}

export const GameBoard = ({
	boardSize,
	onBoardSizeChange,
	handicapStones,
	onHandicapChange,
	blackPlayer,
	whitePlayer,
	onJoinBlack,
	onJoinWhite,
	playerColor,
	gameMode,
	onGameModeChange,
	timeLimit,
	onTimeLimitChange,
	gameStarted,
	onStartGame,
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
	onDownloadSgf,
	gameResult,
	blackTimeMs,
	whiteTimeMs,
	onExitMode,
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
	const gameStartedRef = useRef<boolean>(gameStarted)
	const blackPlayerRef = useRef<PlayerSlot | null>(blackPlayer)
	const whitePlayerRef = useRef<PlayerSlot | null>(whitePlayer)
	const onPlayMoveRef = useRef(onPlayMove)
	const [boardScale, setBoardScale] = useState(1)
	const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false)
	const timeLimitOptions = getTimeLimitOptionsForBoardSize(boardSize)

	const canCurrentUserPlay = (game: Game) => {
		if (!gameStartedRef.current) return false
		if (gameResultRef.current) return false
		if (!isViewingLatestMoveRef.current) return false
		if (gameModeRef.current === 'shared') return true
		if (!blackPlayerRef.current || !whitePlayerRef.current) return false
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
		gameStartedRef.current = gameStarted
	}, [gameStarted])

	useEffect(() => {
		blackPlayerRef.current = blackPlayer
	}, [blackPlayer])

	useEffect(() => {
		whitePlayerRef.current = whitePlayer
	}, [whitePlayer])

	useEffect(() => {
		onPlayMoveRef.current = onPlayMove
	}, [onPlayMove])

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return

		boardElement.innerHTML = ''
		const game = new Game({
			element: boardElement,
			boardSize,
			handicapStones,
			_hooks: {
				handleClick: (y, x) => {
					const g = gameRef.current
					if (!g) return
					if (g.isOver()) return
					if (g.isIllegalAt(y, x)) return
					if (!canCurrentUserPlay(g)) return
					onPlayMoveRef.current(y, x)
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
	}, [boardScale, boardSize, handicapStones, moves])

	const canShowExitMode =
		gameStarted &&
		(gameMode !== 'normal' || (moves.length === 0 && !gameResult))
	const shouldHideJoinButtons = hideJoinButtons || gameMode === 'shared'
	const canShowJoinBlack = gameStarted && !blackPlayer && !shouldHideJoinButtons && playerColor !== 'white'
	const canShowJoinWhite = gameStarted && !whitePlayer && !shouldHideJoinButtons && playerColor !== 'black'
	const areBothSeatsTaken = Boolean(blackPlayer && whitePlayer)
	const firstMoveColor: 'black' | 'white' = handicapStones > 0 ? 'white' : 'black'
	const currentTurn: 'black' | 'white' =
		moves.length % 2 === 0 ? firstMoveColor : firstMoveColor === 'black' ? 'white' : 'black'
	const canPassAs = (color: 'black' | 'white') =>
		gameMode === 'normal' &&
		Boolean(blackPlayer && whitePlayer) &&
		playerColor === color &&
		!gameResult &&
		!gameRef.current?.isOver() &&
		currentTurn === color
	const showPassForBlack = gameStarted && gameMode === 'normal' && playerColor === 'black'
	const showPassForWhite = gameStarted && gameMode === 'normal' && playerColor === 'white'
	const showResignForBlack = gameStarted && gameMode === 'normal' && areBothSeatsTaken && playerColor === 'black' && !gameResult
	const showResignForWhite = gameStarted && gameMode === 'normal' && areBothSeatsTaken && playerColor === 'white' && !gameResult
	const showImportSgf = gameStarted && gameMode === 'shared' && !gameResult
	const showDownloadSgf = gameStarted && gameMode === 'normal' && Boolean(gameResult)
	const showNavigation = gameMode === 'shared'
	const shouldShowSetupOptions = !gameStarted || Boolean(gameResult)
	const winnerLabel = gameResult?.winner === 'draw' ? 'Draw' : `${gameResult?.winner === 'black' ? 'Black' : 'White'} wins`
	const scoreLabel = gameResult ? `Black ${gameResult.blackScore} - ${gameResult.whiteScore} White` : null
	const reasonLabel =
		gameResult?.reason === 'resign'
			? `${gameResult.resignedBy === 'black' ? 'Black' : 'White'} resigned`
			: gameResult?.reason === 'time'
				? `${gameResult.timedOutBy === 'black' ? 'Black' : 'White'} lost on time`
			: gameResult
				? 'Game ended by two passes'
				: null
	const formatClock = (timeMs: number | null) => {
		if (timeMs === null) return null
		const clampedMs = Math.max(0, Math.floor(timeMs))
		const totalSeconds = Math.floor(clampedMs / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes}:${String(seconds).padStart(2, '0')}`
	}
	const showClocks = blackTimeMs !== null && whiteTimeMs !== null
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
				{showClocks ? (
					<div className="player-clock player-clock--black" aria-live="polite">
						<div className="player-clock-label">Time</div>
						<div className="player-clock-value">{formatClock(blackTimeMs)}</div>
					</div>
				) : null}
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
			</div>
			{shouldShowSetupOptions || gameResult ? (
				<div className="game-center-overlays">
					{shouldShowSetupOptions ? (
						<div className="game-setup-popup" role="dialog" aria-label="Game setup">
							<div className="game-options-panel-title">Setup</div>
							<div className="game-options-panel-group">
								<div className="game-board-size-label">Game Mode</div>
								<select
									className="game-options-select"
									name="gameMode"
									value={gameMode}
									onChange={(event) => onGameModeChange(event.target.value as GameMode)}
								>
									<option value="normal">Normal Game</option>
									<option value="shared">Shared Game</option>
								</select>
							</div>
							<div className="game-options-panel-group">
								<div className="game-board-size-label">Board Size</div>
								<select
									className="game-options-select"
									name="boardSize"
									value={boardSize}
									onChange={(event) => onBoardSizeChange(Number(event.target.value))}
								>
									<option value={9}>9x9</option>
									<option value={13}>13x13</option>
									<option value={19}>19x19</option>
								</select>
							</div>
							{gameMode === 'normal' ? (
								<div className="game-options-panel-group">
									<div className="game-board-size-label">Time limit</div>
									<select
										className="game-options-select"
										name="timeLimit"
										value={timeLimit}
										onChange={(event) => onTimeLimitChange(event.target.value as GameTimeLimit)}
									>
										{timeLimitOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>
							) : null}
							<div className="game-options-panel-group">
								<div className="game-board-size-label">Handicap</div>
								<select
									className="game-options-select"
									name="handicapStones"
									value={handicapStones}
									onChange={(event) => onHandicapChange(Number(event.target.value))}
								>
									<option value={0}>0</option>
									<option value={1} disabled>
										1 (unsupported)
									</option>
									<option value={2}>2</option>
									<option value={3}>3</option>
									<option value={4}>4</option>
									<option value={5}>5</option>
									<option value={6}>6</option>
									<option value={7}>7</option>
									<option value={8}>8</option>
									<option value={9}>9</option>
								</select>
							</div>
							<div className="game-options-panel-group">
								<button className="game-side-button game-side-button--start" type="button" onClick={onStartGame}>
									Start
								</button>
							</div>
						</div>
					) : null}
					{gameResult ? (
						<div className="game-result-popup" role="status" aria-live="polite">
							<div className="game-result-title">{winnerLabel}</div>
							<div className="game-result-score">{scoreLabel}</div>
							<div className="game-result-reason">{reasonLabel}</div>
							{showDownloadSgf ? (
								<button className="game-side-button game-side-button--download" type="button" onClick={onDownloadSgf}>
									Download SGF
								</button>
							) : null}
						</div>
					) : null}
				</div>
			) : null}
			<div className="game-side-slot">
				{showClocks ? (
					<div className="player-clock player-clock--white" aria-live="polite">
						<div className="player-clock-label">Time</div>
						<div className="player-clock-value">{formatClock(whiteTimeMs)}</div>
					</div>
				) : null}
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
						<div className="game-board-size-label">Board Zoom</div>
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
					{showImportSgf || canShowExitMode ? (
						<div className="game-board-controls">
							{showImportSgf ? (
								<button className="game-side-button game-side-button--import" type="button" onClick={onImportSgf}>
									Import SGF
								</button>
							) : null}
							{canShowExitMode ? (
								<button className="game-return-button" type="button" onClick={onExitMode}>
									Exit mode
								</button>
							) : null}
						</div>
					) : null}
				</aside>
			) : null}
		</div>
	)
}
