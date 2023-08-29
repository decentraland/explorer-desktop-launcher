import fetch from 'cross-fetch'
export let featureFlags: any;

export const getFeatureFlag = async (featureFlag: string) => {
  if (!featureFlags) {
    try {
      console.log("> fetching feature flags")

      const response = await fetch('https://feature-flags.decentraland.org/explorer.json');

      if (!response.ok) {
        throw new Error('Failed to fetch feature-flags JSON');
      }

      featureFlags = await response.json();

      if (!featureFlags.flags) {
        throw new Error('Feature-flags format is invalid');
      }

      console.log(featureFlags.flags)
    } catch (error) {
      console.error('Error retrieving JSON data:', error);
    }
  }

  if (featureFlags.flags[featureFlag]) {
    return true;
  }
  return false;
}