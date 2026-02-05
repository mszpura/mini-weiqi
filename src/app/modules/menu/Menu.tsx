import { useDiscordSdk } from '../../../hooks/useDiscordSdk'

export const Menu = () => {
	const { session } = useDiscordSdk()
	const user = session?.user
	const username = user?.username || 'Guest'
	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
		: null

	return (
		<div>
			<div className="game-title">MINI WEIQI</div>
			<div className="discord-user-label">Connected players:</div>
			<div className="discord-user">
				{avatarUrl ? (
					<img className="discord-avatar" src={avatarUrl} alt={`${username} avatar`} />
				) : (
					<div className="discord-avatar placeholder" aria-hidden="true" />
				)}
				<div className="discord-username">{username}</div>
			</div>
		</div>
	)
}
