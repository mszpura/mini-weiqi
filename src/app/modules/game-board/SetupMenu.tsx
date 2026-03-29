import { getTimeLimitOptionsForBoardSize, type GameMode, type GameTimeLimit } from '../../models/game'

type SetupMenuProps = {
	gameMode: GameMode
	onGameModeChange: (mode: GameMode) => void
	boardSize: number
	onBoardSizeChange: (size: number) => void
	timeLimit: GameTimeLimit
	onTimeLimitChange: (timeLimit: GameTimeLimit) => void
	handicapStones: number
	onHandicapChange: (stones: number) => void
	onStartGame: () => void
}

export const SetupMenu = ({
	gameMode,
	onGameModeChange,
	boardSize,
	onBoardSizeChange,
	timeLimit,
	onTimeLimitChange,
	handicapStones,
	onHandicapChange,
	onStartGame
}: SetupMenuProps) => {
	const timeLimitOptions = getTimeLimitOptionsForBoardSize(boardSize)

	return (
		<div className="game-setup-popup" role="dialog" aria-label="Game setup">
			<div className="game-options-panel-title">Setup</div>
			<div className="game-options-panel-group">
				<div className="game-board-size-label">Game Mode</div>
				<select
					className="game-options-select"
					name="gameMode"
					value={gameMode}
					onChange={(event) => onGameModeChange(event.target.value as GameMode)}
				>
					<option value="normal">Normal Game</option>
					<option value="shared">Shared Game</option>
				</select>
			</div>
			<div className="game-options-panel-group">
				<div className="game-board-size-label">Board Size</div>
				<select
					className="game-options-select"
					name="boardSize"
					value={boardSize}
					onChange={(event) => onBoardSizeChange(Number(event.target.value))}
				>
					<option value={9}>9x9</option>
					<option value={13}>13x13</option>
					<option value={19}>19x19</option>
				</select>
			</div>
			{gameMode === 'normal' ? (
				<div className="game-options-panel-group">
					<div className="game-board-size-label">Time limit</div>
					<select
						className="game-options-select"
						name="timeLimit"
						value={timeLimit}
						onChange={(event) => onTimeLimitChange(event.target.value as GameTimeLimit)}
					>
						{timeLimitOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			) : null}
			<div className="game-options-panel-group">
				<div className="game-board-size-label">Handicap</div>
				<select
					className="game-options-select"
					name="handicapStones"
					value={handicapStones}
					onChange={(event) => onHandicapChange(Number(event.target.value))}
				>
					<option value={0}>0</option>
					<option value={1} disabled>
						1 (unsupported)
					</option>
					<option value={2}>2</option>
					<option value={3}>3</option>
					<option value={4}>4</option>
					<option value={5}>5</option>
					<option value={6}>6</option>
					<option value={7}>7</option>
					<option value={8}>8</option>
					<option value={9}>9</option>
				</select>
			</div>
			<div className="game-options-panel-group">
				<button className="game-side-button game-side-button--start" type="button" onClick={onStartGame}>
					Start
				</button>
			</div>
			<div className="game-options-panel-group">
				<p className="game-setup-info-hint">
					Need help? Use the <strong>Info</strong> button at the bottom-left to view detailed rules for game modes, time
					limits, and handicap settings.
				</p>
			</div>
		</div>
	)
}
