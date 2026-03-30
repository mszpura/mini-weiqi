import type { FeatureFlags } from './featureFlags.types'

export const productionFeatureFlags: FeatureFlags = {
	channelName: false,
	moveTree: true,
	oneColorGo: true,
	sgfExportMode: 'copyToClipboard'
}
