import { allLevelsAndIcons, upgrades } from "./loadGameData";
import { t } from "./i18n/i18n";
import { asyncAlert } from "./asyncAlert";
import { miniMarkDown } from "./pure_functions";
import { getIcon } from "./levelIcon";

export function helpMenuEntry() {
  return {
    icon: getIcon("icon:help"),
    text: t("help.title"),
    help: t("help.help"),
    async value() {
      await asyncAlert({
        id: "help",
        title: t("help.title"),
        allowClose: true,
        content: [
          miniMarkDown(t("help.content")),
          miniMarkDown(t("help.upgrades")),
          ...upgrades.map(
            (u) => `
<div class="upgrade used">
            ${getIcon("icon:" + u.id)}
            <p>
                <strong>${u.name}</strong><br/>
          ${u.help(1)}
          </p> 
        </div>
        
          ${miniMarkDown(u.fullHelp(1))}
`,
          ),
          "<h2>" + t("help.levels") + "</h2>",
          ...allLevelsAndIcons
            .filter((l) => l.credit?.trim())
            .map(
              (l) => `
<div class="upgrade used">
            ${getIcon(l.name)}
            <div>
            <p>
                <strong>${l.name}</strong> 
          </p> 
          ${miniMarkDown(l.credit || "")}
</div>
             
        </div>`,
            ),
        ],
      });
    },
  };
}
