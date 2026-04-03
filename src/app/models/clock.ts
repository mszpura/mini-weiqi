import type { GameClockState } from './game'

export const settleActiveClock = (clock: GameClockState, nowMs: number) => {
	const elapsedMs = Math.max(0, nowMs - clock.turnStartedAtMs)
	const nextBlack = clock.activeColor === 'black' ? Math.max(0, clock.blackTimeMs - elapsedMs) : clock.blackTimeMs
	const nextWhite = clock.activeColor === 'white' ? Math.max(0, clock.whiteTimeMs - elapsedMs) : clock.whiteTimeMs
	return {
		blackTimeMs: nextBlack,
		whiteTimeMs: nextWhite
	}
}

export const applyFisherMove = (clock: GameClockState, nowMs: number, incrementMs: number): GameClockState => {
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
