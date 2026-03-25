import { developmentFeatureFlags } from './featureFlags.development'
import { productionFeatureFlags } from './featureFlags.production'

export const featureFlags = import.meta.env.DEV ? developmentFeatureFlags : productionFeatureFlags
