import { GameState, PerkId, RunParams } from "./types";
import {
  allLevels,
  allLevelsAndIcons,
  appVersion,
  upgrades,
} from "./loadGameData";
import { defaultSounds, getHighScore, makeEmptyPerksMap } from "./game_utils";
import { resetBalls } from "./gameStateMutators";
import { getHistory } from "./gameOver";
import { getSettingValue } from "./settings";
import { getStartingPerks } from "./startingPerks";
import { isLevelLocked } from "./get_level_unlock_condition";
import {
  dontOfferTooSoon,
  logUpgradePicked,
  logUpgradeShown,
} from "./openUpgradesPicker";

export function getRunLevels(
  params: RunParams,
  randomGift: PerkId | undefined,
) {
  const unlockedBefore = new Set(
    getSettingValue("breakout_71_unlocked_levels", []),
  );

  const history = getHistory();
  const unlocked = allLevels.filter(
    (l, li) => unlockedBefore.has(l.name) || !isLevelLocked(l, history),
  );
  const firstLevel = params?.level
    ? [params.level]
    : allLevelsAndIcons.filter((l) => l.name == "icon:" + randomGift);

  const restInRandomOrder = unlocked
    .filter((l) => l.name !== params?.level?.name)
    .filter((l) => l.name !== params?.levelToAvoid)
    .sort(() => Math.random() - 0.5);

  return firstLevel
    .concat(
      restInRandomOrder.slice(0, 7 + 3).sort((a, b) => a.sortKey - b.sortKey),
    )
    .concat(restInRandomOrder.slice(7 + 3));
}

export function newGameState(params: RunParams): GameState {
  const highScore = parseFloat(getHighScore().toString());

  if (params.runType === "normal") {
    const randomPick = getStartingPerks();

    params.perks ||= randomPick.perks;
    params.mainPerkId ||= randomPick.mainPerkId;
  }

  const perks = {
    ...makeEmptyPerksMap(upgrades),
    ...(params?.perks || {}),
  };

  if (params.runType === "normal")
    Object.keys(perks)
      .filter((id) => perks[id as PerkId])
      .forEach((id) => {
        logUpgradeShown(id as PerkId);
        logUpgradePicked(id as PerkId);
      });

  const runLevels = getRunLevels(params, params.mainPerkId);

  const gameState: GameState = {
    startParams: params,
    runLevels,
    level: runLevels[0],
    currentLevel: 0,
    upgradesOfferedFor: -1,
    perks,
    puckWidth: 200,
    baseSpeed: 12,
    combo: 1,
    lastCombo: 1,
    gridSize: 12,
    running: false,
    isGameOver: false,
    ballStickToPuck: true,
    puckPosition: 400,
    lastPuckPosition: 400,
    lastPuckMove: 0,
    levelLostCoins: 0,
    startCountDown: 0,
    lastZenComboIncrease: 0,
    pauseTimeout: null,
    canvasWidth: 0,
    canvasHeight: 0,
    offsetX: 0,
    offsetXRoundedDown: 0,
    gameZoneWidth: 0,
    gameZoneWidthRoundedUp: 0,
    gameZoneHeight: 0,
    brickWidth: 0,
    score: 0,
    lastScoreIncrease: -1000,
    levelCaughtCoins: 0,
    levelBrickBroken: 0,
    lastExplosion: -1000,
    lastBrickBroken: 0,
    highScore,
    balls: [],
    ballsColor: "#FFFFFF",
    bricks: [],
    brickHP: [],
    lights: { indexMin: 0, total: 0, list: [] },
    particles: { indexMin: 0, total: 0, list: [] },
    texts: { indexMin: 0, total: 0, list: [] },
    coins: { indexMin: 0, total: 0, list: [] },
    respawns: { indexMin: 0, total: 0, list: [] },
    delayedDmgs: { indexMin: 0, total: 0, list: [] },
    levelStartScore: 0,
    levelMisses: 0,
    levelSpawnedCoins: 0,
    puckColor: "#FFFFFF",
    ballSize: Math.ceil(20),
    coinSize: Math.ceil(14),
    puckHeight: Math.ceil(20),
    pauseUsesDuringRun: 0,
    keyboardPuckSpeed: 0,
    lastTick: performance.now(),
    lastTickDown: 0,
    runStatistics: {
      started: Date.now(),
      levelsPlayed: 0,
      runTime: 0,
      coins_spawned: 0,
      score: 0,
      bricks_broken: 0,
      misses: 0,
      balls_lost: 0,
      puck_bounces: 0,
      wall_bounces: 0,
      upgrades_picked: 1,
      max_combo: 1,
    },
    offersCount: {},
    levelTime: 0,
    winAt: 0,
    levelWallBounces: 0,
    needsRender: true,
    autoCleanUses: 0,
    ...defaultSounds(),
    rerolls: 0,
    gameVersion: appVersion,
  };

  resetBalls(gameState);

  for (let perk of upgrades) {
    if (perks[perk.id]) {
      dontOfferTooSoon(gameState, perk.id);
    }
  }
  return gameState;
}
