import { PerkId, RunParams, Upgrade } from "./types";
import { allLevelsAndIcons, upgrades } from "./loadGameData";
import { getSettingValue, getTotalScore, setSettingValue } from "./settings";
import { asyncAlert } from "./asyncAlert";
import { miniMarkDown } from "./pure_functions";
import { t } from "./i18n/i18n";
import { confirmRestart, mainGameState, restart } from "./game";
import { getCheckboxIcon, getIcon } from "./levelIcon";
import { getPerkAnimation } from "./gameAnimation";
import { getUpgradeHelp, getUpgradeTooltip } from "./openUpgradesPicker";

export async function openUpgradeDetails(id: PerkId, onClose: () => void) {
  const u = upgrades.find((u) => u.id === id) as Upgrade;
  const { name, help, fullHelp, gift } = u;

  const ts = getTotalScore();

  const free = upgrades
    .filter(({ threshold }) => ts >= threshold)
    .map((u) => u.id);
  const currentIndex = free.indexOf(id);
  const next = free[currentIndex + 1];
  const previous = free[currentIndex - 1];

  const allowedAsStart = getSettingValue("start_with_" + id, gift);
  const allowedInGame = getSettingValue("offer-upgrade-" + id, true);

  const allowDisabling =
    !allowedInGame ||
    upgrades
      .filter((u) => getTotalScore() >= u.threshold)
      .filter((u) => getSettingValue("offer-upgrade-" + u.id, true))?.length >
      15;

  const runParams: RunParams = {
    runType: "normal",
    perks: { [id]: 1 },
    level: allLevelsAndIcons.find((l) => l.name === "icon:" + id),
  };

  const action = await asyncAlert<string>({
    title: `<span class="perk-title">
    <button ${previous ? 'data-resolve-to="previous"' : "disabled"} data-tooltip="${t("unlocks.previous")}">‹ </button>
    <span>${name}</span>
    <button ${next ? 'data-resolve-to="next"' : "disabled"} data-tooltip="${t("unlocks.next")}">  ›</button></span> 
    `,
    content: [
      getPerkAnimation(id),
      {
        text: t("unlocks.start_new_game_with"),
        help: t("unlocks.start_new_game_with_help"),
        value: "use",
        icon: getIcon("icon:new_run"),
      },
      getUpgradeHelp(u, undefined),
      miniMarkDown(getUpgradeTooltip(u, undefined)),
      {
        icon: getCheckboxIcon(allowedAsStart),
        value: "toggle-start-with",
        text: t("unlocks.starting_perk"),
        help: t("unlocks.starting_perk_help"),
      },
      {
        icon: getCheckboxIcon(allowedInGame),
        value: "toggle-offer-upgrade",
        text: t("unlocks.upgrade_choice_perk"),
        help: allowDisabling
          ? t("unlocks.upgrade_choice_perk_help")
          : t("unlocks.upgrade_choice_perk_locked"),
        disabled: !allowDisabling,
      },
      "id:" + id,
    ],
    allowClose: true,
  });
  if (!action) return onClose();

  switch (action) {
    case "use":
      if (await confirmRestart(mainGameState)) {
        restart(runParams);
        return;
      }
      break;
    case "toggle-start-with":
      setSettingValue("start_with_" + id, !allowedAsStart);
      break;
    case "toggle-offer-upgrade":
      setSettingValue("offer-upgrade-" + id, !allowedInGame);
      break;
    case "previous":
      if (previous) {
        openUpgradeDetails(previous, onClose);
        return;
      }
      break;
    case "next":
      if (next) {
        openUpgradeDetails(next, onClose);
        return;
      }
      break;
  }
  return openUpgradeDetails(id, onClose);
}
