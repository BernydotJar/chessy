/**
 * Explicit deployment policy for private rooms, distinct from the level 0->1
 * curriculum. No backend room endpoints are accessed when disabled.
 * Once real room data ever exists, preserve DATA_MAY_EXIST=true across rollbacks.
 */
export const privateRoomsEnabled = import.meta.env.VITE_CHESSY_PRIVATE_ROOMS_ENABLED === 'true';
export const roomDataMayExist =
  privateRoomsEnabled || import.meta.env.VITE_CHESSY_ROOMS_DATA_MAY_EXIST === 'true';
