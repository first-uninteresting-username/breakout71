import { PerkId, RunParams, Upgrade } from "./types";
import { getSettingValue, getTotalScore, setSettingValue } from "./settings";
import { categories, rawUpgrades } from "./upgrades";
import { currentLevelInfo, getHighScore, sample } from "./game_utils";
import { upgrades } from "./loadGameData";
import { getIcon } from "./levelIcon";
import { t } from "./i18n/i18n";
import { mainGameState, restart } from "./game";
import { asyncAlert } from "./asyncAlert";
import { getUpgradeHelp } from "./openUpgradesPicker";

export function getStartingPerks() {
  const favorite = getSettingValue<string>("starting_perk", "");

  const allowedUpgrades = possibleStartingPerks();
  let upgrade: Upgrade = allowedUpgrades.find(
    (u) => u.id === favorite,
  ) as Upgrade;
  if (!upgrade) {
    upgrade = sample(
      allowedUpgrades.filter(
        (u) => u.threshold <= getTotalScore() && u.id !== "slow_down",
      ),
    ) as Upgrade;
  }

  let perks: RunParams["perks"] = { [upgrade.id]: 1 };
  if (upgrade.requires.length) {
    perks[sample(upgrade.requires) as PerkId] = 1;
  }

  return {
    mainPerkId: upgrade.id as PerkId,
    name: rawUpgrades
      .filter((u) => perks[u.id])
      .map((u) => u.name)
      .join(" + "),
    perks,
  };
}

function possibleStartingPerks() {
  return rawUpgrades
    .filter(
      (upgrade) =>
        upgrade.category === categories.combo || upgrade.id == "slow_down",
    )
    .sort((a, b) => a.threshold - b.threshold) as Upgrade[];
}

export function getStartRunButtons() {
  const favorite = getSettingValue<string>("starting_perk", "");
  const hs = favorite
    ? getSettingValue("starting_" + favorite + "_hs", 0)
    : getHighScore();

  return [
    {
      icon: favorite ? getIcon("icon:" + favorite) : getIcon("icon:new_run"),
      text: favorite
        ? t("main_menu.normal_with_perk", {
            perk: upgrades.find((u) => u.id === favorite)?.name || favorite,
          })
        : t("main_menu.normal"),
      help: hs
        ? t("main_menu.high_score", { score: hs })
        : t("main_menu.normal_help"),
      value: () => {
        restart({
          runType: "normal",
          levelToAvoid: currentLevelInfo(mainGameState).name,
        });
      },
    },
    {
      icon: getIcon("icon:custom_start"),
      text: t("main_menu.starting_perk"),
      help: t("main_menu.starting_perk_help"),
      value: async () => {
        const choice = await asyncAlert({
          title: t("main_menu.starting_perk"),
          content: [
            t("main_menu.starting_perk_intro"),
            {
              icon: getIcon("icon:random"),
              value: "starting_perk:",
              text: t("main_menu.random_perk"),
              help: t("main_menu.random_perk_help"),
            },
            ...possibleStartingPerks().map((u) => {
              const hs = getSettingValue("starting_" + u.id + "_hs", 0);
              return {
                icon: getIcon("icon:" + u.id),
                value: "starting_perk:" + u.id,
                text: u.name,
                disabled: u.threshold > getTotalScore(),
                help:
                  (hs && t("main_menu.high_score", { score: hs })) ||
                  (getTotalScore() < u.threshold &&
                    t("unlocks.minTotalScore", { score: u.threshold })) ||
                  getUpgradeHelp(u, undefined),
              };
            }),
          ],
        });
        if (choice) {
          const [action, value] = choice.split(":");
          setSettingValue("starting_perk", value);
          restart({
            runType: "normal",
            levelToAvoid: currentLevelInfo(mainGameState).name,
          });
        }
      },
    },
  ];
}
