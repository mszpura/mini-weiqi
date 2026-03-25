type RightOptionsMenuProps = {
	isOpen: boolean
	onToggle: () => void
	onIncreaseBoardScale: () => void
	onDecreaseBoardScale: () => void
	canIncreaseBoardScale: boolean
	canDecreaseBoardScale: boolean
	soundEnabled: boolean
	onToggleSound: () => void
	showImportSgf: boolean
	onImportSgf: () => void
	canShowExitMode: boolean
	onExitMode: () => void
}

export const RightOptionsMenu = ({
	isOpen,
	onToggle,
	onIncreaseBoardScale,
	onDecreaseBoardScale,
	canIncreaseBoardScale,
	canDecreaseBoardScale,
	soundEnabled,
	onToggleSound,
	showImportSgf,
	onImportSgf,
	canShowExitMode,
	onExitMode
}: RightOptionsMenuProps) => {
	return (
		<>
			<button
				className="game-options-toggle"
				type="button"
				onClick={onToggle}
				aria-expanded={isOpen}
				aria-controls="game-options-panel"
			>
				Options
			</button>
			{isOpen ? (
				<aside className="game-options-panel" id="game-options-panel">
					<div className="game-options-panel-title">Options</div>
					<div className="game-board-size-controls">
						<div className="game-board-size-label">Board Zoom</div>
						<div className="game-board-size-buttons">
							<button
								className="game-board-size-button"
								type="button"
								onClick={onIncreaseBoardScale}
								disabled={!canIncreaseBoardScale}
								aria-label="Increase board size"
							>
								+
							</button>
							<button
								className="game-board-size-button"
								type="button"
								onClick={onDecreaseBoardScale}
								disabled={!canDecreaseBoardScale}
								aria-label="Decrease board size"
							>
								-
							</button>
						</div>
					</div>
					<div className="game-options-panel-group">
						<div className="game-board-size-label">Sound</div>
						<button className="game-nav-button" type="button" onClick={onToggleSound}>
							{soundEnabled ? 'Disable sound' : 'Enable sound'}
						</button>
					</div>
					{showImportSgf || canShowExitMode ? (
						<div className="game-board-controls">
							{showImportSgf ? (
								<button className="game-side-button game-side-button--import" type="button" onClick={onImportSgf}>
									Import SGF
								</button>
							) : null}
							{canShowExitMode ? (
								<button className="game-return-button" type="button" onClick={onExitMode}>
									Exit mode
								</button>
							) : null}
						</div>
					) : null}
				</aside>
			) : null}
		</>
	)
}
