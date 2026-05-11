import { transformRawLevel } from "./loadGameData";
import { t } from "./i18n/i18n";
import { getSettingValue, getTotalScore, setSettingValue } from "./settings";
import { asyncAlert } from "./asyncAlert";
import { Palette, RawLevel } from "./types";
import { getIcon, levelIconHTML } from "./levelIcon";

import _palette from "./data/palette.json";
import { mainGameState, restart } from "./game";
import { describeLevel } from "./game_utils";
import {
  automaticBackgroundColor,
  levelCodeToRawLevel,
  MAX_LEVEL_SIZE,
  MIN_LEVEL_SIZE,
} from "./pure_functions";
import { toast } from "./toast";

const palette = _palette as Palette;

export function levelEditorMenuEntry() {
  const min = 10000;
  const disabled = getTotalScore() < min;
  return {
    icon: getIcon("icon:editor"),
    text: t("editor.title"),
    disabled,
    help: disabled ? t("editor.locked", { min }) : t("editor.help"),
    async value() {
      openLevelEditorLevelsList().then();
    },
  };
}

async function openLevelEditorLevelsList() {
  const rawList = getSettingValue("custom_levels", []) as RawLevel[];
  const customLevels = rawList.map(transformRawLevel);

  let choice = await asyncAlert({
    id: "editor",
    title: t("editor.title"),
    content: [
      {
        text: t("editor.new_level"),
        icon: getIcon("icon:editor"),
        value() {
          rawList.push({
            color: "",
            size: 6,
            bricks: "____________________________________",
            name: "custom level" + (rawList.length + 1),
            credit: "",
          });
          setSettingValue("custom_levels", rawList);
          editRawLevel(rawList.length - 1);
        },
      },
      ...customLevels.map((l, li) => ({
        text: l.name,
        icon: levelIconHTML(l.bricks, l.size),
        value() {
          editRawLevel(li);
        },
        help: l.credit || describeLevel(l),
      })),

      {
        text: t("editor.import"),
        help: t("editor.import_instruction"),
        value() {
          const code = prompt(t("editor.import_instruction"))?.trim();
          if (code) {
            const lvl = levelCodeToRawLevel(code);
            if (lvl) {
              rawList.push(lvl);
              setSettingValue("custom_levels", rawList);
            }
          }
          openLevelEditorLevelsList();
        },
      },
    ],
  });
  if (typeof choice == "function") choice();
}

export async function editRawLevel(nth: number, color = "") {
  let rawList = getSettingValue("custom_levels", []) as RawLevel[];
  const level = rawList[nth];
  const bricks = level.bricks.split("");
  color ||= bricks.find((i) => i !== "_") || "W";

  let grid = "";
  for (let y = 0; y < level.size; y++) {
    grid += '<div style="background: ' + (level.color || "black") + ';">';
    for (let x = 0; x < level.size; x++) {
      const c = bricks[y * level.size + x];
      grid += `<span data-resolve-to="paint_brick:${x}:${y}" style="background: ${palette[c]}">${c == "B" ? "💣" : ""}</span>`;
    }
    grid += "</div>";
  }

  const levelColors = new Set(bricks);
  levelColors.delete("_");
  levelColors.delete("B");

  let colorList =
    '<div class="palette">' +
    Object.entries(palette)
      .filter(([key, value]) => key !== "_")
      .filter(
        ([key, value]) =>
          levelColors.size < 5 || levelColors.has(key) || key === "B",
      )
      .map(
        ([key, value]) =>
          `<span data-resolve-to="set_color:${key}" data-selected="${key == color}" style="background: ${value}">${key == "B" ? "💣" : ""}</span>`,
      )
      .join("") +
    "</div>";

  const next = rawList[nth + 1];
  const previous = rawList[nth - 1];

  const clicked = await asyncAlert<string | null>({
    title: `<span class="perk-title">
    <button ${previous ? 'data-resolve-to="previous"' : "disabled"} data-tooltip="${t("unlocks.previous")}">‹ </button>
    <span>${level.name}</span>
    <button ${next ? 'data-resolve-to="next"' : "disabled"} data-tooltip="${t("unlocks.next")}">  ›</button></span> 
    `,
    content: [
      t("editor.editing.color"),
      colorList,
      t("editor.editing.help"),
      `<div class="gridEdit" style="--grid-size:${level.size};">${grid}</div>`,

      {
        icon: getIcon("icon:new_run"),
        text: t("editor.editing.play"),
        value: "play",
      },
      {
        text: t("editor.editing.rename"),
        value: "rename",
        help: level.name,
      },
      {
        text: t("editor.editing.credit"),
        value: "credit",
        help: level.credit,
      },
      {
        text: t("editor.editing.delete"),
        value: "delete",
      },
      {
        text: t("editor.editing.copy"),
        value: "copy",
        help: t("editor.editing.copy_help"),
      },
      {
        text: t("editor.editing.show_code"),
        value: "show_code",
        help: t("editor.editing.show_code_help"),
      },
      {
        text: t("editor.editing.bigger"),
        value: "size:+1",
        disabled: level.size >= MAX_LEVEL_SIZE,
      },
      {
        text: t("editor.editing.smaller"),
        value: "size:-1",
        disabled: level.size <= MIN_LEVEL_SIZE,
      },
      {
        text: t("editor.editing.left"),
        value: "move:-1:0",
      },
      {
        text: t("editor.editing.right"),
        value: "move:1:0",
      },
      {
        text: t("editor.editing.up"),
        value: "move:0:-1",
      },
      {
        text: t("editor.editing.down"),
        value: "move:0:1",
      },
    ],
  });
  if (!clicked) return;
  if (typeof clicked === "string") {
    const [action, a, b] = clicked.split(":");
    if (action == "paint_brick") {
      const x = parseInt(a),
        y = parseInt(b);
      bricks[y * level.size + x] =
        bricks[y * level.size + x] === color ? "_" : color;
      level.bricks = bricks.join("");
    }
    if (action == "set_color") {
      color = a;
    }
    if (action == "size") {
      const newSize = level.size + parseInt(a);
      const newBricks = [];
      for (let y = 0; y < newSize; y++) {
        for (let x = 0; x < newSize; x++) {
          newBricks.push(
            (x < level.size && y < level.size && bricks[y * level.size + x]) ||
              "_",
          );
        }
      }
      level.size = newSize;
      level.bricks = newBricks.join("");
    }
    if (action == "move") {
      const dx = parseInt(a),
        dy = parseInt(b);
      const newBricks = [];
      for (let y = 0; y < level.size; y++) {
        for (let x = 0; x < level.size; x++) {
          const tx = x - dx;
          const ty = y - dy;
          if (tx < 0 || tx >= level.size || ty < 0 || ty >= level.size) {
            newBricks.push("_");
          } else {
            newBricks.push(bricks[ty * level.size + tx]);
          }
        }
      }
      level.bricks = newBricks.join("");
    }
    if (action === "play") {
      restart({
        runType: "level_editor_trial",
        level: transformRawLevel(level),
        isEditorTrialRun: nth,
        perks: {
          base_combo: 7,
        },
      });
      return;
    }
    if (action === "copy" || action === "show_code") {
      let text =
        "```\n[" +
        (level.name || "unnamed level")?.replace(/\[|\]/gi, " ") +
        "]";
      bricks.forEach((b, bi) => {
        if (!(bi % level.size)) text += "\n";
        text += b;
      });
      text +=
        "\n[" +
        (level.credit?.replace(/\[|\]/gi, " ") || "Missing credits") +
        "]\n```";

      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(text);
          toast(t("editor.editing.copied"));
        } catch (e) {
          if ("message" in e) {
            toast(e.message);
          }
        }
      } else {
        await asyncAlert({
          id: "show_code",
          title: t("editor.editing.show_code"),
          content: [
            `
          <pre>${text}</pre>
          `,
          ],
        });
      }
      // return
    }
    if (action === "rename") {
      const name = prompt(t("editor.editing.rename_prompt"), level.name);
      if (name) {
        level.name = name;
      }
    }
    if (action === "credit") {
      const credit = prompt(
        t("editor.editing.credit_prompt"),
        level.credit || "",
      );
      if (credit !== "null") {
        level.credit = credit || "";
      }
    }
    if (action === "delete") {
      const confirm = await asyncAlert({
        id: "editing_delete_confirm",
        title: t("editor.editing.delete_confirm"),

        content: [
          `<div class="full-width-icon">${levelIconHTML(transformRawLevel(level).bricks, level.size, 350)}</div>`,
          {
            text: t("editor.editing.delete_yes"),
            value: true,
          },
          {
            text: t("editor.editing.delete_no"),
            value: false,
          },
        ],
      });
      if (confirm) {
        rawList = rawList.filter((l, li) => li !== nth);
        setSettingValue("custom_levels", rawList);
        openLevelEditorLevelsList();
        return;
      }
    }

    if (action == "next" && next) return editRawLevel(rawList.indexOf(next));
    if (action == "previous" && previous)
      return editRawLevel(rawList.indexOf(previous));
  }

  level.color = automaticBackgroundColor(bricks);

  setSettingValue("custom_levels", rawList);
  editRawLevel(nth, color);
}

export function closeEditorTrialRun() {
  editRawLevel(mainGameState.startParams.isEditorTrialRun || 0);
  restart({
    runType: "normal",
  });
}
