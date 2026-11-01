/**
 * A classroom must opt into media permissions at the HTTP document boundary.
 * This is not a device permission grant: browsers still ask the user.
 */
export function mediaPermissionsPolicy({deploymentClass, enabled, isHtml}) {
  if (deploymentClass === 'adult-pilot' && enabled === 'true' && isHtml === true) {
    return 'camera=(self), microphone=(self), display-capture=(self), geolocation=()';
  }
  return 'camera=(), microphone=(), display-capture=(), geolocation=()';
}
