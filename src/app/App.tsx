import { DiscordContextProvider, useDiscordSdk } from '../hooks/useDiscordSdk'
import { SyncContextProvider, useSyncState } from '@robojs/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Game } from 'tenuki'
import {
	type DisconnectTimeoutState,
	getFisherClockConfig,
	getTimeLimitOptionsForBoardSize,
	isPassMove,
	isTimeLimitAllowedForBoardSize,
	type GameClockState,
	type GameMode,
	type GameMove,
	type GameResult,
	type GameTimeLimit,
	type MoveTreeNode,
	type OneColorStoneColor
} from './models/game'
import type { PlayerSlot } from './models/player'
import { parseSgfContent, serializeSgfContent, serializeSgfTreeContent } from './models/sgf'
import './App.css'
import { featureFlags } from './config/featureFlags'
import { Menu } from './modules/menu/Menu'
import { GameBoard } from './modules/game-board/GameBoard'
import { PrivacyPolicyPage } from './modules/legal/PrivacyPolicyPage'
import { TermsOfServicePage } from './modules/legal/TermsOfServicePage'
import { renderBoardImageBlob } from './modules/game-board/logic/downloadBoardImage'

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
		return <PrivacyPolicyPage onBackHome={() => navigateTo('/')} />
	}

	if (pathname === '/terms-of-service') {
		return <TermsOfServicePage onBackHome={() => navigateTo('/')} />
	}

	return (
		<DiscordContextProvider authenticate scope={['identify', 'guilds', 'rpc.activities.write']}>
			<SyncContextProvider>
				<AppContent onNavigate={navigateTo} />
			</SyncContextProvider>
		</DiscordContextProvider>
	)
}

type AppContentProps = {
	onNavigate: (path: string) => void
}

const normalizeHandicapStones = (value: number) => {
	if (!Number.isInteger(value)) return 0
	if (value === 0) return 0
	if (value >= 2 && value <= 9) return value
	return 0
}

const getFirstMoveColor = (handicapStones: number): 'black' | 'white' => (handicapStones > 0 ? 'white' : 'black')
const getOppositeColor = (color: 'black' | 'white'): 'black' | 'white' => (color === 'black' ? 'white' : 'black')

const settleActiveClock = (clock: GameClockState, nowMs: number) => {
	const elapsedMs = Math.max(0, nowMs - clock.turnStartedAtMs)
	const nextBlack = clock.activeColor === 'black' ? Math.max(0, clock.blackTimeMs - elapsedMs) : clock.blackTimeMs
	const nextWhite = clock.activeColor === 'white' ? Math.max(0, clock.whiteTimeMs - elapsedMs) : clock.whiteTimeMs
	return {
		blackTimeMs: nextBlack,
		whiteTimeMs: nextWhite
	}
}

const applyFisherMove = (clock: GameClockState, nowMs: number, incrementMs: number): GameClockState => {
	const settled = settleActiveClock(clock, nowMs)
	if (clock.activeColor === 'black') {
		return {
			blackTimeMs: settled.blackTimeMs + incrementMs,
			whiteTimeMs: settled.whiteTimeMs,
			activeColor: 'white',
			turnStartedAtMs: nowMs
		}
	}
	return {
		blackTimeMs: settled.blackTimeMs,
		whiteTimeMs: settled.whiteTimeMs + incrementMs,
		activeColor: 'black',
		turnStartedAtMs: nowMs
	}
}

const ROOT_MOVE_ID = 'root'

const createEmptyMoveTree = (): Record<string, MoveTreeNode> => ({
	[ROOT_MOVE_ID]: {
		id: ROOT_MOVE_ID,
		parentId: null,
		move: null,
		childrenIds: []
	}
})

const createMoveNodeId = () =>
	typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `move-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const getLineageNodeIds = (moveTree: Record<string, MoveTreeNode>, nodeId: string): string[] => {
	const lineage: string[] = []
	let cursor: string | null = nodeId
	while (cursor) {
		const node: MoveTreeNode | undefined = moveTree[cursor]
		if (!node) break
		lineage.push(node.id)
		cursor = node.parentId
	}
	return lineage.reverse()
}

const getMovesFromNodeId = (moveTree: Record<string, MoveTreeNode>, nodeId: string): GameMove[] =>
	getLineageNodeIds(moveTree, nodeId)
		.map((id) => moveTree[id])
		.filter((node): node is MoveTreeNode => Boolean(node && node.move))
		.map((node) => node.move as GameMove)

const getNodeDepth = (moveTree: Record<string, MoveTreeNode>, nodeId: string) =>
	Math.max(0, getLineageNodeIds(moveTree, nodeId).length - 1)

const getMainLineNodeAtDepth = (moveTree: Record<string, MoveTreeNode>, depth: number) => {
	let cursor = ROOT_MOVE_ID
	let remaining = Math.max(0, depth)
	while (remaining > 0) {
		const nextId = moveTree[cursor]?.childrenIds[0]
		if (!nextId) break
		cursor = nextId
		remaining -= 1
	}
	return cursor
}

const getMainLineLeafFromNode = (moveTree: Record<string, MoveTreeNode>, startNodeId: string) => {
	let cursor = startNodeId
	while (true) {
		const nextId = moveTree[cursor]?.childrenIds[0]
		if (!nextId) return cursor
		cursor = nextId
	}
}

const normalizeGameMode = (mode: GameMode): GameMode =>
	featureFlags.oneColorGo || mode !== 'one-color' ? mode : 'normal'

const getGameModeLabel = (mode: GameMode): string => {
	switch (mode) {
		case 'normal':
			return 'Normal'
		case 'one-color':
			return 'One Color'
		case 'shared':
			return 'Shared'
	}
}

const areMovesEqual = (a: GameMove[], b: GameMove[]) => {
	if (a.length !== b.length) return false
	return a.every((move, index) => {
		const other = b[index]
		if (!other) return false
		if (isPassMove(move) || isPassMove(other)) {
			return isPassMove(move) && isPassMove(other)
		}
		return move.x === other.x && move.y === other.y
	})
}

function AppContent({ onNavigate }: AppContentProps) {
	const DISCONNECT_TIMEOUT_MS = 30_000
	const isEmbeddedContext = new URLSearchParams(window.location.search).get('frame_id') != null
	const { discordSdk, session } = useDiscordSdk()
	const channelKey = discordSdk?.channelId ?? 'local'
	const syncKeys = useMemo(
		() => ({
			gameBoard: ['game-board', channelKey],
			boardSize: ['board-size', channelKey],
			handicapStones: ['handicap-stones', channelKey],
			gameMode: ['game-mode', channelKey],
			gameStarted: ['game-started', channelKey],
			gameStartedAtMs: ['game-started-at-ms', channelKey],
			blackPlayer: ['player-black', channelKey],
			whitePlayer: ['player-white', channelKey],
			moves: ['game-moves', channelKey],
			moveTree: ['move-tree', channelKey],
			currentMoveId: ['current-move-id', channelKey],
			gameResult: ['game-result', channelKey],
			displayedMoveCount: ['displayed-move-count', channelKey],
			timeLimit: ['time-limit', channelKey],
			gameClock: ['game-clock', channelKey],
			disconnectTimeout: ['disconnect-timeout', channelKey],
			soundEnabled: ['sound-enabled', channelKey],
			oneColorStoneColor: ['one-color-stone-color', channelKey]
		}),
		[channelKey]
	)
	const [showGameBoard, setShowGameBoard] = useSyncState(false, syncKeys.gameBoard)
	const [boardSize, setBoardSize] = useSyncState(19, syncKeys.boardSize)
	const [handicapStones, setHandicapStones] = useSyncState(0, syncKeys.handicapStones)
	const [storedGameMode, setStoredGameMode] = useSyncState<GameMode>('normal', syncKeys.gameMode)
	const [gameStarted, setGameStarted] = useSyncState(false, syncKeys.gameStarted)
	const [gameStartedAtMs, setGameStartedAtMs] = useSyncState<number | null>(null, syncKeys.gameStartedAtMs)
	const [blackPlayer, setBlackPlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.blackPlayer)
	const [whitePlayer, setWhitePlayer] = useSyncState<PlayerSlot | null>(null, syncKeys.whitePlayer)
	const [moves, setMoves] = useSyncState<GameMove[]>([], syncKeys.moves)
	const [moveTree, setMoveTree] = useSyncState<Record<string, MoveTreeNode>>(createEmptyMoveTree(), syncKeys.moveTree)
	const [currentMoveId, setCurrentMoveId] = useSyncState(ROOT_MOVE_ID, syncKeys.currentMoveId)
	const [gameResult, setGameResult] = useSyncState<GameResult | null>(null, syncKeys.gameResult)
	const [displayedMoveCount, setDisplayedMoveCount] = useSyncState(0, syncKeys.displayedMoveCount)
	const [timeLimit, setTimeLimit] = useSyncState<GameTimeLimit>('no-limit', syncKeys.timeLimit)
	const [gameClock, setGameClock] = useSyncState<GameClockState | null>(null, syncKeys.gameClock)
	const [disconnectTimeout, setDisconnectTimeout] = useSyncState<DisconnectTimeoutState | null>(
		null,
		syncKeys.disconnectTimeout
	)
	const [soundEnabled, setSoundEnabled] = useSyncState(true, syncKeys.soundEnabled)
	const [oneColorStoneColor, setOneColorStoneColor] = useSyncState<OneColorStoneColor>(
		'black',
		syncKeys.oneColorStoneColor
	)
	const [clockTick, setClockTick] = useState(0)
	const [disconnectTick, setDisconnectTick] = useState(0)
	const [isSharingResult, setIsSharingResult] = useState(false)
	const [connectedParticipantIds, setConnectedParticipantIds] = useState<Set<string> | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const countdownAudioRef = useRef<HTMLAudioElement | null>(null)
	const stoneAudioRef = useRef<HTMLAudioElement | null>(null)
	const countdownPlayedTurnRef = useRef<string | null>(null)
	const user = session?.user

	const currentPlayer = user
		? {
				id: user.id,
				username: user.username,
				avatar: user.avatar ?? null
			}
		: null

	const playerColor =
		currentPlayer?.id === blackPlayer?.id ? 'black' : currentPlayer?.id === whitePlayer?.id ? 'white' : null
	const isSeated = currentPlayer?.id === blackPlayer?.id || currentPlayer?.id === whitePlayer?.id
	const areBothSeatsTaken = Boolean(blackPlayer && whitePlayer)
	const isUnauthenticated = !session?.user?.id
	const effectiveHandicapStones = normalizeHandicapStones(handicapStones)
	const gameMode = normalizeGameMode(storedGameMode)
	const gameModeLabel = getGameModeLabel(gameMode)
	const isSeatMode = gameMode === 'normal' || gameMode === 'one-color'
	const playerIds = new Set(
		[blackPlayer?.id, whitePlayer?.id, currentPlayer?.id].filter((id): id is string => Boolean(id))
	)
	const playerCount = playerIds.size
	const maxPartySize = isSeatMode ? 2 : Math.max(playerCount, 8)
	const fisherClockConfig = isSeatMode ? getFisherClockConfig(timeLimit) : null
	const currentLineMoves = useMemo(() => getMovesFromNodeId(moveTree, currentMoveId), [currentMoveId, moveTree])
	const currentLineLength = currentLineMoves.length
	const selectedNode = moveTree[currentMoveId]
	const currentVisibleMoves = useMemo(
		() => currentLineMoves.slice(0, Math.max(0, Math.min(currentLineLength, displayedMoveCount))),
		[currentLineLength, currentLineMoves, displayedMoveCount]
	)

	useEffect(() => {
		if (featureFlags.oneColorGo) return
		if (storedGameMode !== 'one-color') return
		setStoredGameMode('normal')
	}, [setStoredGameMode, storedGameMode])

	useEffect(() => {
		if (!isEmbeddedContext || !session) return
		let isDisposed = false
		const handleParticipantsUpdate = (event: { participants: { id: string }[] }) => {
			if (isDisposed) return
			const nextIds = new Set(event.participants.map((participant) => participant.id))
			setConnectedParticipantIds(nextIds)
		}

		const syncConnectedParticipants = async () => {
			try {
				const initialParticipants = await discordSdk.commands.getInstanceConnectedParticipants()
				if (isDisposed) return
				setConnectedParticipantIds(new Set(initialParticipants.participants.map((participant) => participant.id)))
			} catch (error) {
				console.warn('Failed to get connected participants.', error)
				if (!isDisposed) {
					setConnectedParticipantIds(null)
				}
			}

			try {
				await discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleParticipantsUpdate, {
					instance_id: discordSdk.instanceId
				})
			} catch (error) {
				console.warn('Failed to subscribe to participant updates.', error)
			}
		}

		void syncConnectedParticipants()

		return () => {
			isDisposed = true
			void discordSdk
				.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleParticipantsUpdate, {
					instance_id: discordSdk.instanceId
				})
				.catch((error) => {
					console.warn('Failed to unsubscribe from participant updates.', error)
				})
		}
	}, [discordSdk, isEmbeddedContext, session])

	const handleJoinBlack = () => {
		if (!gameStarted) return
		if (isUnauthenticated) return
		if (!currentPlayer || blackPlayer || isSeated) return
		setBlackPlayer(currentPlayer)
	}

	const handleJoinWhite = () => {
		if (!gameStarted) return
		if (isUnauthenticated) return
		if (!currentPlayer || whitePlayer || isSeated) return
		setWhitePlayer(currentPlayer)
	}

	const handleLeaveSeat = useCallback(() => {
		if (!gameStarted) return
		if (!isSeatMode) return
		if (gameResult) return
		if (moves.length > 0) return
		if (!currentPlayer) return
		if (blackPlayer?.id === currentPlayer.id && !whitePlayer) {
			setBlackPlayer(null)
		}
		if (whitePlayer?.id === currentPlayer.id && !blackPlayer) {
			setWhitePlayer(null)
		}
	}, [
		blackPlayer,
		currentPlayer,
		gameResult,
		gameStarted,
		isSeatMode,
		moves.length,
		setBlackPlayer,
		setWhitePlayer,
		whitePlayer
	])

	const playStoneSound = useCallback(() => {
		if (!soundEnabled) return
		const audio = stoneAudioRef.current
		if (!audio) return
		audio.currentTime = 0
		void audio.play().catch((error) => {
			console.warn('Failed to play stone audio.', error)
		})
	}, [soundEnabled])

	const appendMoveToTree = useCallback(
		(nextMove: GameMove) => {
			const parentNode = moveTree[currentMoveId]
			if (!parentNode) return
			const nextMoveId = createMoveNodeId()
			const nextNode: MoveTreeNode = {
				id: nextMoveId,
				parentId: currentMoveId,
				move: nextMove,
				childrenIds: []
			}
			const nextTree: Record<string, MoveTreeNode> = {
				...moveTree,
				[currentMoveId]: {
					...parentNode,
					childrenIds: [...parentNode.childrenIds, nextMoveId]
				},
				[nextMoveId]: nextNode
			}
			setMoveTree(nextTree)
			setCurrentMoveId(nextMoveId)
			setDisplayedMoveCount(getNodeDepth(nextTree, nextMoveId))
			setMoves(getMovesFromNodeId(nextTree, nextMoveId))
		},
		[currentMoveId, moveTree, setCurrentMoveId, setDisplayedMoveCount, setMoveTree, setMoves]
	)

	const handlePlayMove = useCallback(
		(y: number, x: number) => {
			if (!gameStarted) return
			if (gameResult) return
			if (isSeatMode && !areBothSeatsTaken) return
			const audio = countdownAudioRef.current
			if (audio) {
				audio.pause()
				audio.currentTime = 0
			}
			playStoneSound()
			const nowMs = Date.now()
			if (fisherClockConfig && gameClock) {
				setGameClock(applyFisherMove(gameClock, nowMs, fisherClockConfig.incrementMs))
			}
			appendMoveToTree({ type: 'play', y, x })
		},
		[
			appendMoveToTree,
			areBothSeatsTaken,
			fisherClockConfig,
			gameClock,
			gameResult,
			gameStarted,
			isSeatMode,
			playStoneSound,
			setGameClock
		]
	)

	const handlePassTurn = useCallback(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (isSeatMode && !areBothSeatsTaken) return
		const audio = countdownAudioRef.current
		if (audio) {
			audio.pause()
			audio.currentTime = 0
		}
		playStoneSound()
		const nowMs = Date.now()
		if (fisherClockConfig && gameClock) {
			setGameClock(applyFisherMove(gameClock, nowMs, fisherClockConfig.incrementMs))
		}
		appendMoveToTree({ type: 'pass' })
	}, [
		appendMoveToTree,
		areBothSeatsTaken,
		fisherClockConfig,
		gameClock,
		gameResult,
		gameStarted,
		isSeatMode,
		playStoneSound,
		setGameClock
	])

	const buildScoreFromMoves = useCallback(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
		for (const move of currentLineMoves) {
			if (isPassMove(move)) {
				game.pass()
			} else {
				game.playAt(move.y, move.x)
			}
		}
		return game.score()
	}, [boardSize, currentLineMoves, effectiveHandicapStones])

	const handleResign = useCallback(() => {
		if (!gameStarted) return
		if (!playerColor || gameResult) return
		if (isSeatMode && !areBothSeatsTaken) return
		const score = buildScoreFromMoves()
		const winner = playerColor === 'black' ? 'white' : 'black'
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'resign',
			resignedBy: playerColor
		})
	}, [areBothSeatsTaken, buildScoreFromMoves, gameResult, gameStarted, isSeatMode, playerColor, setGameResult])

	const handleImportSgf = useCallback(() => {
		if (!gameStarted) return
		if (gameMode !== 'shared') return
		fileInputRef.current?.click()
	}, [gameMode, gameStarted])

	const handleStartGame = useCallback(() => {
		const now = Date.now()
		setMoveTree(createEmptyMoveTree())
		setCurrentMoveId(ROOT_MOVE_ID)
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameClock(null)
		setDisconnectTimeout(null)
		setGameStartedAtMs(now)
		setGameStarted(true)
	}, [
		setBlackPlayer,
		setCurrentMoveId,
		setDisconnectTimeout,
		setGameClock,
		setGameResult,
		setGameStarted,
		setGameStartedAtMs,
		setMoveTree,
		setMoves,
		setWhitePlayer
	])

	const handleStartNewGame = useCallback(() => {
		setMoveTree(createEmptyMoveTree())
		setCurrentMoveId(ROOT_MOVE_ID)
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameStartedAtMs(null)
		setGameStarted(false)
		setGameClock(null)
		setDisconnectTimeout(null)
	}, [
		setBlackPlayer,
		setCurrentMoveId,
		setDisconnectTimeout,
		setGameClock,
		setGameResult,
		setGameStarted,
		setGameStartedAtMs,
		setMoveTree,
		setMoves,
		setWhitePlayer
	])

	const handleHandicapChange = useCallback(
		(nextHandicapStones: number) => {
			if (nextHandicapStones === handicapStones) return
			setMoveTree(createEmptyMoveTree())
			setCurrentMoveId(ROOT_MOVE_ID)
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStartedAtMs(null)
			setGameStarted(false)
			setGameClock(null)
			setDisconnectTimeout(null)
			setHandicapStones(normalizeHandicapStones(nextHandicapStones))
		},
		[
			handicapStones,
			setBlackPlayer,
			setCurrentMoveId,
			setDisconnectTimeout,
			setGameClock,
			setGameResult,
			setGameStarted,
			setGameStartedAtMs,
			setHandicapStones,
			setMoveTree,
			setMoves,
			setWhitePlayer
		]
	)

	const handleBoardSizeChange = useCallback(
		(nextBoardSize: number) => {
			if (nextBoardSize === boardSize) return
			setMoveTree(createEmptyMoveTree())
			setCurrentMoveId(ROOT_MOVE_ID)
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStartedAtMs(null)
			setGameStarted(false)
			setGameClock(null)
			setDisconnectTimeout(null)
			setBoardSize(nextBoardSize)
			if (!isTimeLimitAllowedForBoardSize(timeLimit, nextBoardSize)) {
				setTimeLimit(getTimeLimitOptionsForBoardSize(nextBoardSize)[0]?.value ?? 'no-limit')
			}
		},
		[
			boardSize,
			setBlackPlayer,
			setBoardSize,
			setCurrentMoveId,
			setDisconnectTimeout,
			setGameClock,
			setGameResult,
			setGameStarted,
			setGameStartedAtMs,
			setMoveTree,
			setMoves,
			setTimeLimit,
			setWhitePlayer,
			timeLimit
		]
	)

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
				const importedBoardSize = parsed.game.boardSize ?? boardSize
				if (importedBoardSize !== boardSize) {
					setBoardSize(importedBoardSize)
				}
				setHandicapStones(normalizeHandicapStones(parsed.game.handicapStones ?? 0))
				setMoveTree(parsed.game.moveTree)
				setCurrentMoveId(parsed.game.currentMoveId)
				setMoves(parsed.game.moves)
				setDisplayedMoveCount(parsed.game.moves.length)
				setGameResult(null)
				setDisconnectTimeout(null)
			} catch {
				window.alert('Failed to read SGF file.')
			}
		},
		[
			boardSize,
			setBoardSize,
			setCurrentMoveId,
			setDisconnectTimeout,
			setGameResult,
			setHandicapStones,
			setMoveTree,
			setMoves
		]
	)

	const handleExitMode = useCallback(() => {
		setMoveTree(createEmptyMoveTree())
		setCurrentMoveId(ROOT_MOVE_ID)
		setMoves([])
		setDisplayedMoveCount(0)
		setGameResult(null)
		setBlackPlayer(null)
		setWhitePlayer(null)
		setGameStartedAtMs(null)
		setGameStarted(false)
		setGameClock(null)
		setDisconnectTimeout(null)
	}, [
		setBlackPlayer,
		setCurrentMoveId,
		setDisconnectTimeout,
		setGameClock,
		setGameResult,
		setGameStarted,
		setGameStartedAtMs,
		setMoveTree,
		setMoves,
		setWhitePlayer
	])

	const handleTimeLimitChange = useCallback(
		(nextTimeLimit: GameTimeLimit) => {
			if (nextTimeLimit === timeLimit) return
			setMoveTree(createEmptyMoveTree())
			setCurrentMoveId(ROOT_MOVE_ID)
			setMoves([])
			setDisplayedMoveCount(0)
			setGameResult(null)
			setBlackPlayer(null)
			setWhitePlayer(null)
			setGameStartedAtMs(null)
			setGameStarted(false)
			setGameClock(null)
			setDisconnectTimeout(null)
			setTimeLimit(nextTimeLimit)
		},
		[
			setBlackPlayer,
			setCurrentMoveId,
			setDisplayedMoveCount,
			setDisconnectTimeout,
			setGameClock,
			setGameResult,
			setGameStarted,
			setGameStartedAtMs,
			setMoveTree,
			setMoves,
			setTimeLimit,
			setWhitePlayer,
			timeLimit
		]
	)

	useEffect(() => {
		if (!gameStarted || gameStartedAtMs) return
		setGameStartedAtMs(Date.now())
	}, [gameStarted, gameStartedAtMs, setGameStartedAtMs])

	useEffect(() => {
		if (!disconnectTimeout) return
		const intervalId = window.setInterval(() => {
			setDisconnectTick((value) => value + 1)
		}, 250)
		return () => {
			window.clearInterval(intervalId)
		}
	}, [disconnectTimeout])

	useEffect(() => {
		if (!isEmbeddedContext) {
			if (disconnectTimeout) {
				setDisconnectTimeout(null)
			}
			return
		}
		if (!gameStarted || gameResult || !isSeatMode || !areBothSeatsTaken || !connectedParticipantIds) {
			if (disconnectTimeout) {
				setDisconnectTimeout(null)
			}
			return
		}

		const blackDisconnected = Boolean(blackPlayer && !connectedParticipantIds.has(blackPlayer.id))
		const whiteDisconnected = Boolean(whitePlayer && !connectedParticipantIds.has(whitePlayer.id))
		const disconnectedPlayer = blackDisconnected
			? { color: 'black' as const, player: blackPlayer }
			: whiteDisconnected
				? { color: 'white' as const, player: whitePlayer }
				: null

		if (!disconnectedPlayer) {
			if (disconnectTimeout) {
				setDisconnectTimeout(null)
			}
			return
		}

		if (
			disconnectTimeout &&
			disconnectTimeout.color === disconnectedPlayer.color &&
			disconnectTimeout.playerId === disconnectedPlayer.player.id
		) {
			return
		}

		const nowMs = Date.now()
		setDisconnectTimeout({
			color: disconnectedPlayer.color,
			playerId: disconnectedPlayer.player.id,
			startedAtMs: nowMs,
			expiresAtMs: nowMs + DISCONNECT_TIMEOUT_MS
		})
	}, [
		areBothSeatsTaken,
		blackPlayer,
		connectedParticipantIds,
		disconnectTimeout,
		gameResult,
		gameStarted,
		isEmbeddedContext,
		isSeatMode,
		setDisconnectTimeout,
		whitePlayer
	])

	useEffect(() => {
		if (!disconnectTimeout || gameResult) return
		const nowMs = Date.now()
		if (nowMs < disconnectTimeout.expiresAtMs) return
		const score = buildScoreFromMoves()
		const disconnectedBy = disconnectTimeout.color
		const winner = getOppositeColor(disconnectedBy)
		setDisconnectTimeout(null)
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'disconnect',
			disconnectedBy
		})
	}, [buildScoreFromMoves, disconnectTick, disconnectTimeout, gameResult, setDisconnectTimeout, setGameResult])

	useEffect(() => {
		if (gameMode === 'shared') return
		const latestMoveId = getMainLineLeafFromNode(moveTree, ROOT_MOVE_ID)
		if (currentMoveId === latestMoveId) return
		setCurrentMoveId(latestMoveId)
	}, [currentMoveId, gameMode, moveTree, setCurrentMoveId])

	useEffect(() => {
		if (session == null) return

		const updatePresence = async () => {
			const details = showGameBoard
				? gameStarted
					? `Mode: ${gameModeLabel}`
					: `Mode selected: ${gameModeLabel}`
				: 'In main menu'
			const state = showGameBoard ? `Players: ${playerCount}` : 'Preparing a match'
			const largeImageUrl = `${window.location.origin}/logo-discord2.png`

			try {
				await discordSdk.commands.setActivity({
					activity: {
						type: 0,
						details,
						state,
						timestamps: gameStartedAtMs ? { start: Math.floor(gameStartedAtMs / 1000) } : undefined,
						party: showGameBoard ? { size: [Math.max(playerCount, 1), maxPartySize] } : undefined,
						assets: {
							large_image: largeImageUrl,
							large_text: 'Mini Weiqi'
						}
					}
				})
			} catch (error) {
				console.warn('Failed to set Discord Rich Presence.', error)
			}
		}

		void updatePresence()
	}, [discordSdk, gameModeLabel, gameStarted, gameStartedAtMs, maxPartySize, playerCount, session, showGameBoard])

	useEffect(() => {
		const safeCount = Math.max(0, Math.min(currentLineLength, displayedMoveCount))
		if (safeCount !== displayedMoveCount) {
			setDisplayedMoveCount(safeCount)
		}
		if (!areMovesEqual(currentVisibleMoves, moves)) {
			setMoves(currentVisibleMoves)
		}
	}, [currentLineLength, currentVisibleMoves, displayedMoveCount, moves, setDisplayedMoveCount, setMoves])

	const shownMoves = moves

	useEffect(() => {
		const audio = new Audio('/counting.mp3')
		audio.preload = 'auto'
		countdownAudioRef.current = audio

		return () => {
			audio.pause()
			audio.src = ''
			countdownAudioRef.current = null
		}
	}, [])

	useEffect(() => {
		const audio = new Audio('/stone.mp3')
		audio.preload = 'auto'
		stoneAudioRef.current = audio

		return () => {
			audio.pause()
			audio.src = ''
			stoneAudioRef.current = null
		}
	}, [])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (disconnectTimeout) return
		if (!isSeatMode) return
		if (!fisherClockConfig) return
		if (!gameClock) return

		const intervalId = window.setInterval(() => {
			setClockTick((value) => value + 1)
		}, 250)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [disconnectTimeout, fisherClockConfig, gameClock, gameResult, gameStarted, isSeatMode])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (disconnectTimeout) return
		if (!isSeatMode) return
		if (!fisherClockConfig) return
		if (!gameClock) return

		const nowMs = Date.now()
		const settled = settleActiveClock(gameClock, nowMs)
		const activeRemaining = gameClock.activeColor === 'black' ? settled.blackTimeMs : settled.whiteTimeMs
		if (activeRemaining > 0) return
		const timedOutBy = gameClock.activeColor
		const winner = getOppositeColor(timedOutBy)
		const score = buildScoreFromMoves()
		setGameClock({
			...settled,
			activeColor: gameClock.activeColor,
			turnStartedAtMs: nowMs
		})
		setGameResult({
			winner,
			blackScore: score.black,
			whiteScore: score.white,
			reason: 'time',
			timedOutBy
		})
	}, [
		buildScoreFromMoves,
		clockTick,
		fisherClockConfig,
		gameClock,
		gameResult,
		gameStarted,
		disconnectTimeout,
		isSeatMode,
		setGameClock,
		setGameResult
	])

	const displayedClocks = useMemo(() => {
		if (!gameStarted || !isSeatMode || !fisherClockConfig) return null
		if (!gameClock) {
			return {
				blackTimeMs: fisherClockConfig.initialTimeMs,
				whiteTimeMs: fisherClockConfig.initialTimeMs
			}
		}
		if (disconnectTimeout) {
			return {
				blackTimeMs: gameClock.blackTimeMs,
				whiteTimeMs: gameClock.whiteTimeMs
			}
		}
		const nowMs = Date.now()
		const settled =
			gameStarted && !gameResult && isSeatMode && Boolean(fisherClockConfig)
				? settleActiveClock(gameClock, nowMs)
				: { blackTimeMs: gameClock.blackTimeMs, whiteTimeMs: gameClock.whiteTimeMs }
		return {
			blackTimeMs: settled.blackTimeMs,
			whiteTimeMs: settled.whiteTimeMs
		}
	}, [clockTick, disconnectTimeout, fisherClockConfig, gameClock, gameResult, gameStarted, isSeatMode])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (!isSeatMode || disconnectTimeout) return
		if (!fisherClockConfig) return
		if (!soundEnabled) return
		if (!gameClock || !displayedClocks) return

		const audio = countdownAudioRef.current
		if (!audio) return

		const activeRemainingMs =
			gameClock.activeColor === 'black' ? displayedClocks.blackTimeMs : displayedClocks.whiteTimeMs
		if (activeRemainingMs <= 0 || activeRemainingMs > 11_000) {
			audio.pause()
			audio.currentTime = 0
			return
		}

		const turnKey = `${gameClock.activeColor}:${gameClock.turnStartedAtMs}`
		if (countdownPlayedTurnRef.current === turnKey) return
		countdownPlayedTurnRef.current = turnKey

		audio.currentTime = 0
		void audio.play().catch((error) => {
			console.warn('Failed to play countdown audio.', error)
		})
	}, [
		disconnectTimeout,
		displayedClocks,
		fisherClockConfig,
		gameClock,
		gameResult,
		gameStarted,
		isSeatMode,
		soundEnabled
	])

	useEffect(() => {
		if (gameStarted && !gameResult && isSeatMode && fisherClockConfig && soundEnabled && !disconnectTimeout) return
		const audio = countdownAudioRef.current
		if (!audio) return
		audio.pause()
		audio.currentTime = 0
		countdownPlayedTurnRef.current = null
	}, [disconnectTimeout, fisherClockConfig, gameResult, gameStarted, isSeatMode, soundEnabled])

	useEffect(() => {
		if (!gameStarted) return
		if (gameResult) return
		if (disconnectTimeout) return
		if (!isSeatMode) return
		if (!fisherClockConfig) return
		if (gameClock) return
		if (!areBothSeatsTaken) return

		setGameClock({
			blackTimeMs: fisherClockConfig.initialTimeMs,
			whiteTimeMs: fisherClockConfig.initialTimeMs,
			activeColor: getFirstMoveColor(effectiveHandicapStones),
			turnStartedAtMs: Date.now()
		})
	}, [
		areBothSeatsTaken,
		effectiveHandicapStones,
		fisherClockConfig,
		gameClock,
		gameResult,
		gameStarted,
		disconnectTimeout,
		isSeatMode,
		setGameClock
	])

	const disconnectSecondsLeft = useMemo(() => {
		if (!disconnectTimeout || gameResult) return null
		const remainingMs = Math.max(0, disconnectTimeout.expiresAtMs - Date.now())
		return Math.ceil(remainingMs / 1000)
	}, [disconnectTick, disconnectTimeout, gameResult])

	useEffect(() => {
		if (gameStarted) return
		if (!isSeatMode) return
		if (isTimeLimitAllowedForBoardSize(timeLimit, boardSize)) return
		setTimeLimit(getTimeLimitOptionsForBoardSize(boardSize)[0]?.value ?? 'no-limit')
	}, [boardSize, gameStarted, isSeatMode, setTimeLimit, timeLimit])

	const gameSnapshot = useMemo(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
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
	}, [boardSize, effectiveHandicapStones, shownMoves])

	const fullGameSnapshot = useMemo(() => {
		const game = new Game({ boardSize, handicapStones: effectiveHandicapStones })
		for (const move of currentLineMoves) {
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
	}, [boardSize, currentLineMoves, effectiveHandicapStones])

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

	useEffect(() => {
		if (gameStarted) return
		if (isSeatMode) return
		if (timeLimit === 'no-limit') return
		setTimeLimit('no-limit')
	}, [gameStarted, isSeatMode, setTimeLimit, timeLimit])

	const sgfLinkHref = useMemo(() => {
		if (!gameStarted) return null
		if (isSeatMode && !effectiveGameResult) return null

		try {
			const sgf =
				gameMode === 'shared'
					? serializeSgfTreeContent(boardSize, moveTree, ROOT_MOVE_ID, effectiveHandicapStones)
					: serializeSgfContent(boardSize, currentLineMoves, effectiveHandicapStones)
			const file = new Blob([sgf], { type: 'application/x-go-sgf;charset=utf-8' })
			return window.URL.createObjectURL(file)
		} catch {
			return null
		}
	}, [
		boardSize,
		currentLineMoves,
		effectiveGameResult,
		effectiveHandicapStones,
		gameMode,
		gameStarted,
		isSeatMode,
		moveTree
	])

	useEffect(() => {
		if (!sgfLinkHref) return
		return () => window.URL.revokeObjectURL(sgfLinkHref)
	}, [sgfLinkHref])

	const sgfDownloadFileName = useMemo(() => {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		return `mini-weiqi-${boardSize}x${boardSize}-${timestamp}.sgf`
	}, [boardSize])

	const getCurrentSgfContent = useCallback(() => {
		if (!gameStarted) return
		if (isSeatMode && !effectiveGameResult) return

		return gameMode === 'shared'
			? serializeSgfTreeContent(boardSize, moveTree, ROOT_MOVE_ID, effectiveHandicapStones)
			: serializeSgfContent(boardSize, currentLineMoves, effectiveHandicapStones)
	}, [
		boardSize,
		currentLineMoves,
		effectiveGameResult,
		effectiveHandicapStones,
		gameMode,
		gameStarted,
		isSeatMode,
		moveTree
	])

	const aiSenseiUploadHref = useMemo(() => {
		const sgf = getCurrentSgfContent()
		if (!sgf) return null
		const params = new URLSearchParams({ sgf })
		return `https://ai-sensei.com/upload?${params.toString()}`
	}, [getCurrentSgfContent])

	const handleOpenAiSensei = useCallback(async () => {
		if (!aiSenseiUploadHref) return

		try {
			await discordSdk.commands.openExternalLink({
				url: aiSenseiUploadHref
			})
		} catch (error) {
			console.error('Failed to open AI Sensei via Discord SDK.', error)
			window.open(aiSenseiUploadHref, '_blank', 'noopener,noreferrer')
		}
	}, [aiSenseiUploadHref, discordSdk])

	const handleShareResult = useCallback(async () => {
		if (!effectiveGameResult) return
		if (!discordSdk.instanceId) {
			window.alert('Share result is only available inside Discord.')
			return
		}
		const boardElement = document.querySelector('.tenuki-board.tenuki-svg-renderer')
		if (!(boardElement instanceof HTMLDivElement)) {
			window.alert('Board is not ready for sharing.')
			return
		}

		const winnerLine =
			effectiveGameResult.winner === 'draw'
				? 'Result: Draw'
				: `Result: ${effectiveGameResult.winner === 'black' ? 'Black' : 'White'} wins`
		const scoreLine = `Score: Black ${effectiveGameResult.blackScore} - ${effectiveGameResult.whiteScore} White`
		const playersLine = `Players: B ${blackPlayer?.username ?? 'Black'} vs W ${whitePlayer?.username ?? 'White'}`

		try {
			setIsSharingResult(true)
			const imageBlob = await renderBoardImageBlob({
				boardElement,
				captionLines: [winnerLine, scoreLine, playersLine],
				captionPlacement: 'right'
			})
			const imageFile = new File([imageBlob], 'mini-weiqi-result.png', { type: 'image/png' })
			const body = new FormData()
			body.append('file', imageFile)

			const attachmentResponse = await fetch(
				`https://discord.com/api/applications/${import.meta.env.VITE_DISCORD_CLIENT_ID}/attachment`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${session?.access_token ?? ''}`
					},
					body
				}
			)

			if (!attachmentResponse.ok) {
				throw new Error('Failed to upload image attachment.')
			}
			const attachmentJson: { attachment?: { url?: string } } = await attachmentResponse.json()
			const mediaUrl = attachmentJson.attachment?.url
			if (!mediaUrl) {
				throw new Error('Discord attachment URL was missing.')
			}
			await discordSdk.commands.openShareMomentDialog({ mediaUrl })
		} catch (error) {
			console.error('Failed to share game result.', error)
			window.alert('Failed to share result. Please try again.')
		} finally {
			setIsSharingResult(false)
		}
	}, [blackPlayer?.username, discordSdk, effectiveGameResult, session?.access_token, whitePlayer?.username])

	const handleMoveToStart = useCallback(() => {
		if (gameMode !== 'shared') return
		setCurrentMoveId(ROOT_MOVE_ID)
		setDisplayedMoveCount(0)
		setMoves([])
	}, [gameMode, setCurrentMoveId, setMoves])

	const handleMoveBackward = useCallback(() => {
		if (gameMode !== 'shared') return
		const parentId = moveTree[currentMoveId]?.parentId
		if (!parentId) return
		setCurrentMoveId(parentId)
		setDisplayedMoveCount(getNodeDepth(moveTree, parentId))
		setMoves(getMovesFromNodeId(moveTree, parentId))
	}, [currentMoveId, gameMode, moveTree, setCurrentMoveId, setMoves])

	const handleMoveForward = useCallback(() => {
		if (gameMode !== 'shared') return
		const nextId = moveTree[currentMoveId]?.childrenIds[0]
		if (!nextId) return
		setCurrentMoveId(nextId)
		setDisplayedMoveCount(getNodeDepth(moveTree, nextId))
		setMoves(getMovesFromNodeId(moveTree, nextId))
	}, [currentMoveId, gameMode, moveTree, setCurrentMoveId, setMoves])

	const handleMoveToEnd = useCallback(() => {
		if (gameMode !== 'shared') return
		const targetId = getMainLineLeafFromNode(moveTree, currentMoveId)
		setCurrentMoveId(targetId)
		setDisplayedMoveCount(getNodeDepth(moveTree, targetId))
		setMoves(getMovesFromNodeId(moveTree, targetId))
	}, [currentMoveId, gameMode, moveTree, setCurrentMoveId, setMoves])

	const handleMoveToCount = useCallback(
		(count: number, moveId?: string) => {
			if (gameMode !== 'shared') return
			const targetId =
				moveId && moveTree[moveId] ? moveId : getMainLineNodeAtDepth(moveTree, Math.max(0, Math.floor(count)))
			const depth = getNodeDepth(moveTree, targetId)
			setCurrentMoveId(targetId)
			setDisplayedMoveCount(depth)
			setMoves(getMovesFromNodeId(moveTree, targetId))
		},
		[gameMode, moveTree, setCurrentMoveId, setMoves]
	)

	if (showGameBoard) {
		return (
			<div className="app-shell app-shell--board">
				<input ref={fileInputRef} type="file" accept=".sgf" hidden onChange={handleSgfFileChange} />
				<GameBoard
					boardSize={boardSize}
					onBoardSizeChange={handleBoardSizeChange}
					handicapStones={effectiveHandicapStones}
					onHandicapChange={handleHandicapChange}
					blackPlayer={blackPlayer}
					whitePlayer={whitePlayer}
					onJoinBlack={handleJoinBlack}
					onJoinWhite={handleJoinWhite}
					onLeaveSeat={handleLeaveSeat}
					playerColor={playerColor}
					gameMode={gameMode}
					onGameModeChange={(mode) => setStoredGameMode(normalizeGameMode(mode))}
					oneColorStoneColor={oneColorStoneColor}
					onOneColorStoneColorChange={setOneColorStoneColor}
					timeLimit={timeLimit}
					onTimeLimitChange={handleTimeLimitChange}
					gameStarted={gameStarted}
					onStartGame={handleStartGame}
					onStartNewGame={handleStartNewGame}
					moves={shownMoves}
					moveTree={moveTree}
					currentMoveId={currentMoveId}
					currentMoveCount={displayedMoveCount}
					capturedByBlack={gameSnapshot.black}
					capturedByWhite={gameSnapshot.white}
					isViewingLatestMove={!selectedNode || selectedNode.childrenIds.length === 0}
					canMoveBackward={currentMoveId !== ROOT_MOVE_ID}
					canMoveForward={Boolean(selectedNode?.childrenIds[0])}
					onMoveToStart={handleMoveToStart}
					onMoveBackward={handleMoveBackward}
					onMoveForward={handleMoveForward}
					onMoveToEnd={handleMoveToEnd}
					onMoveToCount={handleMoveToCount}
					onPlayMove={handlePlayMove}
					onPassTurn={handlePassTurn}
					onResign={handleResign}
					onImportSgf={handleImportSgf}
					sgfLinkHref={sgfLinkHref}
					aiSenseiUploadHref={aiSenseiUploadHref}
					onOpenAiSensei={handleOpenAiSensei}
					canShareResult={Boolean(effectiveGameResult && discordSdk.instanceId && session?.access_token)}
					isSharingResult={isSharingResult}
					onShareResult={handleShareResult}
					sgfDownloadFileName={sgfDownloadFileName}
					gameResult={effectiveGameResult}
					blackTimeMs={displayedClocks?.blackTimeMs ?? null}
					whiteTimeMs={displayedClocks?.whiteTimeMs ?? null}
					disconnectTimeout={disconnectTimeout}
					disconnectSecondsLeft={disconnectSecondsLeft}
					onExitMode={handleExitMode}
					hideJoinButtons={isUnauthenticated}
					soundEnabled={soundEnabled}
					onToggleSound={() => setSoundEnabled((current) => !current)}
				/>
			</div>
		)
	}

	return (
		<div className="app-shell app-shell--menu">
			<Menu
				onStart={() => setShowGameBoard(true)}
				onOpenPrivacyPolicy={() => onNavigate('/privacy-policy')}
				onOpenTermsOfService={() => onNavigate('/terms-of-service')}
			/>
		</div>
	)
}
