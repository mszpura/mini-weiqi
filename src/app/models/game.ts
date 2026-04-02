export type GameMode = 'normal' | 'one-color' | 'shared'
export type OneColorStoneColor = 'black' | 'white'
export type GameTimeLimit =
	| 'no-limit'
	| 'fisher-15s-1s'
	| 'fisher-1m-5s'
	| 'fisher-2m-5s'
	| 'fisher-5m-10s'
	| 'fisher-15m-10s'
	| 'fisher-45m-15s'

type SupportedBoardSize = 9 | 13 | 19

type TimeLimitOption = {
	value: GameTimeLimit
	label: string
}

export type FisherClockConfig = {
	initialTimeMs: number
	incrementMs: number
}

const TIME_LIMIT_OPTIONS_BY_BOARD_SIZE: Record<SupportedBoardSize, readonly TimeLimitOption[]> = {
	9: [
		{ value: 'no-limit', label: 'No limit' },
		{ value: 'fisher-15s-1s', label: 'Fisher 15s + 1s' },
		{ value: 'fisher-1m-5s', label: 'Fisher 1m + 5s' }
	],
	13: [
		{ value: 'no-limit', label: 'No limit' },
		{ value: 'fisher-2m-5s', label: 'Fisher 2min + 5s' },
		{ value: 'fisher-5m-10s', label: 'Fisher 5min + 10s' }
	],
	19: [
		{ value: 'no-limit', label: 'No limit' },
		{ value: 'fisher-5m-10s', label: 'Fisher 5min + 10s' },
		{ value: 'fisher-15m-10s', label: 'Fisher 15min + 10s' },
		{ value: 'fisher-45m-15s', label: 'Fisher 45min + 15s' }
	]
}

const FISHER_CLOCK_CONFIGS: Partial<Record<GameTimeLimit, FisherClockConfig>> = {
	'fisher-15s-1s': { initialTimeMs: 15 * 1000, incrementMs: 1 * 1000 },
	'fisher-1m-5s': { initialTimeMs: 1 * 60 * 1000, incrementMs: 5 * 1000 },
	'fisher-2m-5s': { initialTimeMs: 2 * 60 * 1000, incrementMs: 5 * 1000 },
	'fisher-5m-10s': { initialTimeMs: 5 * 60 * 1000, incrementMs: 10 * 1000 },
	'fisher-15m-10s': { initialTimeMs: 15 * 60 * 1000, incrementMs: 10 * 1000 },
	'fisher-45m-15s': { initialTimeMs: 45 * 60 * 1000, incrementMs: 15 * 1000 }
}

const normalizeBoardSize = (boardSize: number): SupportedBoardSize => {
	if (boardSize === 9 || boardSize === 13 || boardSize === 19) {
		return boardSize
	}
	return 19
}

export const getTimeLimitOptionsForBoardSize = (boardSize: number): readonly TimeLimitOption[] =>
	TIME_LIMIT_OPTIONS_BY_BOARD_SIZE[normalizeBoardSize(boardSize)]

export const isTimeLimitAllowedForBoardSize = (timeLimit: GameTimeLimit, boardSize: number): boolean =>
	getTimeLimitOptionsForBoardSize(boardSize).some((option) => option.value === timeLimit)

export const getFisherClockConfig = (timeLimit: GameTimeLimit): FisherClockConfig | null =>
	FISHER_CLOCK_CONFIGS[timeLimit] ?? null

type PlayMove = {
	type: 'play'
	y: number
	x: number
}

type PassMove = {
	type: 'pass'
}

export type GameMove = PlayMove | PassMove

export const isPassMove = (move: GameMove): move is PassMove => 'type' in move && move.type === 'pass'

export type MoveTreeNode = {
	id: string
	parentId: string | null
	move: GameMove | null
	childrenIds: string[]
}

export type GameWinner = 'black' | 'white' | 'draw'

export type GameResult = {
	winner: GameWinner
	blackScore: number
	whiteScore: number
	reason: 'resign' | 'finished' | 'time' | 'disconnect'
	resignedBy?: 'black' | 'white'
	timedOutBy?: 'black' | 'white'
	disconnectedBy?: 'black' | 'white'
}

export type DisconnectTimeoutState = {
	color: 'black' | 'white'
	playerId: string
	startedAtMs: number
	expiresAtMs: number
}

export type GameClockState = {
	blackTimeMs: number
	whiteTimeMs: number
	activeColor: 'black' | 'white'
	turnStartedAtMs: number
}
