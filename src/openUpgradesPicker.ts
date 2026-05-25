import { GameState, PerkId, Upgrade } from "./types";
import {
  catchRateBest,
  catchRateGood,
  choicePerGold,
  choicePerSilver,
  levelTimeBest,
  levelTimeGood,
  missesBest,
  missesGood,
  upPerGold,
  upPerSilver,
} from "./pure_functions";
import { t } from "./i18n/i18n";
import { requiredAsyncAlert } from "./asyncAlert";
import {
  escapeAttribute,
  getPossibleUpgrades,
  levelsListHTMl,
  renderMaxLevel,
  upgradeLevelAndMaxDisplay,
} from "./game_utils";
import { getFirstUnlockable, getNearestUnlockHTML } from "./openScorePanel";
import { isOptionOn } from "./options";
import { getWorstFPSAndReset } from "./fps";
import {
  getCurrentMaxCoins,
  getSettingValue,
  setSettingValue,
} from "./settings";
import { toast } from "./toast";
import { getIcon } from "./levelIcon";
import { pickedUpgradesHTMl } from "./picked_upgrades_html";

export async function openUpgradesPicker(gameState: GameState) {
  if (gameState.perks.chill) return;
  const catchRate =
    gameState.levelCaughtCoins / (gameState.levelSpawnedCoins || 1);

  let medals = [];
  let upgradePoints = 1;
  let extraChoices = 0;

  let hasMedals = 0;

  function challengeResult(
    name: String,
    description: String,
    medal: "gold" | "silver" | "no",
  ) {
    let choices = 0,
      up = 0;
    if (medal === "gold") {
      choices += choicePerGold;
      up += upPerGold;
    } else if (medal === "silver") {
      choices += choicePerSilver;
      up += upPerSilver;
    }
    if (medal !== "no") {
      hasMedals++;
    }

    extraChoices += choices;
    upgradePoints += up;
    medals.push(`<div  class="upgrade" data-tooltip="${escapeAttribute(description)}">
                        ${getIcon("icon:" + medal + "_medal")}
                        <p>
                        <strong>${name}</strong><br/>
                        ${
                          up || choices
                            ? t("level_up.challenges.gain", { up, choices })
                            : t("level_up.challenges.no_gain")
                        }
                      
                        </p> 
                    </div>`);
  }

  challengeResult(
    t("level_up.challenges.levelTime.name", {
      value: Math.ceil(gameState.levelTime / 1000),
    }),
    t("level_up.challenges.levelTime.description", {
      silver: levelTimeGood,
      gold: levelTimeBest,
    }),
    (gameState.levelTime < levelTimeBest * 1000 && "gold") ||
      (gameState.levelTime < levelTimeGood * 1000 && "silver") ||
      "no",
  );

  challengeResult(
    t("level_up.challenges.catchRateGood.name", {
      value: Math.floor(catchRate * 100),
      caught: gameState.levelCaughtCoins,
      total: gameState.levelSpawnedCoins,
    }),
    t("level_up.challenges.catchRateGood.description", {
      silver: catchRateGood,
      gold: catchRateBest,
    }),
    (catchRate > catchRateBest / 100 && "gold") ||
      (catchRate > catchRateGood / 100 && "silver") ||
      "no",
  );

  const misses = Math.max(0, gameState.levelMisses - gameState.perks.forgiving);

  challengeResult(
    misses
      ? t("level_up.challenges.levelMisses.name", {
          value: misses,
        })
      : t("level_up.challenges.levelMisses.none"),
    t("level_up.challenges.levelMisses.description", {
      silver: missesGood,
      gold: missesBest,
    }),
    (misses < missesBest && "gold") ||
      (misses < missesGood && "silver") ||
      "no",
  );

  if (hasMedals == 0) {
    medals.length = 0;
  } else if (hasMedals == 1) {
    medals.unshift(t("level_up.challenges.earned_medal", { count: hasMedals }));
  } else {
    medals.unshift(
      t("level_up.challenges.earned_medal_plural", { count: hasMedals }),
    );
  }

  let sorted = getPossibleUpgrades(gameState)
    .map((u) => ({
      ...u,
      score: Math.random() + (gameState.lastOffered[u.id] || 0),
    }))
    .sort((a, b) => a.score - b.score)
    .filter(
      (u) =>
        gameState.perks[u.id] <
        Math.min(u.max + gameState.perks.limitless, u.hardLimit),
    );
  let recommendation = settingsChangeRecommendations();

  let usedCountCache: Record<string, number> = {};
  const usageRate = (u: Upgrade) => {
    if (!(u.id in usedCountCache)) {
      usedCountCache[u.id] =
        getUpgradesPicked(u.id) / (1 + getUpgradesShown(u.id));
    }
    return usedCountCache[u.id];
  };
  while (!gameState.perks.chill) {
    // refresh the list if you pick extra one_more_choice
    const offered = sorted.slice(
      0,
      3 + extraChoices + gameState.perks.one_more_choice,
    );
    offered.forEach((u) => {
      dontOfferTooSoon(gameState, u.id);
    });

    const unlockable = getFirstUnlockable(gameState);
    let unlockRelatedUpgradesOffered = 0;

    const upgradesActions = offered
      .sort((a, b) => {
        return usageRate(b) - usageRate(a);
      })
      .map((u) => {
        let unlockHint = "";
        let className = "";
        if (isOptionOn("level_unlocks_hints")) {
          if (unlockable?.forbidden?.includes(u.id) && !gameState.perks[u.id]) {
            unlockRelatedUpgradesOffered++;
            className += " forbidden";
            unlockHint = t("level_up.forbidden", {
              levelName: unlockable?.l.name || "",
            });
          }
          if (unlockable?.required?.includes(u.id) && !gameState.perks[u.id]) {
            unlockRelatedUpgradesOffered++;
            className += " required";
            unlockHint = t("level_up.required", {
              levelName: unlockable?.l.name || "",
            });
          }
        }
        const disabled =
          gameState.perks[u.id] >= u.max + gameState.perks.limitless;
        if (!disabled) {
          logUpgradeShown(u.id);
        }
        return {
          value: u.id,
          disabled,
          text:
            u.name +
            (gameState.perks[u.id]
              ? upgradeLevelAndMaxDisplay(u, gameState)
              : ""),
          icon: getIcon("icon:" + u.id),

          help: getUpgradeHelp(u, gameState),
          tooltip: unlockHint + getUpgradeTooltip(u, gameState),
          className,
          actionLabel: t(
            gameState.perks[u.id] ? "level_up.upgrade" : "level_up.pick",
          ),
        };
      });

    const choice = await requiredAsyncAlert<
      PerkId | { changeSettings: Record<string, any> }
    >({
      id: "level_up",
      title: t("level_up.title", {
        level: gameState.currentLevel,
        max: renderMaxLevel(gameState),
      }),
      content: [
        t("level_up.upgrade_perks", {
          coins: gameState.levelCaughtCoins,
          count: upgradePoints,
        }),
        ...upgradesActions,
        levelsListHTMl(gameState, gameState.currentLevel),
        // Close to upgrades if particularly relevant
        unlockRelatedUpgradesOffered ? getNearestUnlockHTML(gameState) : "",
        recommendation,
        ...medals,
        pickedUpgradesHTMl(gameState),
        // Otherwise, at the bottom
        unlockRelatedUpgradesOffered ? "" : getNearestUnlockHTML(gameState),
        `<div id="level-recording-container"></div>`,
      ],
    });

    if (applySettingsChangeReco(choice)) {
      recommendation = "";
    } else {
      logUpgradePicked(choice as PerkId);
      upgradePoints--;
      gameState.perks[choice as PerkId]++;
      gameState.runStatistics.upgrades_picked++;
      if (!upgradePoints) {
        return;
      }
    }
  }
}

export function dontOfferTooSoon(gameState: GameState, id: PerkId) {
  gameState.lastOffered[id] = Math.round(Date.now() / 1000);
}

export function applySettingsChangeReco(choice: unknown) {
  if (!choice) return;
  if (typeof choice == "object" && "changeSettings" in choice) {
    const changes = choice.changeSettings as Record<string, any>;
    for (let key in changes) {
      setSettingValue(key, changes[key]);
    }
    toast(t("settings.suggestions.applied"));
    return true;
  }
  return false;
}
export function settingsChangeRecommendations() {
  const { worstFPS, coinsForLag } = getWorstFPSAndReset();
  const maxCoinsSetting = getSettingValue("max_coins", 2);

  if (worstFPS > 55) return "";
  if (coinsForLag > 200 && getCurrentMaxCoins() > 200) {
    // Limit the coins
    const limit = Math.floor(Math.log2(coinsForLag / 200));
    if (limit < maxCoinsSetting) {
      return {
        icon: getIcon("icon:slow"),
        text: t("settings.suggestions.reduce_coins", {
          max: Math.pow(2, limit) * 200,
        }),
        value: {
          changeSettings: { max_coins: limit },
        },
      };
    }
  }

  if (isOptionOn("record"))
    return {
      icon: getIcon("icon:slow"),
      text: t("settings.suggestions.record"),
      value: {
        changeSettings: { "breakout-settings-enable-record": false },
      },
    };

  if (isOptionOn("basic")) return "";

  if (
    isOptionOn("smooth_lighting") ||
    isOptionOn("precise_lighting") ||
    !isOptionOn("probabilistic_lighting") ||
    isOptionOn("contrast")
  )
    return {
      icon: getIcon("icon:slow"),
      text: t("settings.suggestions.simpler_lights"),
      value: {
        changeSettings: {
          "breakout-settings-enable-smooth_lighting": false,
          "breakout-settings-enable-precise_lighting": false,
          "breakout-settings-enable-probabilistic_lighting": true,
          "breakout-settings-enable-contrast": false,
        },
      },
    };

  if (isOptionOn("extra_bright"))
    return {
      icon: getIcon("icon:slow"),
      text: t("settings.suggestions.reduce_brightness"),
      value: {
        changeSettings: { "breakout-settings-enable-extra_bright": false },
      },
    };

  return {
    icon: getIcon("icon:slow"),
    text: t("settings.suggestions.basic_mode"),
    value: {
      changeSettings: { "breakout-settings-enable-basic": true },
    },
  };
}

function getUpgradesPicked(id: PerkId) {
  return getSettingValue("picked_" + id, 0);
}
function getUpgradesShown(id: PerkId) {
  return getSettingValue("showed_" + id, 0);
}

export function logUpgradeShown(id: PerkId) {
  return setSettingValue(
    "showed_" + id,
    getSettingValue("showed_" + id, 0) + 1,
  );
}
export function logUpgradePicked(id: PerkId) {
  return setSettingValue(
    "picked_" + id,
    getSettingValue("picked_" + id, 0) + 1,
  );
}

export function getUpgradeHelp(u: Upgrade, gameState: GameState | undefined) {
  return censorUpgradeInfo(u, 1, u.help(gameState?.perks[u.id] || 1));
}
export function getUpgradeTooltip(
  u: Upgrade,
  gameState: GameState | undefined,
) {
  return censorUpgradeInfo(u, 2, u.fullHelp(gameState?.perks[u.id] || 1));
}

const censorChars = "☰☱☲☳☴☵☶☷ ".split("");
function censorUpgradeInfo(
  { id, threshold }: Upgrade,
  showAfterNPicks: number,
  text: string,
) {
  if (!isOptionOn("censor_perks_before_use")) return text;
  if (threshold && getUpgradesPicked(id) < showAfterNPicks) {
    return text
      .split("")
      .map((char, i) => {
        if (!char.trim()) return char;
        return censorChars[i % censorChars.length];
      })
      .join("");
  }
  return text;
}
