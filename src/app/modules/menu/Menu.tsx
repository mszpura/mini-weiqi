import { useEffect, useState } from 'react'
import { useDiscordSdk } from '../../../hooks/useDiscordSdk'
import type { GameMode } from '../../models/game'

type MenuProps = {
	onSharedGame?: () => void
	boardSize: number
	onBoardSizeChange: (size: number) => void
	gameMode: GameMode
	onGameModeChange: (mode: GameMode) => void
}

export const Menu = ({ onSharedGame, boardSize, onBoardSizeChange, gameMode, onGameModeChange }: MenuProps) => {
	const { session, discordSdk, status } = useDiscordSdk()
	const user = session?.user
	const username = user?.username || 'Logged as Guest'
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
			<img className="game-title" src="/logo.png" alt="Mini Weiqi" />
			<form className="menu-form" aria-label="Add form">
				<label className="menu-form-field">
					<span className="menu-form-label">Game Mode</span>
					<select
						className="menu-form-select"
						name="gameMode"
						value={gameMode}
						onChange={(event) => onGameModeChange(event.target.value as GameMode)}
					>
						<option value="normal">Normal Game</option>
						<option value="rengo">Rengo</option>
						<option value="shared">Shared Game</option>
					</select>
				</label>
				<label className="menu-form-field">
					<span className="menu-form-label">Board size</span>
					<select
						className="menu-form-select"
						name="boardSize"
						value={boardSize}
						onChange={(event) => onBoardSizeChange(Number(event.target.value))}
					>
						<option value={9}>9x9</option>
						<option value={13}>13x13</option>
						<option value={19}>19x19</option>
					</select>
				</label>
			</form>
			<button className="menu-button shared-game-button" type="button" onClick={onSharedGame} aria-label="Play">
				<img className="menu-button-image" src="/play_button.png" alt="" />
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
