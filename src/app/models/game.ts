export type GameMode = 'normal' | 'shared'
export type GameTimeLimit = 'no-limit' | 'fisher-15-10'

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

export type GameWinner = 'black' | 'white' | 'draw'

export type GameResult = {
	winner: GameWinner
	blackScore: number
	whiteScore: number
	reason: 'resign' | 'finished' | 'time'
	resignedBy?: 'black' | 'white'
	timedOutBy?: 'black' | 'white'
}

export type GameClockState = {
	blackTimeMs: number
	whiteTimeMs: number
	activeColor: 'black' | 'white'
	turnStartedAtMs: number
}
