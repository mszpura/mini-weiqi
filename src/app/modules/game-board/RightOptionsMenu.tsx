import { MoveTreePanel } from './MoveTreePanel'
import type { MoveTreeNode } from '../../models/game'

type RightOptionsMenuProps = {
	isOpen: boolean
	onToggle: () => void
	isMoveTreeOpen: boolean
	onToggleMoveTree: () => void
	showMoveTreePanel: boolean
	moveTree: Record<string, MoveTreeNode>
	currentMoveId: string
	currentMoveCount: number
	onSelectMoveCount: (moveCount: number, moveId?: string) => void
	onIncreaseBoardScale: () => void
	onDecreaseBoardScale: () => void
	canIncreaseBoardScale: boolean
	canDecreaseBoardScale: boolean
	soundEnabled: boolean
	onToggleSound: () => void
	showImportSgf: boolean
	onImportSgf: () => void
	showDownloadSgfButton: boolean
	showAiSenseiButton: boolean
	sgfLinkHref: string | null
	aiSenseiUploadHref: string | null
	onOpenAiSensei: () => void
	sgfDownloadFileName: string
	canShowExitMode: boolean
	onExitMode: () => void
}

export const RightOptionsMenu = ({
	isOpen,
	onToggle,
	isMoveTreeOpen,
	onToggleMoveTree,
	showMoveTreePanel,
	moveTree,
	currentMoveId,
	currentMoveCount,
	onSelectMoveCount,
	onIncreaseBoardScale,
	onDecreaseBoardScale,
	canIncreaseBoardScale,
	canDecreaseBoardScale,
	soundEnabled,
	onToggleSound,
	showImportSgf,
	onImportSgf,
	showDownloadSgfButton,
	showAiSenseiButton,
	sgfLinkHref,
	aiSenseiUploadHref,
	onOpenAiSensei,
	sgfDownloadFileName,
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
				{showMoveTreePanel ? (
					<button
						className="game-options-toggle"
						type="button"
						onClick={onToggleMoveTree}
						aria-expanded={isMoveTreeOpen}
						aria-controls="game-move-tree-panel"
					>
						Move Tree
					</button>
				) : null}
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
					{showImportSgf || showDownloadSgfButton || showAiSenseiButton || canShowExitMode ? (
						<>
							<div className="game-options-divider" />
							<div className="game-board-controls">
								{showImportSgf ? (
									<button className="game-side-button game-side-button--import" type="button" onClick={onImportSgf}>
										Import SGF
									</button>
								) : null}
								{showDownloadSgfButton && sgfLinkHref ? (
									<a
										className="game-side-button game-side-button--download"
										href={sgfLinkHref}
										download={sgfDownloadFileName}
										target="_blank"
										rel="noopener noreferrer"
									>
										Download SGF
									</a>
								) : null}
								{showAiSenseiButton && aiSenseiUploadHref ? (
									<button className="game-side-button game-side-button--download" type="button" onClick={onOpenAiSensei}>
										Open in AI Sensei
									</button>
								) : null}
								{canShowExitMode ? (
									<button className="game-return-button" type="button" onClick={onExitMode}>
										Exit mode
									</button>
								) : null}
							</div>
						</>
					) : null}
				</aside>
			) : null}
			{showMoveTreePanel && isMoveTreeOpen ? (
				<aside className="game-options-panel" id="game-move-tree-panel">
					<div className="game-options-panel-title">Move Tree</div>
					<MoveTreePanel
						moveTree={moveTree}
						currentMoveId={currentMoveId}
						currentMoveCount={currentMoveCount}
						onSelectMoveCount={onSelectMoveCount}
						isEmbedded
					/>
				</aside>
			) : null}
		</>
	)
}
