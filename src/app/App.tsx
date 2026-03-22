import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameClockState, type GameMode, type GameMove, type GameResult, type GameTimeLimit } from './models/game'
import type { PlayerSlot } from './models/player'
import { parseSgfContent, serializeSgfContent } from './models/sgf'
import './App.css'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'
import { PrivacyPolicyPage } from './modules/legal/PrivacyPolicyPage'
import { TermsOfServicePage } from './modules/legal/TermsOfServicePage'

export default function App() {
	const [pathname, setPathname] = useState(window.location.pathname)

	useEffect(() => {
		const handlePopstate = () => setPathname(window.location.pathname)
		window.addEventListener('popstate', handlePopstate)
		return () => window.removeEventListener('popstate', handlePopstate)
	}, [])

	const navigateTo = useCallback(
		(path: string) => {
			if (window.location.pathname === path) return
			window.history.pushState({}, '', path)
			setPathname(path)
		},
		[setPathname]
	)

	if (pathname === '/privacy-policy') {
		return <PrivacyPolicyPage onBackHome={() => navigateTo('/')} />
	}

	if (pathname === '/terms-of-service') {
		return <TermsOfServicePage onBackHome={() => navigateTo('/')} />
	}

	return (
		<DiscordContextProvider authenticate scope={['identify', 'guilds']}>
			<SyncContextProvider>
				<AppContent onNavigate={navigateTo} />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}

type AppContentProps = {
	onNavigate: (path: string) => void
}

const normalizeHandicapStones = (value: number) => {
	if (!Number.isInteger(value)) return 0
	if (value === 0) return 0
	if (value >= 2 && value <= 9) return value
	return 0
}

const FISHER_INITIAL_TIME_MS = 15 * 60 * 1000
const FISHER_INCREMENT_MS = 10 * 1000

const getFirstMoveColor = (handicapStones: number): 'black' | 'white' => (handicapStones > 0 ? 'white' : 'black')
const getOppositeColor = (color: 'black' | 'white'): 'black' | 'white' => (color === 'black' ? 'white' : 'black')

const settleActiveClock = (clock: GameClockState, nowMs: number) => {
	const elapsedMs = Math.max(0, nowMs - clock.turnStartedAtMs)
	const nextBlack = clock.activeColor === 'black' ? Math.max(0, clock.blackTimeMs - elapsedMs) : clock.blackTimeMs
	const nextWhite = clock.activeColor === 'white' ? Math.max(0, clock.whiteTimeMs - elapsedMs) : clock.whiteTimeMs
	return {
		blackTimeMs: nextBlack,
		whiteTimeMs: nextWhite
	}
}

const applyFisherMove = (clock: GameClockState, nowMs: number): GameClockState => {
	const settled = settleActiveClock(clock, nowMs)
	if (clock.activeColor === 'black') {
		return {
			blackTimeMs: settled.blackTimeMs + FISHER_INCREMENT_MS,
			whiteTimeMs: settled.whiteTimeMs,
			activeColor: 'white',
			turnStartedAtMs: nowMs
		}
	}
	return {
		blackTimeMs: settled.blackTimeMs,
		whiteTimeMs: settled.whiteTimeMs + FISHER_INCREMENT_MS,
		activeColor: 'black',
		turnStartedAtMs: nowMs
	}
}

function AppContent({ onNavigate }: AppContentProps) {
	const { discordSdk, session } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const syncKeys = useMemo(
		() => ({
			gameBoard: ['game-board', channelKey],
			boardSize: ['board-size', channelKey],
			handicapStones: ['handicap-stones', channelKey],
			gameMode: ['game-mode', channelKey],
			gameStarted: ['game-started', channelKey],
			blackPlayer: ['player-black', channelKey],
			whitePlayer: ['player-white', channelKey],
			moves: ['game-moves', channelKey],
			gameResult: ['game-result', channelKey],
			displayedMoveCount: ['displayed-move-count', channelKey],
			timeLimit: ['time-limit', channelKey],
			gameClock: ['game-clock', channelKey]
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [handicapStones, setHandicapStones] = useSyncState(0, syncKeys.handicapStones)
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [gameStarted, setGameStarted] = useSyncState(false, syncKeys.gameStarted)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
	const [gameResult, setGameResult] = useSyncState<GameResult | null>(null, syncKeys.gameResult)
	const [displayedMoveCount, setDisplayedMoveCount] = useSyncState(0, syncKeys.displayedMoveCount)
	const [timeLimit, setTimeLimit] = useSyncState<GameTimeLimit>('no-limit', syncKeys.timeLimit)
	const [gameClock, setGameClock] = useSyncState<GameClockState | null>(null, syncKeys.gameClock)
	const [clockTick, setClockTick] = useState(0)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const previousMovesLengthRef = useRef(0)
	const shouldJumpToLatestMoveRef = useRef(false)
	const user = session?.user

	const currentPlayer = user
		? {
				id: user.id,
				username: user.username,
				avatar: user.avatar ?? null
			}
		: null

	const playerColor =
		currentPlayer?.id === blackPlayer?.id ? 'black' : currentPlayer?.id === whitePlayer?.id ? 'white' : null
	const isSeated = currentPlayer?.id === blackPlayer?.id || currentPlayer?.id === whitePlayer?.id
	const areBothSeatsTaken = Boolean(blackPlayer && whitePlayer)
	const isUnauthenticated = !session?.user?.id
	const effectiveHandicapStones = normalizeHandicapStones(handicapStones)

	const handleJoinBlack = () => {
		if (!gameStarted) return
		if (isUnauthenticated) return
		if (!currentPlayer || blackPlayer || isSeated) return
		setBlackPlayer(currentPlayer)
	}

	const handleJoinWhite = () => {
		if (!gameStarted) return
		if (isUnauthenticated) return
		if (!currentPlayer || whitePlayer || isSeated) return
		setWhitePlayer(currentPlayer)
	}

	const handlePlayMove = useCallback(
		(y: number, x: number) => {
			if (!gameStarted) return
			if (gameResult) return
			if (gameMode === 'normal' && !areBothSeatsTaken) return
			const nowMs = Date.now()
			if (gameMode === 'normal' && timeLimit === 'fisher-15-10' && gameClock) {
				setGameClock(applyFisherMove(gameClock, nowMs))
			}
			shouldJumpToLatestMoveRef.current = true
			setMoves((previousMoves) => {
				const nextMoves = [...previousMoves, { type: 'play', y, x }]
				setDisplayedMoveCount(nextMoves.length)
				return nextMoves
			})
		},
		[areBothSeatsTaken, gameClock, gameMode, gameResult, gameStarted, setGameClock, setMoves, timeLimit]
	)

	const handlePassTurn = useCallback(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (gameMode === 'normal' && !areBothSeatsTaken) return
		const nowMs = Date.now()
		if (gameMode === 'normal' && timeLimit === 'fisher-15-10' && gameClock) {
			setGameClock(applyFisherMove(gameClock, nowMs))
		}
		shouldJumpToLatestMoveRef.current = true
		setMoves((previousMoves) => {
			const nextMoves = [...previousMoves, { type: 'pass' }]
			setDisplayedMoveCount(nextMoves.length)
			return nextMoves
		})
	}, [areBothSeatsTaken, gameClock, gameMode, gameResult, gameStarted, setGameClock, setMoves, timeLimit])

	const buildScoreFromMoves = useCallback(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		return game.score()
	}, [boardSize, effectiveHandicapStones, moves])

	const handleResign = useCallback(() => {
		if (!gameStarted) return
		if (!playerColor || gameResult) return
		if (gameMode === 'normal' && !areBothSeatsTaken) return
		const score = buildScoreFromMoves()
		const winner = playerColor === 'black' ? 'white' : 'black'
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'resign',
			resignedBy: playerColor
		})
	}, [areBothSeatsTaken, buildScoreFromMoves, gameMode, gameResult, gameStarted, playerColor, setGameResult])

	const handleImportSgf = useCallback(() => {
		if (!gameStarted) return
		if (gameMode !== 'shared') return
		fileInputRef.current?.click()
	}, [gameMode, gameStarted])

	const handleStartGame = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameClock(null)
		setGameStarted(true)
	}, [setBlackPlayer, setGameClock, setGameResult, setGameStarted, setMoves, setWhitePlayer])

	const handleHandicapChange = useCallback(
		(nextHandicapStones: number) => {
			if (nextHandicapStones === handicapStones) return
			shouldJumpToLatestMoveRef.current = false
			previousMovesLengthRef.current = 0
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStarted(false)
			setGameClock(null)
			setHandicapStones(normalizeHandicapStones(nextHandicapStones))
		},
		[handicapStones, setBlackPlayer, setGameClock, setGameResult, setGameStarted, setHandicapStones, setMoves, setWhitePlayer]
	)

	const handleBoardSizeChange = useCallback(
		(nextBoardSize: number) => {
			if (nextBoardSize === boardSize) return
			shouldJumpToLatestMoveRef.current = false
			previousMovesLengthRef.current = 0
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStarted(false)
			setGameClock(null)
			setBoardSize(nextBoardSize)
		},
		[boardSize, setBlackPlayer, setBoardSize, setGameClock, setGameResult, setGameStarted, setMoves, setWhitePlayer]
	)

	const handleSgfFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			event.target.value = ''
			if (!file) return

			if (!file.name.toLowerCase().endsWith('.sgf')) {
				window.alert('Please select a .sgf file.')
				return
			}

			try {
				const content = await file.text()
				const parsed = parseSgfContent(content, boardSize)
				if (!parsed.ok) {
					window.alert(parsed.error)
					return
				}
				const importedBoardSize = parsed.game.boardSize ?? boardSize
				if (importedBoardSize !== boardSize) {
					setBoardSize(importedBoardSize)
				}
				setHandicapStones(normalizeHandicapStones(parsed.game.handicapStones ?? 0))
				setMoves(parsed.game.moves)
				setDisplayedMoveCount(parsed.game.moves.length)
				setGameResult(null)
			} catch {
				window.alert('Failed to read SGF file.')
			}
		},
		[boardSize, setBoardSize, setGameResult, setHandicapStones, setMoves]
	)

	const handleExitMode = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameStarted(false)
		setGameClock(null)
	}, [setBlackPlayer, setGameClock, setGameResult, setGameStarted, setMoves, setWhitePlayer])

	const handleTimeLimitChange = useCallback(
		(nextTimeLimit: GameTimeLimit) => {
			if (nextTimeLimit === timeLimit) return
			shouldJumpToLatestMoveRef.current = false
			previousMovesLengthRef.current = 0
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStarted(false)
			setGameClock(null)
			setTimeLimit(nextTimeLimit)
		},
		[
			setBlackPlayer,
			setDisplayedMoveCount,
			setGameClock,
			setGameResult,
			setGameStarted,
			setMoves,
			setTimeLimit,
			setWhitePlayer,
			timeLimit
		]
	)

	useEffect(() => {
		const previousLength = previousMovesLengthRef.current
		const currentLength = moves.length

		if (gameMode !== 'shared') {
			shouldJumpToLatestMoveRef.current = false
			setDisplayedMoveCount(currentLength)
			previousMovesLengthRef.current = currentLength
			return
		}

		const shouldJumpToLatest = shouldJumpToLatestMoveRef.current && currentLength > previousLength
		if (shouldJumpToLatest) {
			shouldJumpToLatestMoveRef.current = false
			setDisplayedMoveCount(currentLength)
			previousMovesLengthRef.current = currentLength
			return
		}

		if (displayedMoveCount > currentLength) {
			setDisplayedMoveCount(currentLength)
		} else if (displayedMoveCount === previousLength) {
			setDisplayedMoveCount(currentLength)
		}

		previousMovesLengthRef.current = currentLength
	}, [displayedMoveCount, gameMode, moves.length])

	const shownMoves = useMemo(() => moves.slice(0, displayedMoveCount), [displayedMoveCount, moves])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (gameMode !== 'normal') return
		if (timeLimit !== 'fisher-15-10') return
		if (!gameClock) return

		const intervalId = window.setInterval(() => {
			setClockTick((value) => value + 1)
		}, 250)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [gameClock, gameMode, gameResult, gameStarted, timeLimit])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (gameMode !== 'normal') return
		if (timeLimit !== 'fisher-15-10') return
		if (!gameClock) return

		const nowMs = Date.now()
		const settled = settleActiveClock(gameClock, nowMs)
		const activeRemaining = gameClock.activeColor === 'black' ? settled.blackTimeMs : settled.whiteTimeMs
		if (activeRemaining > 0) return
		const timedOutBy = gameClock.activeColor
		const winner = getOppositeColor(timedOutBy)
		const score = buildScoreFromMoves()
		setGameClock({
			...settled,
			activeColor: gameClock.activeColor,
			turnStartedAtMs: nowMs
		})
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'time',
			timedOutBy
		})
	}, [buildScoreFromMoves, clockTick, gameClock, gameMode, gameResult, gameStarted, setGameClock, setGameResult, timeLimit])

	const displayedClocks = useMemo(() => {
		if (!gameStarted || gameMode !== 'normal' || timeLimit !== 'fisher-15-10') return null
		if (!gameClock) {
			return {
				blackTimeMs: FISHER_INITIAL_TIME_MS,
				whiteTimeMs: FISHER_INITIAL_TIME_MS
			}
		}
		const nowMs = Date.now()
		const settled =
			gameStarted && !gameResult && gameMode === 'normal' && timeLimit === 'fisher-15-10'
				? settleActiveClock(gameClock, nowMs)
				: { blackTimeMs: gameClock.blackTimeMs, whiteTimeMs: gameClock.whiteTimeMs }
		return {
			blackTimeMs: settled.blackTimeMs,
			whiteTimeMs: settled.whiteTimeMs
		}
	}, [clockTick, gameClock, gameMode, gameResult, gameStarted, timeLimit])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (gameMode !== 'normal') return
		if (timeLimit !== 'fisher-15-10') return
		if (gameClock) return
		if (!areBothSeatsTaken) return

		setGameClock({
			blackTimeMs: FISHER_INITIAL_TIME_MS,
			whiteTimeMs: FISHER_INITIAL_TIME_MS,
			activeColor: getFirstMoveColor(effectiveHandicapStones),
			turnStartedAtMs: Date.now()
		})
	}, [areBothSeatsTaken, effectiveHandicapStones, gameClock, gameMode, gameResult, gameStarted, setGameClock, timeLimit])

	const gameSnapshot = useMemo(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
		for (const move of shownMoves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}

		const state = game.currentState()
		const score = game.score()
		return {
			isOver: game.isOver(),
			black: state.whiteStonesCaptured,
			white: state.blackStonesCaptured,
			score
		}
	}, [boardSize, effectiveHandicapStones, shownMoves])

	const fullGameSnapshot = useMemo(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		const score = game.score()
		return {
			isOver: game.isOver(),
			score
		}
	}, [boardSize, effectiveHandicapStones, moves])

	const effectiveGameResult = useMemo<GameResult | null>(() => {
		if (gameResult) return gameResult
		if (!fullGameSnapshot.isOver) return null
		const blackScore = fullGameSnapshot.score.black
		const whiteScore = fullGameSnapshot.score.white
		return {
			winner: blackScore === whiteScore ? 'draw' : blackScore > whiteScore ? 'black' : 'white',
			blackScore,
			whiteScore,
			reason: 'finished'
		}
	}, [fullGameSnapshot, gameResult])

	useEffect(() => {
		if (gameStarted) return
		if (gameMode === 'normal') return
		if (timeLimit === 'no-limit') return
		setTimeLimit('no-limit')
	}, [gameMode, gameStarted, setTimeLimit, timeLimit])

	const handleDownloadSgf = useCallback(() => {
		if (!gameStarted) return
		if (gameMode !== 'normal') return
		if (!effectiveGameResult) return

		try {
			const sgf = serializeSgfContent(boardSize, moves, effectiveHandicapStones)
			const file = new Blob([sgf], { type: 'application/x-go-sgf;charset=utf-8' })
			const url = window.URL.createObjectURL(file)
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const link = document.createElement('a')
			link.href = url
			link.download = `mini-weiqi-${boardSize}x${boardSize}-${timestamp}.sgf`
			document.body.append(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to generate SGF file.'
			window.alert(message)
		}
	}, [boardSize, effectiveGameResult, effectiveHandicapStones, gameMode, gameStarted, moves])

	const handleMoveToStart = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount(0)
	}, [gameMode])

	const handleMoveBackward = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount((current) => Math.max(0, current - 1))
	}, [gameMode])

	const handleMoveForward = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount((current) => Math.min(moves.length, current + 1))
	}, [gameMode, moves.length])

	const handleMoveToEnd = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount(moves.length)
	}, [gameMode, moves.length])

	if (showGameBoard) {
		return (
			<div className="app-shell app-shell--board">
				<input ref={fileInputRef} type="file" accept=".sgf" hidden onChange={handleSgfFileChange} />
				<GameBoard
					boardSize={boardSize}
					onBoardSizeChange={handleBoardSizeChange}
					handicapStones={effectiveHandicapStones}
					onHandicapChange={handleHandicapChange}
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					playerColor={playerColor}
					gameMode={gameMode}
					onGameModeChange={setGameMode}
					timeLimit={timeLimit}
					onTimeLimitChange={handleTimeLimitChange}
					gameStarted={gameStarted}
					onStartGame={handleStartGame}
					moves={shownMoves}
					capturedByBlack={gameSnapshot.black}
					capturedByWhite={gameSnapshot.white}
					isViewingLatestMove={displayedMoveCount === moves.length}
					canMoveBackward={displayedMoveCount > 0}
					canMoveForward={displayedMoveCount < moves.length}
					onMoveToStart={handleMoveToStart}
					onMoveBackward={handleMoveBackward}
					onMoveForward={handleMoveForward}
					onMoveToEnd={handleMoveToEnd}
					onPlayMove={handlePlayMove}
					onPassTurn={handlePassTurn}
					onResign={handleResign}
					onImportSgf={handleImportSgf}
					onDownloadSgf={handleDownloadSgf}
					gameResult={effectiveGameResult}
					blackTimeMs={displayedClocks?.blackTimeMs ?? null}
					whiteTimeMs={displayedClocks?.whiteTimeMs ?? null}
					onExitMode={handleExitMode}
					hideJoinButtons={isUnauthenticated}
				/>
			</div>
		)
	}

	return (
		<div className="app-shell app-shell--menu">
			<Menu
				onStart={() => setShowGameBoard(true)}
				onOpenPrivacyPolicy={() => onNavigate('/privacy-policy')}
				onOpenTermsOfService={() => onNavigate('/terms-of-service')}
			/>
		</div>
	)
}
