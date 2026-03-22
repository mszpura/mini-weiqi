import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove, type GameResult } from './models/game'
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

function AppContent({ onNavigate }: AppContentProps) {
	const { discordSdk, session } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const syncKeys = useMemo(
		() => ({
			gameBoard: ['game-board', channelKey],
			boardSize: ['board-size', channelKey],
			gameMode: ['game-mode', channelKey],
			gameStarted: ['game-started', channelKey],
			blackPlayer: ['player-black', channelKey],
			whitePlayer: ['player-white', channelKey],
			moves: ['game-moves', channelKey],
			gameResult: ['game-result', channelKey],
			displayedMoveCount: ['displayed-move-count', channelKey]
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [gameStarted, setGameStarted] = useSyncState(false, syncKeys.gameStarted)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
	const [gameResult, setGameResult] = useSyncState<GameResult | null>(null, syncKeys.gameResult)
	const [displayedMoveCount, setDisplayedMoveCount] = useSyncState(0, syncKeys.displayedMoveCount)
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
	const isUnauthenticated = !session?.user?.id

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
			shouldJumpToLatestMoveRef.current = true
			setMoves((previousMoves) => {
				const nextMoves = [...previousMoves, { type: 'play', y, x }]
				setDisplayedMoveCount(nextMoves.length)
				return nextMoves
			})
		},
		[gameStarted, setMoves]
	)

	const handlePassTurn = useCallback(() => {
		if (!gameStarted) return
		if (gameResult) return
		shouldJumpToLatestMoveRef.current = true
		setMoves((previousMoves) => {
			const nextMoves = [...previousMoves, { type: 'pass' }]
			setDisplayedMoveCount(nextMoves.length)
			return nextMoves
		})
	}, [gameResult, gameStarted, setMoves])

	const buildScoreFromMoves = useCallback(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		return game.score()
	}, [boardSize, moves])

	const handleResign = useCallback(() => {
		if (!gameStarted) return
		if (!playerColor || gameResult) return
		const score = buildScoreFromMoves()
		const winner = playerColor === 'black' ? 'white' : 'black'
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'resign',
			resignedBy: playerColor
		})
	}, [buildScoreFromMoves, gameResult, gameStarted, playerColor, setGameResult])

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
		setGameStarted(true)
	}, [setBlackPlayer, setGameResult, setGameStarted, setMoves, setWhitePlayer])

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
			setBoardSize(nextBoardSize)
		},
		[boardSize, setBlackPlayer, setBoardSize, setGameResult, setGameStarted, setMoves, setWhitePlayer]
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
				setMoves(parsed.game.moves)
				setDisplayedMoveCount(parsed.game.moves.length)
				setGameResult(null)
			} catch {
				window.alert('Failed to read SGF file.')
			}
		},
		[boardSize, setBoardSize, setGameResult, setMoves]
	)

	const handleExitMode = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameStarted(false)
	}, [setBlackPlayer, setGameResult, setGameStarted, setMoves, setWhitePlayer])

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

	const gameSnapshot = useMemo(() => {
		const game = new Game({ boardSize })
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
	}, [boardSize, shownMoves])

	const fullGameSnapshot = useMemo(() => {
		const game = new Game({ boardSize })
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
	}, [boardSize, moves])

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

	const handleDownloadSgf = useCallback(() => {
		if (!gameStarted) return
		if (gameMode !== 'normal') return
		if (!effectiveGameResult) return

		try {
			const sgf = serializeSgfContent(boardSize, moves)
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
	}, [boardSize, effectiveGameResult, gameMode, gameStarted, moves])

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
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					playerColor={playerColor}
					gameMode={gameMode}
					onGameModeChange={setGameMode}
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
