import { soilMixGuide } from './soilMixGuide';

export const resources = [
  soilMixGuide,
];

export function getResourceById(resourceId) {
  return resources.find((resource) => resource.id === resourceId);
}
