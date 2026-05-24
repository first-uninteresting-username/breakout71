import { PerkId, Upgrade } from "./types";
import { upgrades } from "./loadGameData";
import { getTotalScore } from "./settings";
import { asyncAlert } from "./asyncAlert";
import { miniMarkDown } from "./pure_functions";
import { t } from "./i18n/i18n";
import { getPerkAnimation } from "./gameAnimation";
import { getUpgradeHelp, getUpgradeTooltip } from "./openUpgradesPicker";

export async function openUpgradeDetails(id: PerkId, onClose: () => void) {
  const u = upgrades.find((u) => u.id === id) as Upgrade;
  const { name } = u;

  const ts = getTotalScore();

  const free = upgrades
    .filter(({ threshold }) => ts >= threshold)
    .map((u) => u.id);
  const currentIndex = free.indexOf(id);
  const next = free[currentIndex + 1];
  const previous = free[currentIndex - 1];

  const required = upgrades
    .filter((r) => u.requires.includes(r.id) && r.id !== u.id)
    .map((u) => u.name);

  const action = await asyncAlert<string>({
    title: `<span class="perk-title">
    <button ${previous ? 'data-resolve-to="previous"' : "disabled"} data-tooltip="${t("unlocks.previous")}">‹ </button>
    <span>${name}</span>
    <button ${next ? 'data-resolve-to="next"' : "disabled"} data-tooltip="${t("unlocks.next")}">  ›</button></span> 
    `,
    content: [
      getPerkAnimation(id),
      getUpgradeHelp(u, undefined),
      miniMarkDown(getUpgradeTooltip(u, undefined)),
      (required.length === 1 && t("unlocks.requires_one", { required })) ||
        (required.length &&
          t("unlocks.requires", { required: required.join(", ") })) ||
        "",
      "id:" + id,
    ],
    allowClose: true,
  });
  if (!action) return onClose();

  switch (action) {
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
