export const WORLD_ADDRESS =
  (process.env.NEXT_PUBLIC_WORLD_ADDRESS as `0x${string}` | undefined) ?? undefined;

export function hasWorld(): boolean {
  return !!WORLD_ADDRESS && /^0x[a-fA-F0-9]{40}$/.test(WORLD_ADDRESS);
}

export const MAP_WIDTH = 10;
export const MAP_HEIGHT = 10;
