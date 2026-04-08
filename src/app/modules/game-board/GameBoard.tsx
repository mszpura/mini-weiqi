import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Game } from 'tenuki'
import { featureFlags } from '../../config/featureFlags'
import {
	type BoardMarker,
	type BoardMarkerSymbol,
	type DisconnectTimeoutState,
	isPassMove,
	type GameMode,
	type GameMove,
	type GameResult,
	type GameTimeLimit,
	type MoveTreeNode,
	type OneColorStoneColor
} from '../../models/game'
import { buildMoveTreeRenderNodes } from '../../models/moveTree'
import type { PlayerSlot } from '../../models/player'
import '../../svg-renderer.scss'
import { downloadBoardImage } from './logic/downloadBoardImage'
import { GameResultPopup } from './GameResultPopup'
import { InfoMenu } from './InfoMenu'
import { MoveTreePanel } from './MoveTreePanel'
import { RightOptionsMenu } from './RightOptionsMenu'
import { SetupMenu } from './SetupMenu'

type GameBoardProps = {
	boardSize: number
	onBoardSizeChange: (size: number) => void
	handicapStones: number
	onHandicapChange: (stones: number) => void
	blackPlayer: PlayerSlot | null
	whitePlayer: PlayerSlot | null
	onJoinBlack: () => void
	onJoinWhite: () => void
	onLeaveSeat: () => void
	playerColor: 'black' | 'white' | null
	canControlBlack: boolean
	canControlWhite: boolean
	allowDualSeatInDev: boolean
	gameMode: GameMode
	onGameModeChange: (mode: GameMode) => void
	oneColorStoneColor: OneColorStoneColor
	onOneColorStoneColorChange: (color: OneColorStoneColor) => void
	timeLimit: GameTimeLimit
	onTimeLimitChange: (timeLimit: GameTimeLimit) => void
	gameStarted: boolean
	onStartGame: () => void
	onStartNewGame: () => void
	moves: GameMove[]
	moveTree: Record<string, MoveTreeNode>
	currentMoveId: string
	currentMoveCount: number
	currentMoveComment: string
	currentMoveMarkers: BoardMarker[]
	capturedByBlack: number
	capturedByWhite: number
	isViewingLatestMove: boolean
	canMoveBackward: boolean
	canMoveForward: boolean
	onMoveToStart: () => void
	onMoveBackward: () => void
	onMoveForward: () => void
	onMoveToEnd: () => void
	onMoveToCount: (count: number, moveId?: string) => void
	onCurrentMoveCommentChange: (comment: string) => void
	onToggleCurrentMoveMarker: (y: number, x: number, symbol: BoardMarkerSymbol) => void
	onPlayMove: (y: number, x: number) => void
	onPassTurn: () => void
	onResign: () => void
	onImportSgf: () => void
	sgfLinkHref: string | null
	aiSenseiUploadHref: string | null
	onOpenAiSensei: () => void
	canShareResult: boolean
	isSharingResult: boolean
	onShareResult: () => void
	sgfDownloadFileName: string
	gameResult: GameResult | null
	blackTimeMs: number | null
	whiteTimeMs: number | null
	blackByoYomiPeriodsLeft: number | null
	whiteByoYomiPeriodsLeft: number | null
	isBlackInLastByoYomi: boolean
	isWhiteInLastByoYomi: boolean
	disconnectTimeout: DisconnectTimeoutState | null
	disconnectSecondsLeft: number | null
	onExitMode: () => void
	soundEnabled: boolean
	onToggleSound: () => void
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
	onLeaveSeat,
	playerColor,
	canControlBlack,
	canControlWhite,
	allowDualSeatInDev,
	gameMode,
	onGameModeChange,
	oneColorStoneColor,
	onOneColorStoneColorChange,
	timeLimit,
	onTimeLimitChange,
	gameStarted,
	onStartGame,
	onStartNewGame,
	moves,
	moveTree,
	currentMoveId,
	currentMoveCount,
	currentMoveComment,
	currentMoveMarkers,
	capturedByBlack,
	capturedByWhite,
	isViewingLatestMove,
	canMoveBackward,
	canMoveForward,
	onMoveToStart,
	onMoveBackward,
	onMoveForward,
	onMoveToEnd,
	onMoveToCount,
	onCurrentMoveCommentChange,
	onToggleCurrentMoveMarker,
	onPlayMove,
	onPassTurn,
	onResign,
	onImportSgf,
	sgfLinkHref,
	aiSenseiUploadHref,
	onOpenAiSensei,
	canShareResult,
	isSharingResult,
	onShareResult,
	sgfDownloadFileName,
	gameResult,
	blackTimeMs,
	whiteTimeMs,
	blackByoYomiPeriodsLeft,
	whiteByoYomiPeriodsLeft,
	isBlackInLastByoYomi,
	isWhiteInLastByoYomi,
	disconnectTimeout,
	disconnectSecondsLeft,
	onExitMode,
	soundEnabled,
	onToggleSound,
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
	const onToggleCurrentMoveMarkerRef = useRef(onToggleCurrentMoveMarker)
	const canControlBlackRef = useRef(canControlBlack)
	const canControlWhiteRef = useRef(canControlWhite)
	const allowDualSeatInDevRef = useRef(allowDualSeatInDev)
	const markerToolRef = useRef<BoardMarkerSymbol | null>(null)
	const [boardScale, setBoardScale] = useState(1)
	const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false)
	const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
	const [markerTool, setMarkerTool] = useState<BoardMarkerSymbol | null>(null)
	const isSeatMode = gameMode === 'normal' || gameMode === 'one-color'

	const canCurrentUserPlay = (game: Game) => {
		if (!gameStartedRef.current) return false
		if (gameResultRef.current) return false
		if (gameModeRef.current === 'shared') return true
		if (!isViewingLatestMoveRef.current) return false
		if (!blackPlayerRef.current || !whitePlayerRef.current) return false
		if (allowDualSeatInDevRef.current) {
			return game.currentPlayer() === 'black' ? canControlBlackRef.current : canControlWhiteRef.current
		}
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
		onToggleCurrentMoveMarkerRef.current = onToggleCurrentMoveMarker
	}, [onToggleCurrentMoveMarker])

	useEffect(() => {
		canControlBlackRef.current = canControlBlack
	}, [canControlBlack])

	useEffect(() => {
		canControlWhiteRef.current = canControlWhite
	}, [canControlWhite])

	useEffect(() => {
		allowDualSeatInDevRef.current = allowDualSeatInDev
	}, [allowDualSeatInDev])

	useEffect(() => {
		markerToolRef.current = markerTool
	}, [markerTool])

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
					if (
						gameModeRef.current === 'shared' &&
						gameStartedRef.current &&
						!gameResultRef.current &&
						markerToolRef.current
					) {
						onToggleCurrentMoveMarkerRef.current(y, x, markerToolRef.current)
						return
					}
					const g = gameRef.current
					if (!g) return
					if (g.isOver()) return
					if (g.isIllegalAt(y, x)) return
					if (!canCurrentUserPlay(g)) return
					onPlayMoveRef.current(y, x)
				},
				hoverValue: (y, x) => {
					if (gameModeRef.current === 'shared' && markerToolRef.current) {
						return undefined
					}
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

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return
		const boardSvg = boardElement.querySelector('svg')
		if (!(boardSvg instanceof SVGSVGElement)) return

		boardSvg.querySelectorAll('.custom-annotation-marker').forEach((markerElement) => {
			markerElement.remove()
		})

		const createMarkerElement = (symbol: BoardMarkerSymbol, cx: number, cy: number) => {
			const svgNs = 'http://www.w3.org/2000/svg'
			if (symbol === 'circle') {
				const circle = document.createElementNS(svgNs, 'circle')
				circle.setAttribute('cx', String(cx))
				circle.setAttribute('cy', String(cy))
				circle.setAttribute('r', '6')
				return circle
			}
			if (symbol === 'square') {
				const square = document.createElementNS(svgNs, 'rect')
				square.setAttribute('x', String(cx - 6))
				square.setAttribute('y', String(cy - 6))
				square.setAttribute('width', '12')
				square.setAttribute('height', '12')
				return square
			}
			if (symbol === 'triangle') {
				const triangle = document.createElementNS(svgNs, 'path')
				triangle.setAttribute('d', `M ${cx} ${cy - 7} L ${cx - 7} ${cy + 6} L ${cx + 7} ${cy + 6} Z`)
				return triangle
			}
			const xPath = document.createElementNS(svgNs, 'path')
			xPath.setAttribute('d', `M ${cx - 6} ${cy - 6} L ${cx + 6} ${cy + 6} M ${cx + 6} ${cy - 6} L ${cx - 6} ${cy + 6}`)
			return xPath
		}

		for (const marker of currentMoveMarkers) {
			const intersection = boardSvg.querySelector<SVGGElement>(
				`.intersection[data-intersection-y="${marker.y}"][data-intersection-x="${marker.x}"]`
			)
			if (!intersection) continue
			const markerBase = intersection.querySelector<SVGCircleElement>('.marker')
			const innerContainer = intersection.querySelector<SVGGElement>('.intersection-inner-container')
			if (!markerBase || !innerContainer) continue
			const cx = Number(markerBase.getAttribute('cx'))
			const cy = Number(markerBase.getAttribute('cy'))
			if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
			const markerElement = createMarkerElement(marker.symbol, cx, cy)
			const isOnBlackStone = intersection.classList.contains('black') && intersection.classList.contains('occupied')
			const isOnWhiteStone = intersection.classList.contains('white') && intersection.classList.contains('occupied')
			const stoneClass = isOnBlackStone ? 'on-black' : isOnWhiteStone ? 'on-white' : 'on-board'
			markerElement.setAttribute(
				'class',
				`custom-annotation-marker custom-annotation-marker--${marker.symbol} custom-annotation-marker--${stoneClass}`
			)
			innerContainer.append(markerElement)
		}
	}, [boardScale, boardSize, currentMoveId, currentMoveMarkers, moves])

	const canShowExitMode = gameStarted && (gameMode === 'shared' || (moves.length === 0 && !gameResult))
	const shouldHideJoinButtons = hideJoinButtons || gameMode === 'shared'
	const canShowJoinBlack =
		gameStarted && !blackPlayer && !shouldHideJoinButtons && (allowDualSeatInDev ? true : playerColor !== 'white')
	const canShowJoinWhite =
		gameStarted && !whitePlayer && !shouldHideJoinButtons && (allowDualSeatInDev ? true : playerColor !== 'black')
	const areBothSeatsTaken = Boolean(blackPlayer && whitePlayer)
	const firstMoveColor: 'black' | 'white' = handicapStones > 0 ? 'white' : 'black'
	const currentTurn: 'black' | 'white' =
		moves.length % 2 === 0 ? firstMoveColor : firstMoveColor === 'black' ? 'white' : 'black'
	const canPassAs = (color: 'black' | 'white') =>
		isSeatMode &&
		Boolean(blackPlayer && whitePlayer) &&
		(color === 'black' ? canControlBlack : canControlWhite) &&
		!gameResult &&
		!gameRef.current?.isOver() &&
		currentTurn === color
	const showPassForBlack = gameStarted && isSeatMode && canControlBlack
	const showPassForWhite = gameStarted && isSeatMode && canControlWhite
	const showResignForBlack = gameStarted && isSeatMode && areBothSeatsTaken && canControlBlack && !gameResult
	const showResignForWhite = gameStarted && isSeatMode && areBothSeatsTaken && canControlWhite && !gameResult
	const canLeaveSeat =
		gameStarted && isSeatMode && !areBothSeatsTaken && playerColor !== null && moves.length === 0 && !gameResult
	const showLeaveSeatForBlack = canLeaveSeat && playerColor === 'black'
	const showLeaveSeatForWhite = canLeaveSeat && playerColor === 'white'
	const showImportSgf = gameStarted && gameMode === 'shared' && !gameResult
	const showMoveCommentEditor = gameStarted && gameMode === 'shared'
	const canEditCurrentMoveComment = Boolean(moveTree[currentMoveId]?.move)
	const markerToolOptions: Array<{ value: BoardMarkerSymbol; label: string; symbol: string }> = [
		{ value: 'triangle', label: 'Triangle', symbol: '△' },
		{ value: 'square', label: 'Square', symbol: '□' },
		{ value: 'circle', label: 'Circle', symbol: '○' },
		{ value: 'x', label: 'X', symbol: '✕' }
	]
	const showDownloadBoardImageInOptions = featureFlags.boardImageExport && gameStarted
	const showSgfDownloadButton = featureFlags.sgfExportMode === 'download'
	const showSgfAiSenseiButton = featureFlags.sgfExportMode === 'aiSensei'
	const showDownloadSgf = showSgfDownloadButton && gameStarted && isSeatMode && Boolean(gameResult)
	const showAiSenseiSgf = showSgfAiSenseiButton && gameStarted && isSeatMode && Boolean(gameResult)
	const showDownloadSgfInSharedSidebar = showSgfDownloadButton && gameStarted && gameMode === 'shared'
	const showAiSenseiSgfInOptions = showSgfAiSenseiButton && gameStarted && gameMode === 'shared'
	const showNavigation = gameMode === 'shared'
	const moveTreeRenderNodes = buildMoveTreeRenderNodes(moveTree)
	const moveTreeRenderById = new Map(moveTreeRenderNodes.map((node) => [node.id, node]))
	const maxTreeRow = moveTreeRenderNodes.reduce((maxRow, node) => Math.max(maxRow, node.row), 1)
	const moveNumber = moves.length
	const shouldShowSetupOptions = !gameStarted
	const winnerLabel =
		gameResult?.winner === 'draw' ? 'Draw' : `${gameResult?.winner === 'black' ? 'Black' : 'White'} wins`
	const scoreLabel = gameResult ? `Black ${gameResult.blackScore} - ${gameResult.whiteScore} White` : null
	const reasonLabel =
		gameResult?.reason === 'resign'
			? `${gameResult.resignedBy === 'black' ? 'Black' : 'White'} resigned`
			: gameResult?.reason === 'time'
				? `${gameResult.timedOutBy === 'black' ? 'Black' : 'White'} lost on time`
				: gameResult?.reason === 'disconnect'
					? `${gameResult.disconnectedBy === 'black' ? 'Black' : 'White'} disconnected`
					: gameResult
						? 'Game ended by two passes'
						: null
	const showDisconnectCountdown = Boolean(disconnectTimeout && disconnectSecondsLeft !== null && !gameResult)
	const disconnectLabel = disconnectTimeout
		? `${disconnectTimeout.color === 'black' ? 'Black' : 'White'} disconnected`
		: null
	const disconnectTimeLabel =
		disconnectSecondsLeft !== null ? `Auto-loss in ${Math.max(0, disconnectSecondsLeft)}s` : null
	const formatClock = (timeMs: number | null) => {
		if (timeMs === null) return null
		const clampedMs = Math.max(0, Math.floor(timeMs))
		const totalSeconds = Math.floor(clampedMs / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes}:${String(seconds).padStart(2, '0')}`
	}
	const formatByoYomiPeriods = (periodsLeft: number | null) =>
		periodsLeft === null ? null : `${Math.max(0, periodsLeft)}`
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
	const handleToggleInfoPanel = () => {
		setIsInfoPanelOpen((previous) => !previous)
	}
	const handleDownloadBoardImage = () => {
		const boardElement = boardRef.current
		if (!boardElement) return
		downloadBoardImage({ boardElement, boardSize, moveNumber })
	}
	const handleDownloadSgf = () => {
		if (!sgfLinkHref) return
		const downloadLink = document.createElement('a')
		downloadLink.href = sgfLinkHref
		downloadLink.download = sgfDownloadFileName
		document.body.append(downloadLink)
		downloadLink.click()
		downloadLink.remove()
	}

	useEffect(() => {
		if (gameMode !== 'shared' || canEditCurrentMoveComment) return
		if (markerTool !== null) {
			setMarkerTool(null)
		}
	}, [canEditCurrentMoveComment, gameMode, markerTool])

	useEffect(() => {
		if (!showNavigation) return

		const handleKeydown = (event: KeyboardEvent) => {
			const target = event.target
			if (target instanceof HTMLElement) {
				const tagName = target.tagName
				const isTypingField = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
				if (isTypingField || target.isContentEditable) return
			}

			if (event.key === 'ArrowLeft' && canMoveBackward) {
				event.preventDefault()
				onMoveBackward()
				return
			}

			if (event.key === 'ArrowRight' && canMoveForward) {
				event.preventDefault()
				onMoveForward()
				return
			}

			if (event.key === 'ArrowDown') {
				const currentNode = moveTreeRenderById.get(currentMoveId)
				if (!currentNode) return
				const targetRow = Math.min(maxTreeRow, currentNode.row + 1)
				let targetNodeId = currentMoveId
				let fallbackDepth = -1

				for (const candidate of moveTreeRenderNodes) {
					if (candidate.row !== targetRow) continue
					if (candidate.depth > currentNode.depth) continue
					if (candidate.depth > fallbackDepth) {
						fallbackDepth = candidate.depth
						targetNodeId = candidate.id
					}
				}
				if (targetNodeId === currentMoveId) return
				event.preventDefault()
				onMoveToCount(fallbackDepth, targetNodeId)
				return
			}

			if (event.key === 'ArrowUp') {
				const currentNode = moveTreeRenderById.get(currentMoveId)
				if (!currentNode || currentNode.row <= 1) return
				const targetRow = currentNode.row - 1
				let targetNodeId = currentMoveId
				let fallbackDepth = -1

				for (const candidate of moveTreeRenderNodes) {
					if (candidate.row !== targetRow) continue
					if (candidate.depth > currentNode.depth) continue
					if (candidate.depth > fallbackDepth) {
						fallbackDepth = candidate.depth
						targetNodeId = candidate.id
					}
				}
				if (targetNodeId === currentMoveId) return
				event.preventDefault()
				onMoveToCount(fallbackDepth, targetNodeId)
			}
		}

		window.addEventListener('keydown', handleKeydown)
		return () => window.removeEventListener('keydown', handleKeydown)
	}, [
		canMoveBackward,
		canMoveForward,
		currentMoveId,
		maxTreeRow,
		moveTreeRenderById,
		moveTreeRenderNodes,
		onMoveBackward,
		onMoveForward,
		onMoveToCount,
		showNavigation
	])

	const isSharedMoveTreeVisible = featureFlags.moveTree && gameMode === 'shared' && gameStarted

	return (
		<div className={`game-board ${isSharedMoveTreeVisible ? 'game-board--with-move-tree' : ''}`}>
			<div className={`game-side-slot ${isSharedMoveTreeVisible ? 'game-side-slot--with-move-tree' : ''}`}>
				{showClocks ? (
					<div className="player-clock player-clock--white" aria-live="polite">
						<div className="player-clock-label">Time</div>
						<div className={`player-clock-value ${isWhiteInLastByoYomi ? 'player-clock-value--danger' : ''}`}>
							{formatClock(whiteTimeMs)}
						</div>
						{whiteByoYomiPeriodsLeft !== null ? (
							<div className="player-clock-periods">BYO: {formatByoYomiPeriods(whiteByoYomiPeriodsLeft)}</div>
						) : null}
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
					{showLeaveSeatForWhite ? (
						<button className="game-side-button game-side-button--leave" type="button" onClick={onLeaveSeat}>
							Leave seat
						</button>
					) : null}
					{canShowJoinWhite ? (
						<button className="game-side-button game-side-button--white" type="button" onClick={onJoinWhite}>
							Join as White
						</button>
					) : null}
				</div>
				{showMoveCommentEditor ? (
					<div className="game-move-comment-panel">
						<label className="game-board-size-label" htmlFor="game-move-comment-textarea">
							Move comment
						</label>
						<textarea
							id="game-move-comment-textarea"
							className="game-move-comment-textarea"
							value={canEditCurrentMoveComment ? currentMoveComment : ''}
							onChange={(event) => onCurrentMoveCommentChange(event.target.value)}
							placeholder={
								canEditCurrentMoveComment
									? 'Add a comment for this move...'
									: 'Select a move in history to add a comment.'
							}
							disabled={!canEditCurrentMoveComment}
							rows={4}
						/>
						<div className="game-marker-tools" role="group" aria-label="Board marker tools">
							<button
								className={`game-marker-tool ${markerTool === null ? 'is-active' : ''}`}
								type="button"
								onClick={() => setMarkerTool(null)}
								aria-label="Use move tool"
							>
								<span className="game-marker-tool-stone" aria-hidden="true" />
							</button>
							{markerToolOptions.map((option) => (
								<button
									key={option.value}
									className={`game-marker-tool ${markerTool === option.value ? 'is-active' : ''}`}
									type="button"
									onClick={() => setMarkerTool(option.value)}
									disabled={!canEditCurrentMoveComment}
									aria-label={`Use ${option.label} marker`}
								>
									{option.symbol}
								</button>
							))}
						</div>
					</div>
				) : null}
				{showImportSgf ? (
					<button className="game-side-button game-side-button--import" type="button" onClick={onImportSgf}>
						Import SGF
					</button>
				) : null}
				{showDownloadSgfInSharedSidebar && sgfLinkHref ? (
					<button className="game-side-button game-side-button--download" type="button" onClick={handleDownloadSgf}>
						Download SGF
					</button>
				) : null}
			</div>
			<div className="game-board-center">
				<div
					ref={boardRef}
					className={`tenuki-board tenuki-svg-renderer ${gameMode === 'one-color' ? `one-color-mode one-color-mode--${oneColorStoneColor}` : ''}`}
					data-include-coordinates="true"
					style={{ '--board-scale': boardScale } as CSSProperties}
				/>
				<div className="game-board-bottom">
					{showDisconnectCountdown ? (
						<div className="disconnect-countdown" role="status" aria-live="polite">
							<div className="disconnect-countdown__title">{disconnectLabel}</div>
							<div className="disconnect-countdown__value">{disconnectTimeLabel}</div>
						</div>
					) : null}
					{showNavigation ? (
						<div className="game-board-nav-bottom">
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
					<div className="game-board-move-label">MOVE {moveNumber}</div>
				</div>
			</div>
			{shouldShowSetupOptions || gameResult ? (
				<div className="game-center-overlays">
					{shouldShowSetupOptions ? (
						<SetupMenu
							gameMode={gameMode}
							onGameModeChange={onGameModeChange}
							boardSize={boardSize}
							onBoardSizeChange={onBoardSizeChange}
							timeLimit={timeLimit}
							onTimeLimitChange={onTimeLimitChange}
							handicapStones={handicapStones}
							onHandicapChange={onHandicapChange}
							oneColorStoneColor={oneColorStoneColor}
							onOneColorStoneColorChange={onOneColorStoneColorChange}
							onStartGame={onStartGame}
						/>
					) : null}
					{gameResult ? (
						<GameResultPopup
							winnerLabel={winnerLabel}
							scoreLabel={scoreLabel}
							reasonLabel={reasonLabel}
							showShareResultButton={canShareResult}
							isSharingResult={isSharingResult}
							onShareResult={onShareResult}
							showDownloadSgfButton={showDownloadSgf}
							showAiSenseiButton={showAiSenseiSgf}
							sgfLinkHref={sgfLinkHref}
							aiSenseiUploadHref={aiSenseiUploadHref}
							onOpenAiSensei={onOpenAiSensei}
							sgfDownloadFileName={sgfDownloadFileName}
							showStartNewGame={isSeatMode}
							onStartNewGame={onStartNewGame}
						/>
					) : null}
				</div>
			) : null}
			<div className={`game-side-slot ${isSharedMoveTreeVisible ? 'game-side-slot--with-move-tree' : ''}`}>
				{showClocks ? (
					<div className="player-clock player-clock--black" aria-live="polite">
						<div className="player-clock-label">Time</div>
						<div className={`player-clock-value ${isBlackInLastByoYomi ? 'player-clock-value--danger' : ''}`}>
							{formatClock(blackTimeMs)}
						</div>
						{blackByoYomiPeriodsLeft !== null ? (
							<div className="player-clock-periods">BYO: {formatByoYomiPeriods(blackByoYomiPeriodsLeft)}</div>
						) : null}
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
					{showLeaveSeatForBlack ? (
						<button className="game-side-button game-side-button--leave" type="button" onClick={onLeaveSeat}>
							Leave seat
						</button>
					) : null}
					{canShowJoinBlack ? (
						<button className="game-side-button game-side-button--black" type="button" onClick={onJoinBlack}>
							Join as Black
						</button>
					) : null}
				</div>
				{isSharedMoveTreeVisible ? (
					<div className="game-move-tree-slot">
						<MoveTreePanel
							moveTree={moveTree}
							currentMoveId={currentMoveId}
							currentMoveCount={currentMoveCount}
							onSelectMoveCount={onMoveToCount}
						/>
					</div>
				) : null}
			</div>
			<RightOptionsMenu
				isOpen={isOptionsPanelOpen}
				onToggle={handleToggleOptionsPanel}
				onIncreaseBoardScale={handleIncreaseBoardScale}
				onDecreaseBoardScale={handleDecreaseBoardScale}
				canIncreaseBoardScale={canIncreaseBoardScale}
				canDecreaseBoardScale={canDecreaseBoardScale}
				soundEnabled={soundEnabled}
				onToggleSound={onToggleSound}
				showDownloadBoardImageButton={showDownloadBoardImageInOptions}
				onDownloadBoardImage={handleDownloadBoardImage}
				showAiSenseiButton={showAiSenseiSgfInOptions}
				aiSenseiUploadHref={aiSenseiUploadHref}
				onOpenAiSensei={onOpenAiSensei}
				canShowExitMode={canShowExitMode}
				onExitMode={onExitMode}
			/>
			<InfoMenu
				isOpen={isInfoPanelOpen}
				onToggle={handleToggleInfoPanel}
				canShowBackToSetup={canShowExitMode}
				onBackToSetup={onExitMode}
			/>
		</div>
	)
}
