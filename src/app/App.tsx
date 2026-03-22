import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useMemo } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove, type GameResult } from './models/game'
import type { PlayerSlot } from './models/player'
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
			setMoves((previousMoves) => [...previousMoves, { type: 'play', y, x }])
		},
		[setMoves]
	)

	const handlePassTurn = useCallback(() => {
		if (gameResult) return
		setMoves((previousMoves) => [...previousMoves, { type: 'pass' }])
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

	const handleReturnToMenu = useCallback(() => {
		setMoves([])
		setGameResult(null)
		setShowGameBoard(false)
	}, [setGameResult, setMoves, setShowGameBoard])

	const gameSnapshot = useMemo(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
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
	}, [boardSize, moves])

	const effectiveGameResult = useMemo<GameResult | null>(() => {
		if (gameResult) return gameResult
		if (!gameSnapshot.isOver) return null
		const blackScore = gameSnapshot.score.black
		const whiteScore = gameSnapshot.score.white
		return {
			winner: blackScore === whiteScore ? 'draw' : blackScore > whiteScore ? 'black' : 'white',
			blackScore,
			whiteScore,
			reason: 'finished'
		}
	}, [gameResult, gameSnapshot])

	if (showGameBoard) {
		return (
			<div className="app-shell app-shell--board">
				<GameBoard
					boardSize={boardSize}
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					playerColor={playerColor}
					gameMode={gameMode}
					moves={moves}
					capturedByBlack={gameSnapshot.black}
					capturedByWhite={gameSnapshot.white}
					onPlayMove={handlePlayMove}
					onPassTurn={handlePassTurn}
					onResign={handleResign}
					gameResult={effectiveGameResult}
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
