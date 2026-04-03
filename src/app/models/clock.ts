import type { GameClockState, TimeControlConfig } from './game'

const clampMs = (value: number) => Math.max(0, Math.floor(value))

const settleByoYomiPlayerClock = (
	timeMs: number,
	periodsLeft: number,
	elapsedMs: number,
	periodMs: number,
	inByoYomi: boolean
) => {
	let remainingElapsed = Math.max(0, elapsedMs)
	let nextPeriods = Math.max(0, periodsLeft)
	let nextInByoYomi = inByoYomi
	let currentTimeMs = Math.max(0, timeMs)

	if (!nextInByoYomi) {
		const spentMain = Math.min(currentTimeMs, remainingElapsed)
		currentTimeMs -= spentMain
		remainingElapsed -= spentMain
		if (currentTimeMs === 0) {
			nextInByoYomi = true
			if (nextPeriods > 0) {
				currentTimeMs = periodMs
			}
		}
	}

	if (nextInByoYomi && nextPeriods > 0 && currentTimeMs <= 0) {
		currentTimeMs = periodMs
	}

	while (nextInByoYomi && nextPeriods > 0 && remainingElapsed >= currentTimeMs) {
		remainingElapsed -= currentTimeMs
		nextPeriods -= 1
		if (nextPeriods <= 0) {
			currentTimeMs = 0
			break
		}
		currentTimeMs = periodMs
	}

	if (nextInByoYomi && nextPeriods > 0 && remainingElapsed > 0) {
		currentTimeMs = Math.max(0, currentTimeMs - remainingElapsed)
	}

	return {
		timeMs: clampMs(currentTimeMs),
		periodsLeft: nextPeriods,
		inByoYomi: nextInByoYomi
	}
}

export const settleActiveClock = (clock: GameClockState, nowMs: number, timeControlConfig: TimeControlConfig) => {
	const elapsedMs = Math.max(0, nowMs - clock.turnStartedAtMs)
	if (timeControlConfig.system === 'fisher') {
		const nextBlack =
			clock.activeColor === 'black' ? Math.max(0, clock.blackTimeMs - elapsedMs) : Math.max(0, clock.blackTimeMs)
		const nextWhite =
			clock.activeColor === 'white' ? Math.max(0, clock.whiteTimeMs - elapsedMs) : Math.max(0, clock.whiteTimeMs)
		return {
			blackTimeMs: nextBlack,
			whiteTimeMs: nextWhite,
			blackByoYomiPeriodsLeft: null,
			whiteByoYomiPeriodsLeft: null,
			blackInByoYomi: false,
			whiteInByoYomi: false
		}
	}

	if (clock.activeColor === 'black') {
		const settledBlack = settleByoYomiPlayerClock(
			clock.blackTimeMs,
			clock.blackByoYomiPeriodsLeft ?? timeControlConfig.periods,
			elapsedMs,
			timeControlConfig.periodMs,
			clock.blackInByoYomi ?? false
		)
		return {
			blackTimeMs: settledBlack.timeMs,
			whiteTimeMs: clampMs(clock.whiteTimeMs),
			blackByoYomiPeriodsLeft: settledBlack.periodsLeft,
			whiteByoYomiPeriodsLeft: clock.whiteByoYomiPeriodsLeft ?? timeControlConfig.periods,
			blackInByoYomi: settledBlack.inByoYomi,
			whiteInByoYomi: clock.whiteInByoYomi ?? false
		}
	}

	const settledWhite = settleByoYomiPlayerClock(
		clock.whiteTimeMs,
		clock.whiteByoYomiPeriodsLeft ?? timeControlConfig.periods,
		elapsedMs,
		timeControlConfig.periodMs,
		clock.whiteInByoYomi ?? false
	)
	return {
		blackTimeMs: clampMs(clock.blackTimeMs),
		whiteTimeMs: settledWhite.timeMs,
		blackByoYomiPeriodsLeft: clock.blackByoYomiPeriodsLeft ?? timeControlConfig.periods,
		whiteByoYomiPeriodsLeft: settledWhite.periodsLeft,
		blackInByoYomi: clock.blackInByoYomi ?? false,
		whiteInByoYomi: settledWhite.inByoYomi
	}
}

export const applyMoveWithTimeControl = (
	clock: GameClockState,
	nowMs: number,
	timeControlConfig: TimeControlConfig
): GameClockState => {
	const settled = settleActiveClock(clock, nowMs, timeControlConfig)
	const nextActiveColor = clock.activeColor === 'black' ? 'white' : 'black'

	if (timeControlConfig.system === 'fisher') {
		if (clock.activeColor === 'black') {
			return {
				blackTimeMs: settled.blackTimeMs + timeControlConfig.incrementMs,
				whiteTimeMs: settled.whiteTimeMs,
				blackByoYomiPeriodsLeft: null,
				whiteByoYomiPeriodsLeft: null,
				blackInByoYomi: false,
				whiteInByoYomi: false,
				activeColor: nextActiveColor,
				turnStartedAtMs: nowMs
			}
		}
		return {
			blackTimeMs: settled.blackTimeMs,
			whiteTimeMs: settled.whiteTimeMs + timeControlConfig.incrementMs,
			blackByoYomiPeriodsLeft: null,
			whiteByoYomiPeriodsLeft: null,
			blackInByoYomi: false,
			whiteInByoYomi: false,
			activeColor: nextActiveColor,
			turnStartedAtMs: nowMs
		}
	}

	const activePeriods =
		clock.activeColor === 'black' ? settled.blackByoYomiPeriodsLeft : settled.whiteByoYomiPeriodsLeft
	const activeTimeMs = clock.activeColor === 'black' ? settled.blackTimeMs : settled.whiteTimeMs
	const activeInByoYomi = clock.activeColor === 'black' ? settled.blackInByoYomi : settled.whiteInByoYomi
	const shouldResetPeriod = activeInByoYomi && activeTimeMs > 0 && (activePeriods ?? 0) > 0

	if (clock.activeColor === 'black') {
		return {
			blackTimeMs: shouldResetPeriod ? timeControlConfig.periodMs : settled.blackTimeMs,
			whiteTimeMs: settled.whiteTimeMs,
			blackByoYomiPeriodsLeft: settled.blackByoYomiPeriodsLeft,
			whiteByoYomiPeriodsLeft: settled.whiteByoYomiPeriodsLeft,
			blackInByoYomi: settled.blackInByoYomi,
			whiteInByoYomi: settled.whiteInByoYomi,
			activeColor: nextActiveColor,
			turnStartedAtMs: nowMs
		}
	}
	return {
		blackTimeMs: settled.blackTimeMs,
		whiteTimeMs: shouldResetPeriod ? timeControlConfig.periodMs : settled.whiteTimeMs,
		blackByoYomiPeriodsLeft: settled.blackByoYomiPeriodsLeft,
		whiteByoYomiPeriodsLeft: settled.whiteByoYomiPeriodsLeft,
		blackInByoYomi: settled.blackInByoYomi,
		whiteInByoYomi: settled.whiteInByoYomi,
		activeColor: nextActiveColor,
		turnStartedAtMs: nowMs
	}
}
