export type GameMode = 'normal' | 'one-color' | 'shared'
export type OneColorStoneColor = 'black' | 'white'
export type GameTimeLimit =
	| 'no-limit'
	| 'fisher-1m-10s'
	| 'fisher-5m-12s'
	| 'fisher-10m-15s'
	| 'byo-yomi-30s-3x10s'
	| 'byo-yomi-5m-3x30s'
	| 'byo-yomi-20m-3x30s'
	| 'byo-yomi-40m-3x30s'

type SupportedBoardSize = 9 | 13 | 19

type TimeLimitOption = {
	value: GameTimeLimit
	label: string
}

export type FisherClockConfig = {
	initialTimeMs: number
	incrementMs: number
}

export type ByoYomiClockConfig = {
	initialTimeMs: number
	periods: number
	periodMs: number
}

export type TimeControlConfig =
	| ({ system: 'fisher' } & FisherClockConfig)
	| ({ system: 'byo-yomi' } & ByoYomiClockConfig)

const TIME_LIMIT_OPTIONS: readonly TimeLimitOption[] = [
	{ value: 'no-limit', label: 'No limit' },
	{ value: 'fisher-1m-10s', label: 'Fisher 1m + 10s' },
	{ value: 'fisher-5m-12s', label: 'Fisher 5m + 12s' },
	{ value: 'fisher-10m-15s', label: 'Fisher 10m + 15s' },
	{ value: 'byo-yomi-30s-3x10s', label: 'Byo yomi 30s + 3x10s' },
	{ value: 'byo-yomi-5m-3x30s', label: 'Byo yomi 5m + 3x30s' },
	{ value: 'byo-yomi-20m-3x30s', label: 'Byo yomi 20m + 3x30s' },
	{ value: 'byo-yomi-40m-3x30s', label: 'Byo yomi 40m + 3x30s' }
]

const TIME_LIMIT_CONFIGS: Partial<Record<GameTimeLimit, TimeControlConfig>> = {
	'fisher-1m-10s': { system: 'fisher', initialTimeMs: 1 * 60 * 1000, incrementMs: 10 * 1000 },
	'fisher-5m-12s': { system: 'fisher', initialTimeMs: 5 * 60 * 1000, incrementMs: 12 * 1000 },
	'fisher-10m-15s': { system: 'fisher', initialTimeMs: 10 * 60 * 1000, incrementMs: 15 * 1000 },
	'byo-yomi-30s-3x10s': { system: 'byo-yomi', initialTimeMs: 30 * 1000, periods: 3, periodMs: 10 * 1000 },
	'byo-yomi-5m-3x30s': { system: 'byo-yomi', initialTimeMs: 5 * 60 * 1000, periods: 3, periodMs: 30 * 1000 },
	'byo-yomi-20m-3x30s': { system: 'byo-yomi', initialTimeMs: 20 * 60 * 1000, periods: 3, periodMs: 30 * 1000 },
	'byo-yomi-40m-3x30s': { system: 'byo-yomi', initialTimeMs: 40 * 60 * 1000, periods: 3, periodMs: 30 * 1000 }
}

const normalizeBoardSize = (boardSize: number): SupportedBoardSize => {
	if (boardSize === 9 || boardSize === 13 || boardSize === 19) {
		return boardSize
	}
	return 19
}

export const getTimeLimitOptionsForBoardSize = (boardSize: number): readonly TimeLimitOption[] =>
	normalizeBoardSize(boardSize) ? TIME_LIMIT_OPTIONS : TIME_LIMIT_OPTIONS

export const isTimeLimitAllowedForBoardSize = (timeLimit: GameTimeLimit, boardSize: number): boolean =>
	getTimeLimitOptionsForBoardSize(boardSize).some((option) => option.value === timeLimit)

export const getTimeControlConfig = (timeLimit: GameTimeLimit): TimeControlConfig | null =>
	TIME_LIMIT_CONFIGS[timeLimit] ?? null

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

export type BoardMarkerSymbol = 'triangle' | 'square' | 'circle' | 'x'

export type BoardMarker = {
	x: number
	y: number
	symbol: BoardMarkerSymbol
}

export type MoveTreeNode = {
	id: string
	parentId: string | null
	move: GameMove | null
	childrenIds: string[]
	comment?: string
	markers?: BoardMarker[]
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
	blackByoYomiPeriodsLeft: number | null
	whiteByoYomiPeriodsLeft: number | null
	blackInByoYomi: boolean
	whiteInByoYomi: boolean
	activeColor: 'black' | 'white'
	turnStartedAtMs: number
}
