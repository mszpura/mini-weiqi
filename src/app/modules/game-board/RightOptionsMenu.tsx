type RightOptionsMenuProps = {
	isOpen: boolean
	onToggle: () => void
	onIncreaseBoardScale: () => void
	onDecreaseBoardScale: () => void
	canIncreaseBoardScale: boolean
	canDecreaseBoardScale: boolean
	soundEnabled: boolean
	onToggleSound: () => void
	showDownloadBoardImageButton: boolean
	onDownloadBoardImage: () => void
	showAiSenseiButton: boolean
	aiSenseiUploadHref: string | null
	onOpenAiSensei: () => void
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
	showDownloadBoardImageButton,
	onDownloadBoardImage,
	showAiSenseiButton,
	aiSenseiUploadHref,
	onOpenAiSensei,
	canShowExitMode,
	onExitMode
}: RightOptionsMenuProps) => {
	return (
		<>
			<div className="game-right-toggles">
				<button
					className="game-options-toggle"
					type="button"
					onClick={onToggle}
					aria-expanded={isOpen}
					aria-controls="game-options-panel"
				>
					Options
				</button>
			</div>
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
					{showDownloadBoardImageButton || showAiSenseiButton || canShowExitMode ? (
						<>
							<div className="game-options-divider" />
							<div className="game-board-controls">
								{showDownloadBoardImageButton ? (
									<button
										className="game-side-button game-side-button--download"
										type="button"
										onClick={onDownloadBoardImage}
									>
										Download board image
									</button>
								) : null}
								{showAiSenseiButton && aiSenseiUploadHref ? (
									<button
										className="game-side-button game-side-button--download"
										type="button"
										onClick={onOpenAiSensei}
									>
										Open in AI Sensei
									</button>
								) : null}
								{canShowExitMode ? (
									<button className="game-return-button" type="button" onClick={onExitMode}>
										Back to Setup
									</button>
								) : null}
							</div>
						</>
					) : null}
				</aside>
			) : null}
		</>
	)
}
