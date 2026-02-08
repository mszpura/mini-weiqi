import { useEffect, useState } from 'react'
import { useDiscordSdk } from '../../../hooks/useDiscordSdk'

type MenuProps = {
	onSharedGame?: () => void
}

export const Menu = ({ onSharedGame }: MenuProps) => {
	const { session, discordSdk, status } = useDiscordSdk()
	const user = session?.user
	const username = user?.username || 'Guest'
	const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null
	const [channelName, setChannelName] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		const loadChannelName = async () => {
			if (!discordSdk?.channelId || !discordSdk?.commands?.getChannel) {
				return
			}

			try {
				const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId })
				if (!cancelled) {
					setChannelName(channel?.name ?? null)
				}
			} catch {
				if (!cancelled) {
					setChannelName(null)
				}
			}
		}

		if (status === 'ready') {
			void loadChannelName()
		}

		return () => {
			cancelled = true
		}
	}, [discordSdk, status])

	return (
		<div>
			<div className="game-title">MINI WEIQI</div>
			<form className="menu-form" aria-label="Add form">
				<label className="menu-form-field">
					<span className="menu-form-label">Board size</span>
					<select className="menu-form-select" name="boardSize" defaultValue="9x9">
						<option value="9x9">9x9</option>
						<option value="13x13">13x13</option>
						<option value="19x19">19x19</option>
					</select>
				</label>
			</form>
			<button className="menu-button shared-game-button" type="button" onClick={onSharedGame}>
				Play
			</button>
			{channelName ? <div className="discord-channel">Channel: {channelName}</div> : null}
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
