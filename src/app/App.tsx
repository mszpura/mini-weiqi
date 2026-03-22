import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Game } from 'tenuki'
import { isPassMove, type GameMode, type GameMove, type GameResult } from './models/game'
import type { PlayerSlot } from './models/player'
import { parseSgfContent } from './models/sgf'
import './App.css'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'

export default function App() {
	const [pathname, setPathname] = useState(window.location.pathname)

	useEffect(() => {
		const handlePopstate = () => setPathname(window.location.pathname)
		window.addEventListener('popstate', handlePopstate)
		return () => window.removeEventListener('popstate', handlePopstate)
	}, [])

	const navigateTo = useCallback(
		(path: string) => {
			if (window.location.pathname === path) return
			window.history.pushState({}, '', path)
			setPathname(path)
		},
		[setPathname]
	)

	if (pathname === '/privacy-policy') {
		return <LegalPage type="privacy" onBackHome={() => navigateTo('/')} />
	}

	if (pathname === '/terms-of-service') {
		return <LegalPage type="terms" onBackHome={() => navigateTo('/')} />
	}

	return (
		<DiscordContextProvider authenticate scope={['identify', 'guilds']}>
			<SyncContextProvider>
				<AppContent onNavigate={navigateTo} />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}

type AppContentProps = {
	onNavigate: (path: string) => void
}

function AppContent({ onNavigate }: AppContentProps) {
	const { discordSdk, session } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const syncKeys = useMemo(
		() => ({
			gameBoard: ['game-board', channelKey],
			boardSize: ['board-size', channelKey],
			gameMode: ['game-mode', channelKey],
			blackPlayer: ['player-black', channelKey],
			whitePlayer: ['player-white', channelKey],
			moves: ['game-moves', channelKey],
			gameResult: ['game-result', channelKey],
			displayedMoveCount: ['displayed-move-count', channelKey]
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [gameMode, setGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
	const [gameResult, setGameResult] = useSyncState<GameResult | null>(null, syncKeys.gameResult)
	const [displayedMoveCount, setDisplayedMoveCount] = useSyncState(0, syncKeys.displayedMoveCount)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const previousMovesLengthRef = useRef(0)
	const user = session?.user
	
	const currentPlayer = user
		? {
				id: user.id,
				username: user.username,
				avatar: user.avatar ?? null
			}
		: null

	const playerColor = currentPlayer?.id === blackPlayer?.id ? 'black' : currentPlayer?.id === whitePlayer?.id ? 'white' : null
	const isSeated = currentPlayer?.id === blackPlayer?.id || currentPlayer?.id === whitePlayer?.id
	const isUnauthenticated = !session?.user?.id

	const handleJoinBlack = () => {
		if (isUnauthenticated) return
		if (!currentPlayer || blackPlayer || isSeated) return
		setBlackPlayer(currentPlayer)
	}

	const handleJoinWhite = () => {
		if (isUnauthenticated) return
		if (!currentPlayer || whitePlayer || isSeated) return
		setWhitePlayer(currentPlayer)
	}

	const handlePlayMove = useCallback(
		(y: number, x: number) => {
			setMoves((previousMoves) => {
				const nextMoves = [...previousMoves, { type: 'play', y, x }]
				setDisplayedMoveCount(nextMoves.length)
				return nextMoves
			})
		},
		[setMoves]
	)

	const handlePassTurn = useCallback(() => {
		if (gameResult) return
		setMoves((previousMoves) => {
			const nextMoves = [...previousMoves, { type: 'pass' }]
			setDisplayedMoveCount(nextMoves.length)
			return nextMoves
		})
	}, [gameResult, setMoves])

	const buildScoreFromMoves = useCallback(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		return game.score()
	}, [boardSize, moves])

	const handleResign = useCallback(() => {
		if (!playerColor || gameResult) return
		const score = buildScoreFromMoves()
		const winner = playerColor === 'black' ? 'white' : 'black'
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'resign',
			resignedBy: playerColor
		})
	}, [buildScoreFromMoves, gameResult, playerColor, setGameResult])

	const handleImportSgf = useCallback(() => {
		if (gameMode !== 'shared') return
		fileInputRef.current?.click()
	}, [gameMode])

	const handleSgfFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			event.target.value = ''
			if (!file) return

			if (!file.name.toLowerCase().endsWith('.sgf')) {
				window.alert('Please select a .sgf file.')
				return
			}

			try {
				const content = await file.text()
				const parsed = parseSgfContent(content, boardSize)
				if (!parsed.ok) {
					window.alert(parsed.error)
					return
				}
				setMoves(parsed.game.moves)
				setDisplayedMoveCount(parsed.game.moves.length)
				if (parsed.game.boardSize && parsed.game.boardSize !== boardSize) {
					setBoardSize(parsed.game.boardSize)
				}
				setGameResult(null)
			} catch {
				window.alert('Failed to read SGF file.')
			}
		},
		[boardSize, setBoardSize, setGameResult, setMoves]
	)

	const handleReturnToMenu = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setShowGameBoard(false)
	}, [setBlackPlayer, setGameResult, setMoves, setShowGameBoard, setWhitePlayer])

	const handleNewGame = useCallback(() => {
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
	}, [setBlackPlayer, setGameResult, setMoves, setWhitePlayer])

	useEffect(() => {
		const previousLength = previousMovesLengthRef.current
		const currentLength = moves.length

		if (gameMode !== 'shared') {
			setDisplayedMoveCount(currentLength)
			previousMovesLengthRef.current = currentLength
			return
		}

		if (displayedMoveCount > currentLength) {
			setDisplayedMoveCount(currentLength)
		} else if (displayedMoveCount === previousLength) {
			setDisplayedMoveCount(currentLength)
		}

		previousMovesLengthRef.current = currentLength
	}, [displayedMoveCount, gameMode, moves.length])

	const shownMoves = useMemo(() => moves.slice(0, displayedMoveCount), [displayedMoveCount, moves])

	const gameSnapshot = useMemo(() => {
		const game = new Game({ boardSize })
		for (const move of shownMoves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}

		const state = game.currentState()
		const score = game.score()
		return {
			isOver: game.isOver(),
			black: state.whiteStonesCaptured,
			white: state.blackStonesCaptured,
			score
		}
	}, [boardSize, shownMoves])

	const fullGameSnapshot = useMemo(() => {
		const game = new Game({ boardSize })
		for (const move of moves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		const score = game.score()
		return {
			isOver: game.isOver(),
			score
		}
	}, [boardSize, moves])

	const effectiveGameResult = useMemo<GameResult | null>(() => {
		if (gameResult) return gameResult
		if (!fullGameSnapshot.isOver) return null
		const blackScore = fullGameSnapshot.score.black
		const whiteScore = fullGameSnapshot.score.white
		return {
			winner: blackScore === whiteScore ? 'draw' : blackScore > whiteScore ? 'black' : 'white',
			blackScore,
			whiteScore,
			reason: 'finished'
		}
	}, [fullGameSnapshot, gameResult])

	const handleMoveToStart = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount(0)
	}, [gameMode])

	const handleMoveBackward = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount((current) => Math.max(0, current - 1))
	}, [gameMode])

	const handleMoveForward = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount((current) => Math.min(moves.length, current + 1))
	}, [gameMode, moves.length])

	const handleMoveToEnd = useCallback(() => {
		if (gameMode !== 'shared') return
		setDisplayedMoveCount(moves.length)
	}, [gameMode, moves.length])

	if (showGameBoard) {
		return (
			<div className="app-shell app-shell--board">
				<input
					ref={fileInputRef}
					type="file"
					accept=".sgf"
					hidden
					onChange={handleSgfFileChange}
				/>
				<GameBoard
					boardSize={boardSize}
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					playerColor={playerColor}
					gameMode={gameMode}
					moves={shownMoves}
					capturedByBlack={gameSnapshot.black}
					capturedByWhite={gameSnapshot.white}
					isViewingLatestMove={displayedMoveCount === moves.length}
					canMoveBackward={displayedMoveCount > 0}
					canMoveForward={displayedMoveCount < moves.length}
					onMoveToStart={handleMoveToStart}
					onMoveBackward={handleMoveBackward}
					onMoveForward={handleMoveForward}
					onMoveToEnd={handleMoveToEnd}
					onPlayMove={handlePlayMove}
					onPassTurn={handlePassTurn}
					onResign={handleResign}
					onImportSgf={handleImportSgf}
					gameResult={effectiveGameResult}
					onNewGame={handleNewGame}
					onReturnToMenu={handleReturnToMenu}
					hideJoinButtons={isUnauthenticated}
				/>
			</div>
		)
	}

	return (
		<div className="app-shell app-shell--menu">
			<Menu
				onSharedGame={() => setShowGameBoard(true)}
				boardSize={boardSize}
				onBoardSizeChange={setBoardSize}
				gameMode={gameMode}
				onGameModeChange={setGameMode}
				onOpenPrivacyPolicy={() => onNavigate('/privacy-policy')}
				onOpenTermsOfService={() => onNavigate('/terms-of-service')}
			/>
		</div>
	)
}

type LegalPageProps = {
	type: 'privacy' | 'terms'
	onBackHome: () => void
}

const LegalPage = ({ type, onBackHome }: LegalPageProps) => {
	if (type === 'privacy') {
		return (
			<main className="legal-page">
				<div className="legal-page__container">
					<h1>Privacy Policy</h1>
					<p>Last updated: March 22, 2026</p>
					<p>
						This Privacy Policy explains how Mini Weiqi (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) collects, uses, and
						protects information when you use our mobile game service.
					</p>
					<h2>Information We Collect</h2>
					<p>
						We may collect account identifiers (such as user ID and username), gameplay data, device and technical
						information, and limited diagnostic logs needed to keep the service running.
					</p>
					<h2>How We Use Information</h2>
					<p>
						We use collected information to provide core gameplay features, synchronize matches, improve
						performance, prevent abuse, and comply with legal obligations.
					</p>
					<h2>Data Sharing</h2>
					<p>
						We do not sell your personal information. We may share data with trusted service providers for hosting,
						analytics, and infrastructure support, and when required by law.
					</p>
					<h2>Data Retention</h2>
					<p>
						We keep data only as long as necessary to operate the game, resolve disputes, enforce agreements, and
						meet legal requirements.
					</p>
					<h2>Children&apos;s Privacy</h2>
					<p>
						Our service is not directed to children under 13 (or the applicable age in your region). If you believe
						a child provided personal data, contact us and we will take appropriate action.
					</p>
					<h2>Your Rights</h2>
					<p>
						Depending on your location, you may have rights to access, correct, delete, or restrict processing of
						your personal data.
					</p>
					<h2>Contact</h2>
					<p>
						For privacy questions, please contact us at{' '}
						<a href="mailto:privacy@miniweiqi.example">privacy@miniweiqi.example</a>.
					</p>
					<button className="legal-page__back-link" type="button" onClick={onBackHome}>
						Back to Home
					</button>
				</div>
			</main>
		)
	}

	return (
		<main className="legal-page">
			<div className="legal-page__container">
				<h1>Terms of Service</h1>
				<p>Last updated: March 22, 2026</p>
				<p>
					These Terms of Service govern your access to and use of Mini Weiqi. By using the service, you agree to
					these terms.
				</p>
				<h2>Eligibility and Accounts</h2>
				<p>
					You must be legally able to agree to these terms. You are responsible for activity associated with your
					account and for keeping your login credentials secure.
				</p>
				<h2>License and Acceptable Use</h2>
				<p>
					We grant you a limited, non-exclusive, revocable license to use the game for personal, non-commercial
					entertainment. You must not cheat, exploit bugs, reverse engineer the service, or disrupt other users.
				</p>
				<h2>Virtual Items and Purchases</h2>
				<p>
					Any virtual items, subscriptions, or in-app purchases are licensed, not sold. Availability and pricing may
					change. Except where required by law, purchases are non-refundable.
				</p>
				<h2>Service Availability</h2>
				<p>
					We may modify, suspend, or discontinue features at any time. We do not guarantee uninterrupted or
					error-free operation.
				</p>
				<h2>Termination</h2>
				<p>
					We may suspend or terminate access if you violate these terms or if needed to protect the service, users,
					or legal compliance.
				</p>
				<h2>Disclaimers and Limitation of Liability</h2>
				<p>
					The service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law, we disclaim
					warranties and are not liable for indirect, incidental, special, or consequential damages.
				</p>
				<h2>Changes to Terms</h2>
				<p>
					We may update these terms from time to time. Continued use of the service after changes means you accept
					the updated terms.
				</p>
				<h2>Contact</h2>
				<p>
					For questions about these terms, contact{' '}
					<a href="mailto:legal@miniweiqi.example">legal@miniweiqi.example</a>.
				</p>
				<button className="legal-page__back-link" type="button" onClick={onBackHome}>
					Back to Home
				</button>
			</div>
		</main>
	)
}
