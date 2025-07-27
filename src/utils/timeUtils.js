// src/utils/timeUtils.js
export const getElapsedTime = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = Math.floor((now - created) / 1000); // in seconds

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
