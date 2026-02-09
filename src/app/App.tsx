import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect } from 'react'
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
	const [showGameBoard, setShowGameBoard] = useSyncState(false, ['game-board', channelKey])
	const [boardSize, setBoardSize] = useSyncState(19, ['board-size', channelKey])
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', ['game-mode', channelKey])
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, ['player-black', channelKey])
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, ['player-white', channelKey])
	const [moves, setMoves] = useSyncState<GameMove[]>([], ['game-moves', channelKey])
	const [capturedStones, setCapturedStones] = useSyncState({ black: 0, white: 0 }, ['captured-stones', channelKey])
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

	useEffect(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
			game.playAt(move.y, move.x)
		}

		const state = game.currentState()
		const nextCapturedStones = {
			black: state.whiteStonesCaptured,
			white: state.blackStonesCaptured
		}

		setCapturedStones((current) =>
			current.black === nextCapturedStones.black && current.white === nextCapturedStones.white
				? current
				: nextCapturedStones
		)
	}, [boardSize, moves, setCapturedStones])

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
