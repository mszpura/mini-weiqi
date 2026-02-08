import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import './App.css'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'

type PlayerSlot = {
	id: string
	username: string
	avatar: string | null
}

/**
 * 🔒 Set `authenticate` to true to enable Discord authentication
 * You can also set the `scope` prop to request additional permissions
 *
 * Example:
 * ```tsx
 * <DiscordContextProvider authenticate scope={['identify', 'guilds']}>
 * ```
 */
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
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, ['player-black', channelKey])
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, ['player-white', channelKey])
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

	const handleJoinBlack = () => {
		if (!currentPlayer || blackPlayer || isSeated) return
		setBlackPlayer(currentPlayer)
	}

	const handleJoinWhite = () => {
		if (!currentPlayer || whitePlayer || isSeated) return
		if (!blackPlayer) {
			setBlackPlayer(currentPlayer)
			return
		}
		setWhitePlayer(currentPlayer)
	}

	if (showGameBoard) {
		return (
			<GameBoard
				boardSize={boardSize}
				blackPlayer={blackPlayer}
				whitePlayer={whitePlayer}
				onJoinBlack={handleJoinBlack}
				onJoinWhite={handleJoinWhite}
				playerColor={playerColor}
			/>
		)
	}

	return (
		<Menu
			onSharedGame={() => setShowGameBoard(true)}
			boardSize={boardSize}
			onBoardSizeChange={setBoardSize}
		/>
	)
}
