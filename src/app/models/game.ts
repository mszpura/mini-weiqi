export type GameMode = 'normal' | 'rengo' | 'shared'

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
