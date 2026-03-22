import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove, type GameResult } from './models/game'
import type { PlayerSlot } from './models/player'
import { parseSgfContent } from './models/sgf'
import './App.css'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'

export default function App() {
	return (
		<DiscordContextProvider authenticate scope={['identify', 'guilds']}>
			<SyncContextProvider>
				<AppContent />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}

function AppContent() {
	const { discordSdk, session } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const syncKeys = useMemo(
		() => ({
			gameBoard: ['game-board', channelKey],
			boardSize: ['board-size', channelKey],
			gameMode: ['game-mode', channelKey],
			blackPlayer: ['player-black', channelKey],
			whitePlayer: ['player-white', channelKey],
			moves: ['game-moves', channelKey],
			gameResult: ['game-result', channelKey]
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
	const [gameResult, setGameResult] = useSyncState<GameResult | null>(null, syncKeys.gameResult)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [displayedMoveCount, setDisplayedMoveCount] = useState(0)
	const previousMovesLengthRef = useRef(0)
	const user = session?.user
	
	const currentPlayer = user
		? {
				id: user.id,
				username: user.username,
				avatar: user.avatar ?? null
			}
		: null

	const playerColor = currentPlayer?.id === blackPlayer?.id ? 'black' : currentPlayer?.id === whitePlayer?.id ? 'white' : null
	const isSeated = currentPlayer?.id === blackPlayer?.id || currentPlayer?.id === whitePlayer?.id
	const isUnauthenticated = !session?.user?.id

	const handleJoinBlack = () => {
		if (isUnauthenticated) return
		if (!currentPlayer || blackPlayer || isSeated) return
		setBlackPlayer(currentPlayer)
	}

	const handleJoinWhite = () => {
		if (isUnauthenticated) return
		if (!currentPlayer || whitePlayer || isSeated) return
		setWhitePlayer(currentPlayer)
	}

	const handlePlayMove = useCallback(
		(y: number, x: number) => {
			setMoves((previousMoves) => {
				const nextMoves = [...previousMoves, { type: 'play', y, x }]
				setDisplayedMoveCount(nextMoves.length)
				return nextMoves
			})
		},
		[setMoves]
	)

	const handlePassTurn = useCallback(() => {
		if (gameResult) return
		setMoves((previousMoves) => {
			const nextMoves = [...previousMoves, { type: 'pass' }]
			setDisplayedMoveCount(nextMoves.length)
			return nextMoves
		})
	}, [gameResult, setMoves])

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
	}, [buildScoreFromMoves, gameResult, playerColor, setGameResult])

	const handleImportSgf = useCallback(() => {
		if (gameMode !== 'shared') return
		fileInputRef.current?.click()
	}, [gameMode])

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
				setMoves(parsed.game.moves)
				setDisplayedMoveCount(parsed.game.moves.length)
				if (parsed.game.boardSize && parsed.game.boardSize !== boardSize) {
					setBoardSize(parsed.game.boardSize)
				}
				setGameResult(null)
			} catch {
				window.alert('Failed to read SGF file.')
			}
		},
		[boardSize, setBoardSize, setGameResult, setMoves]
	)

	const handleReturnToMenu = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setShowGameBoard(false)
	}, [setBlackPlayer, setGameResult, setMoves, setShowGameBoard, setWhitePlayer])

	const handleNewGame = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
	}, [setBlackPlayer, setGameResult, setMoves, setWhitePlayer])

	useEffect(() => {
		const previousLength = previousMovesLengthRef.current
		const currentLength = moves.length

		if (gameMode !== 'shared') {
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
				<input
					ref={fileInputRef}
					type="file"
					accept=".sgf"
					hidden
					onChange={handleSgfFileChange}
				/>
				<GameBoard
					boardSize={boardSize}
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					playerColor={playerColor}
					gameMode={gameMode}
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
					gameResult={effectiveGameResult}
					onNewGame={handleNewGame}
					onReturnToMenu={handleReturnToMenu}
					hideJoinButtons={isUnauthenticated}
				/>
			</div>
		)
	}

	return (
		<div className="app-shell app-shell--menu">
			<Menu
				onSharedGame={() => setShowGameBoard(true)}
				boardSize={boardSize}
				onBoardSizeChange={setBoardSize}
				gameMode={gameMode}
				onGameModeChange={setGameMode}
			/>
		</div>
	)
}
