import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useMemo } from 'react'
import { Game } from 'tenuki'
import type { GameMode, GameMove } from './models/game'
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
			gameBoard: ['game-board', channelKey] as const,
			boardSize: ['board-size', channelKey] as const,
			gameMode: ['game-mode', channelKey] as const,
			blackPlayer: ['player-black', channelKey] as const,
			whitePlayer: ['player-white', channelKey] as const,
			moves: ['game-moves', channelKey] as const
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
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
		if (!blackPlayer) {
			setBlackPlayer(currentPlayer)
			return
		}
		setWhitePlayer(currentPlayer)
	}

	const handlePlayMove = useCallback(
		(y: number, x: number) => {
			setMoves((previousMoves) => [...previousMoves, { y, x }])
		},
		[setMoves]
	)

	const capturedStones = useMemo(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
			game.playAt(move.y, move.x)
		}

		const state = game.currentState()
		return {
			black: state.whiteStonesCaptured,
			white: state.blackStonesCaptured
		}
	}, [boardSize, moves])

	if (showGameBoard) { 
		return (
			<GameBoard
				boardSize={boardSize}
				blackPlayer={blackPlayer}
				whitePlayer={whitePlayer}
				onJoinBlack={handleJoinBlack}
				onJoinWhite={handleJoinWhite}
				playerColor={playerColor}
				gameMode={gameMode}
				moves={moves}
				capturedByBlack={capturedStones.black}
				capturedByWhite={capturedStones.white}
				onPlayMove={handlePlayMove}
				hideJoinButtons={isUnauthenticated}
			/>
		)
	}

	return (
		<Menu
			onSharedGame={() => setShowGameBoard(true)}
			boardSize={boardSize}
			onBoardSizeChange={setBoardSize}
			gameMode={gameMode}
			onGameModeChange={setGameMode}
		/>
	)
}
