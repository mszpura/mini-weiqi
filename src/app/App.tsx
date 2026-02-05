import { DiscordContextProvider } from '../hooks/useDiscordSdk'
import { SyncContextProvider } from '@robojs/sync'
import './App.css'
import { Menu } from './modules/menu/Menu'

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
				<Menu />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}
