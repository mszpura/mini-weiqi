import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import './App.css'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'

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
	const { discordSdk } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const [showGameBoard, setShowGameBoard] = useSyncState(false, ['game-board', channelKey])
	const [boardSize, setBoardSize] = useSyncState(19, ['board-size', channelKey])

	if (showGameBoard) {
		return <GameBoard boardSize={boardSize} />
	}

	return (
		<Menu
			onSharedGame={() => setShowGameBoard(true)}
			boardSize={boardSize}
			onBoardSizeChange={setBoardSize}
		/>
	)
}
