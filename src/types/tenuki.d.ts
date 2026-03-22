declare module 'tenuki' {
	type StoneColor = 'black' | 'white'

	type TenukiHooks = {
		handleClick?: (y: number, x: number) => void
		hoverValue?: (y: number, x: number) => StoneColor | undefined
		gameIsOver?: () => boolean
	}

	type GameOptions = {
		element?: HTMLElement
		boardSize?: number
		handicapStones?: number
		freeHandicapPlacement?: boolean
		_hooks?: TenukiHooks
	}

	type GameRenderer = {
		computeSizing?: () => void
	}

	type GameState = {
		blackStonesCaptured: number
		whiteStonesCaptured: number
	}

	type GameScore = {
		black: number
		white: number
	}

	export class Game {
		constructor(options?: GameOptions)
		renderer?: GameRenderer
		playAt(y: number, x: number): boolean
		pass(): boolean
		score(): GameScore
		isOver(): boolean
		isIllegalAt(y: number, x: number): boolean
		currentPlayer(): StoneColor
		currentState(): GameState
	}
}
