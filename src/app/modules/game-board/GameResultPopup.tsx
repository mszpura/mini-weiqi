type GameResultPopupProps = {
	winnerLabel: string
	scoreLabel: string | null
	reasonLabel: string | null
	showShareResultButton: boolean
	isSharingResult: boolean
	onShareResult: () => void
	showDownloadSgfButton: boolean
	showAiSenseiButton: boolean
	sgfLinkHref: string | null
	aiSenseiUploadHref: string | null
	onOpenAiSensei: () => void
	sgfDownloadFileName: string
	showStartNewGame: boolean
	onStartNewGame: () => void
}

export const GameResultPopup = ({
	winnerLabel,
	scoreLabel,
	reasonLabel,
	showShareResultButton,
	isSharingResult,
	onShareResult,
	showDownloadSgfButton,
	showAiSenseiButton,
	sgfLinkHref,
	aiSenseiUploadHref,
	onOpenAiSensei,
	sgfDownloadFileName,
	showStartNewGame,
	onStartNewGame
}: GameResultPopupProps) => {
	const handleDownloadSgf = () => {
		if (!sgfLinkHref) return
		const downloadLink = document.createElement('a')
		downloadLink.href = sgfLinkHref
		downloadLink.download = sgfDownloadFileName
		document.body.append(downloadLink)
		downloadLink.click()
		downloadLink.remove()
	}

	return (
		<div className="game-result-popup" role="status" aria-live="polite">
			<div className="game-result-title">{winnerLabel}</div>
			<div className="game-result-score">{scoreLabel}</div>
			<div className="game-result-reason">{reasonLabel}</div>
			{showShareResultButton ? (
				<button
					className="game-side-button game-side-button--download"
					type="button"
					onClick={onShareResult}
					disabled={isSharingResult}
				>
					{isSharingResult ? 'Sharing...' : 'Share result'}
				</button>
			) : null}
			{showDownloadSgfButton && sgfLinkHref ? (
				<button
					className="game-side-button game-side-button--download"
					type="button"
					onClick={handleDownloadSgf}
				>
					Download SGF
				</button>
			) : null}
			{showAiSenseiButton && aiSenseiUploadHref ? (
				<button className="game-side-button game-side-button--download" type="button" onClick={onOpenAiSensei}>
					Open in AI Sensei
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
