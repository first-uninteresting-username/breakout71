import { Level, PerkId, RunHistoryItem, UnlockCondition } from "./types";
import { upgrades } from "./loadGameData";
import { hashCode } from "./getLevelBackground";
import { t } from "./i18n/i18n";

let excluded: Set<PerkId>;

function isExcluded(id: PerkId) {
  if (!excluded) {
    excluded = new Set([
      "extra_levels",
      "one_more_choice",
      "shunt",
      "slow_down",
    ]);
    // Avoid excluding a perk that's needed for the required one
    upgrades.forEach((u) => {
      u.requires.forEach((r) => excluded.add(r));
    });
  }
  return excluded.has(id);
}

export function getLevelUnlockCondition(levelIndex: number): UnlockCondition {
  const result: UnlockCondition = {
    required: [],
    forbidden: [],
    minScore: Math.max(-1000 + 100 * levelIndex, 0),
  };

  if (levelIndex > 20) {
    const possibletargets = [...upgrades]
      .slice(0, Math.floor(levelIndex / 2))
      .filter((u) => !isExcluded(u.id))
      .sort((a, b) => hashCode(levelIndex + a.id) - hashCode(levelIndex + b.id))
      .map((u) => u.id);

    const length = Math.min(3, Math.ceil(levelIndex / 30));
    result.required = possibletargets.slice(0, length);
    result.forbidden = possibletargets.slice(length, length + length);
  }
  return result;
}

export function getBestScoreMatching(
  history: RunHistoryItem[],
  required: PerkId[] = [],
  forbidden: PerkId[] = [],
) {
  return Math.max(
    0,
    ...history
      .filter(
        (r) =>
          !required.find((id) => !r?.perks?.[id]) &&
          !forbidden.find((id) => r?.perks?.[id]),
      )
      .map((r) => r.score),
  );
}

export function isLevelLocked(level: Level, history: RunHistoryItem[]) {
  return (
    getBestScoreMatching(history, level.required, level.forbidden) <
    level.minScore
  );
}

export function reasonLevelIsLocked(
  level: Level,
  history: RunHistoryItem[],
  mentionBestScore: boolean,
): null | { reached: number; minScore: number; text: string } {
  const { required, forbidden, minScore } = level;
  if (!required) {
    debugger;
  }
  const reached = getBestScoreMatching(history, required, forbidden);
  let reachedText =
    reached && mentionBestScore ? t("unlocks.reached", { reached }) : "";
  if (reached >= minScore) {
    return null;
  } else if (!required.length && !forbidden.length) {
    return {
      reached,
      minScore,
      text: t("unlocks.minScore", { minScore }) + reachedText,
    };
  } else {
    const tparams = {
      minScore,
      required: required.map((u) => upgradeName(u)).join(", "),
      forbidden: forbidden.map((u) => upgradeName(u)).join(", "),
    };
    return {
      reached,
      minScore,
      text:
        (forbidden.length
          ? t("unlocks.minScoreWithPerks", tparams)
          : t("unlocks.minScoreWithPerksNoForbidden", tparams)) + reachedText,
    };
  }
}

export function upgradeName(id: PerkId) {
  return upgrades.find((u) => u.id == id)!.name;
}
