import { GameState } from "./types";
import { upgrades } from "./loadGameData";
import { schedulGameSound } from "./gameStateMutators";
import { toast } from "./toast";
import { t } from "./i18n/i18n";
import { getTotalScore, setSettingValue } from "./settings";
import { getIcon } from "./levelIcon";

export function addToTotalScore(gameState: GameState, points: number) {
  if (gameState.startParams.runType !== "normal") return;
  const pastScore = getTotalScore();
  const newScore = pastScore + points;
  setSettingValue("breakout_71_total_score", newScore);
  // Check unlocked upgrades
  upgrades.forEach((u) => {
    if (u.threshold > pastScore && u.threshold <= newScore) {
      schedulGameSound(gameState, "colorChange", 0, 1);
      toast(
        getIcon("icon:" + u.id) +
          "<strong>" +
          t("gameOver.unlocked_perk") +
          "</strong>",
      );
    }
  });
}
