type GameResultPopupProps = {
	winnerLabel: string
	scoreLabel: string | null
	reasonLabel: string | null
	showDownloadSgfButton: boolean
	showAiSenseiButton: boolean
	sgfLinkHref: string | null
	aiSenseiUploadHref: string | null
	sgfDownloadFileName: string
	showStartNewGame: boolean
	onStartNewGame: () => void
}

export const GameResultPopup = ({
	winnerLabel,
	scoreLabel,
	reasonLabel,
	showDownloadSgfButton,
	showAiSenseiButton,
	sgfLinkHref,
	aiSenseiUploadHref,
	sgfDownloadFileName,
	showStartNewGame,
	onStartNewGame
}: GameResultPopupProps) => {
	return (
		<div className="game-result-popup" role="status" aria-live="polite">
			<div className="game-result-title">{winnerLabel}</div>
			<div className="game-result-score">{scoreLabel}</div>
			<div className="game-result-reason">{reasonLabel}</div>
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
				<a
					className="game-side-button game-side-button--download"
					href={aiSenseiUploadHref}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open in AI Sensei
				</a>
			) : null}
			{showStartNewGame ? (
				<button className="game-side-button game-side-button--start" type="button" onClick={onStartNewGame}>
					Start New Game
				</button>
			) : null}
		</div>
	)
}
