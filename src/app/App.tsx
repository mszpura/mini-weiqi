import { DiscordContextProvider } from '../hooks/useDiscordSdk'
import { Menu } from './Menu'
import { SyncContextProvider } from '@robojs/sync'
import './App.css'

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
		<DiscordContextProvider>
			<SyncContextProvider>
				<Menu />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}
