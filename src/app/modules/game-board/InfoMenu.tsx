import { featureFlags } from '../../config/featureFlags'

type InfoMenuProps = {
	isOpen: boolean
	onToggle: () => void
	canShowBackToSetup: boolean
	onBackToSetup: () => void
}

export const InfoMenu = ({ isOpen, onToggle, canShowBackToSetup, onBackToSetup }: InfoMenuProps) => {
	return (
		<>
			<div className="game-left-toggles">
				<button
					className="game-info-toggle"
					type="button"
					onClick={onToggle}
					aria-expanded={isOpen}
					aria-controls="game-info-panel"
				>
					Info
				</button>
				{canShowBackToSetup ? (
					<button className="game-info-toggle game-info-toggle--secondary" type="button" onClick={onBackToSetup}>
						Back to Setup
					</button>
				) : null}
			</div>
			{isOpen ? (
				<aside className="game-info-panel" id="game-info-panel">
					<div className="game-options-panel-title">Info</div>
					<div className="game-options-panel-group game-info-panel-group">
						<div className="game-board-size-label">Classic GO</div>
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
					{featureFlags.sgfExportMode === 'aiSensei' ? (
						<>
							<div className="game-info-divider" />
							<div className="game-options-panel-group game-info-panel-group">
								<div className="game-board-size-label">AI Sensei Export</div>
								<p className="game-info-text">
									Use the Open in AI Sensei action to upload your current SGF to AI Sensei in a new tab for review.
								</p>
							</div>
						</>
					) : null}
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
							Time limits are used in Classic GO or One color GO. With Fisher time, each player starts with the selected
							main time, and after every move or pass that player receives the increment bonus. If your clock reaches
							zero, you lose on time.
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
