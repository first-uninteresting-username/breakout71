import { GameState, Level, RunParams } from "./types";
import { getSettingValue, setSettingValue } from "./settings";
import { reasonLevelIsLocked } from "./get_level_unlock_condition";
import { allLevels } from "./loadGameData";
import { getHistory } from "./gameOver";
import { asyncAlert } from "./asyncAlert";
import { getCheckboxIcon, getIcon } from "./levelIcon";
import { miniMarkDown } from "./pure_functions";
import { describeLevel } from "./game_utils";
import { t } from "./i18n/i18n";
import {
  confirmRestart,
  mainGameState,
  openUnlockedLevelsList,
  restart,
} from "./game";

export async function openLevelDetails(level: Level) {
  const unlockedBefore = new Set<string>(
    getSettingValue("breakout_71_unlocked_levels", []),
  );

  const isLocked = !unlockedBefore.has(level.name);
  const lockReason = isLocked
    ? reasonLevelIsLocked(
        allLevels.indexOf(level),
        level.name,
        getHistory(),
        true,
      )
    : null;

  const activeLevels = allLevels
    .filter((level) => unlockedBefore.has(level.name))
    .filter((level) => getSettingValue("offer-level-" + level.name, true));

  const allowedInGame =
    !isLocked && getSettingValue("offer-level-" + level.name, true);
  const allowDisabling = !allowedInGame || activeLevels?.length > 15;

  const currentIndex = allLevels.indexOf(level);
  const next = allLevels[currentIndex + 1];
  const previous = allLevels[currentIndex - 1];

  const action = await asyncAlert<string>({
    title: `<span class="perk-title">
    <button ${previous ? 'data-resolve-to="previous"' : "disabled"} data-tooltip="${t("unlocks.previous")}">‹ </button>
    <span>${level.name}</span>
    <button ${next ? 'data-resolve-to="next"' : "disabled"} data-tooltip="${t("unlocks.next")}">  ›</button></span> 
    `,
    content: [
      `<div class="full-width-icon">${getIcon(level.name, 350)}</div>`,
      miniMarkDown(level.credit || ""),
      describeLevel(level),
      lockReason ? t("unlocks.unlock_condition") + lockReason.text : "",
      {
        value: "run",
        icon: getIcon("icon:new_run"),
        text: t("unlocks.try"),
        disabled: isLocked,
      },
      {
        icon: getCheckboxIcon(allowedInGame && !isLocked),
        value: "toggle-offer-level",
        text: t("unlocks.include_in_level_pool"),
        help: allowDisabling
          ? t("unlocks.include_in_level_pool_help")
          : t("unlocks.include_in_level_pool_locked"),
        disabled: isLocked || !allowDisabling,
      },
    ],
    allowClose: true,
  });
  if (!action) return openUnlockedLevelsList();
  if (action === "run") {
    if (await confirmRestart(mainGameState)) {
      restart({ runType: "level_preview_run", level } as RunParams);
      return;
    }
  }
  if (action === "toggle-offer-level") {
    setSettingValue("offer-level-" + level.name, !allowedInGame);
  }
  if (next && action === "next") {
    return openLevelDetails(next);
  }
  if (previous && action === "previous") {
    return openLevelDetails(previous);
  }
  await openLevelDetails(level);
}

export function closeLevelPreview(gameState: GameState) {
  openLevelDetails(gameState.level);
  restart({ runType: "normal" });
}
