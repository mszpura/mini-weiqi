import { featureFlags } from '../../config/featureFlags'

type InfoMenuProps = {
	isOpen: boolean
	onToggle: () => void
}

export const InfoMenu = ({ isOpen, onToggle }: InfoMenuProps) => {
	return (
		<>
			<button
				className="game-info-toggle"
				type="button"
				onClick={onToggle}
				aria-expanded={isOpen}
				aria-controls="game-info-panel"
			>
				Info
			</button>
			{isOpen ? (
				<aside className="game-info-panel" id="game-info-panel">
					<div className="game-options-panel-title">Info</div>
					<div className="game-options-panel-group game-info-panel-group">
						<div className="game-board-size-label">Normal mode</div>
						<p className="game-info-text">
							At least two players are required, and they must take seats as Black and White before playing. Each player
							controls one color and plays only on their own turn. You can pass when it is your turn, resign if you want
							to end early, and the game also ends after two consecutive passes.
						</p>
					</div>
					<div className="game-info-divider" />
					<div className="game-options-panel-group game-info-panel-group">
						<div className="game-board-size-label">Shared mode</div>
						<p className="game-info-text">
							Everyone in the room can place stones and review moves together. Use it for collaborative analysis,
							teaching, or replaying games with import and navigation controls. In Shared mode, players can import SGF
							from the Options menu.
						</p>
					</div>
					{featureFlags.oneColorGo ? (
						<>
							<div className="game-info-divider" />
							<div className="game-options-panel-group game-info-panel-group">
								<div className="game-board-size-label">One Color GO</div>
								<p className="game-info-text">
									Play with normal Black/White turn order and full Go rules, but render every stone in a single selected
									color. This mode is intentionally visual-only, so players must remember who played each move.
								</p>
							</div>
						</>
					) : null}
					<div className="game-info-divider" />
					<div className="game-options-panel-group game-info-panel-group">
						<div className="game-board-size-label">Time limit</div>
						<p className="game-info-text">
							Time limits are used in Normal mode only. With Fisher time, each player starts with the selected main
							time, and after every move or pass that player receives the increment bonus. If your clock reaches zero,
							you lose on time.
						</p>
					</div>
					<div className="game-info-divider" />
					<div className="game-options-panel-group game-info-panel-group">
						<div className="game-board-size-label">Handicap</div>
						<p className="game-info-text">
							Handicap places extra Black stones on the board before the game starts to balance player strength. When
							handicap is greater than zero, White takes the first turn after those stones are placed.
						</p>
					</div>
				</aside>
			) : null}
		</>
	)
}
