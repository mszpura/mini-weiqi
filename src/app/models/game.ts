export type GameMode = 'normal' | 'shared'

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
	reason: 'resign' | 'finished'
	resignedBy?: 'black' | 'white'
}
