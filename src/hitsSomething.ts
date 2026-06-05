import { GameState } from "./types";
import { getRowColIndex } from "./pure_functions";
import { brickCenterX, brickCenterY } from "./game_utils";

export const COINS_EXTRA_HIT_RADIUS = 1.2;

export function brickIndex(gameState: GameState, x: number, y: number) {
  const index = getRowColIndex(
    gameState,
    Math.floor(y / gameState.brickWidth),
    Math.floor((x - gameState.offsetX) / gameState.brickWidth),
  );
  if (gameState.perks.round_bricks && index !== -1) {
    const dx = x - brickCenterX(gameState, index);
    const dy = y - brickCenterY(gameState, index);
    const radius = gameState.brickWidth / 2.8;
    if (dx * dx + dy * dy > radius * radius) return -1;
  }
  return index;
}

export function hasBrick(
  gameState: GameState,
  index: number,
): number | undefined {
  if (gameState.bricks[index]) return index;
}

let hit: {
  hitBrick?: number;
  hitX?: number;
  hitY?: number;
  cos?: number;
  sin?: number;
} = {};

export function hitsSomething(
  gameState: GameState,
  x: number,
  y: number,
  radius: number,
) {
  delete hit.hitBrick;
  // find the closest hit item
  const extraSegments = Math.floor((radius * 2) / gameState.brickWidth);
  const xyList = getCoordinatesList(extraSegments);
  let distToCenter = 10000;

  for (let i = 0; i < xyList.length; i++) {
    const cos = xyList[i].cos;
    const sin = xyList[i].sin;
    const hitX = x + cos * radius;
    const hitY = y + sin * radius;
    const hitBrick = hasBrick(gameState, brickIndex(gameState, hitX, hitY));
    // index might be 0
    if (typeof hitBrick === "undefined") continue;
    const dist = distanceToBrickCenter(gameState, hitBrick, hitX, hitY);
    if (dist < distToCenter) {
      distToCenter = dist;
      hit.cos = cos;
      hit.sin = sin;
      hit.hitX = hitX;
      hit.hitY = hitY;
      hit.hitBrick = hitBrick;
    }
  }

  if (typeof hit.hitBrick !== "undefined") {
    return hit as {
      hitBrick: number;
      hitX: number;
      hitY: number;
      cos: number;
      sin: number;
    };
  }
}

export function distanceToBrickCenter(
  gameState: GameState,
  index: number,
  x: number,
  y: number,
) {
  const dx = x - brickCenterX(gameState, index);
  const dy = y - brickCenterY(gameState, index);
  return dx * dx + dy * dy;
}

const coordinatesListCache: Record<
  number,
  Array<{ cos: number; sin: number }>
> = {};
function getCoordinatesList(extraSegments: number) {
  // retuns a list of points in a circle to check for collisions
  if (!coordinatesListCache[extraSegments]) {
    coordinatesListCache[extraSegments] = [];
    for (let extra = 0; extra < 1 + extraSegments; extra++) {
      const baseAngle = ((extra / (1 + extraSegments)) * Math.PI) / 2;
      for (let step = 0; step < 8; step++) {
        const angle = baseAngle + (step * Math.PI * 2) / 8;
        coordinatesListCache[extraSegments].push({
          cos: Math.cos(angle),
          sin: Math.sin(angle),
        });
      }
    }
  }
  return coordinatesListCache[extraSegments];
}
