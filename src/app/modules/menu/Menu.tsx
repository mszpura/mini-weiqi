import { useEffect, useState } from 'react'
import { useDiscordSdk } from '../../../hooks/useDiscordSdk'
import { featureFlags } from '../../config/featureFlags'

type MenuProps = {
	onStart: () => void
	onOpenPrivacyPolicy: () => void
	onOpenTermsOfService: () => void
}

export const Menu = ({ onStart, onOpenPrivacyPolicy, onOpenTermsOfService }: MenuProps) => {
	const { session, discordSdk, status } = useDiscordSdk()
	const user = session?.user
	const username = user?.username || 'Logged as Guest'
	const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null
	const [channelName, setChannelName] = useState<string | null>(null)

	useEffect(() => {
		if (!featureFlags.channelName) {
			setChannelName(null)
			return
		}

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
			<img className="game-title" src="/logo.png" alt="Mini Weiqi" />
			<button className="menu-button shared-game-button" type="button" onClick={onStart} aria-label="Start game">
				<img className="menu-button-image" src="/play_button.png" alt="" />
			</button>
			{featureFlags.channelName && channelName ? <div className="discord-channel">Channel: {channelName}</div> : null}
			<div className="discord-user">
				{avatarUrl ? (
					<img className="discord-avatar" src={avatarUrl} alt={`${username} avatar`} />
				) : (
					<div className="discord-avatar placeholder" aria-hidden="true" />
				)}
				<div className="discord-username">{username}</div>
			</div>
			<a href="https://buymeacoffee.com/szpur" target="_blank" rel="noreferrer">
				Buy me a coffee
			</a>
			<div className="menu-legal-links">
				<button type="button" className="menu-legal-link" onClick={onOpenPrivacyPolicy}>
					Privacy Policy
				</button>
				<button type="button" className="menu-legal-link" onClick={onOpenTermsOfService}>
					Terms of Service
				</button>
			</div>
		</div>
	)
}
