type GameResultPopupProps = {
	winnerLabel: string
	scoreLabel: string | null
	reasonLabel: string | null
	showDownloadSgfButton: boolean
	onDownloadSgf: () => void
	showCopySgfButton: boolean
	onCopySgf: () => void
	showStartNewGame: boolean
	onStartNewGame: () => void
}

export const GameResultPopup = ({
	winnerLabel,
	scoreLabel,
	reasonLabel,
	showDownloadSgfButton,
	onDownloadSgf,
	showCopySgfButton,
	onCopySgf,
	showStartNewGame,
	onStartNewGame
}: GameResultPopupProps) => {
	return (
		<div className="game-result-popup" role="status" aria-live="polite">
			<div className="game-result-title">{winnerLabel}</div>
			<div className="game-result-score">{scoreLabel}</div>
			<div className="game-result-reason">{reasonLabel}</div>
			{showDownloadSgfButton ? (
				<button className="game-side-button game-side-button--download" type="button" onClick={onDownloadSgf}>
					Download SGF
				</button>
			) : null}
			{showCopySgfButton ? (
				<button className="game-side-button game-side-button--download" type="button" onClick={onCopySgf}>
					Copy SGF
				</button>
			) : null}
			{showStartNewGame ? (
				<button className="game-side-button game-side-button--start" type="button" onClick={onStartNewGame}>
					Start New Game
				</button>
			) : null}
		</div>
	)
}
