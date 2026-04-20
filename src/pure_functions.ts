import { Ball, GameState } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function ballTransparency(ball: Ball, gameState: GameState) {
  if (!gameState.perks.transparency) return 0;
  return clamp(
    gameState.perks.transparency *
      (1 - (ball.y / gameState.gameZoneHeight) * 1.2),
    0,
    1,
  );
}

export function coinsBoostedCombo(gameState: GameState) {
  let boost =
    1 +
    gameState.perks.sturdy_bricks / 2 +
    gameState.perks.smaller_puck / 2 +
    gameState.perks.transparency / 2;

  if (gameState.perks.minefield) {
    gameState.bricks.forEach((brick) => {
      if (brick === "black") {
        boost += 0.1 * gameState.perks.minefield;
      }
    });
  }
  return Math.ceil(Math.max(gameState.combo, gameState.lastCombo) * boost);
}

export function miniMarkDown(md: string) {
  let html: { tagName: string; text: string }[] = [];
  let lastNode: { tagName: string; text: string } | null = null;

  md.split("\n").forEach((line) => {
    const titlePrefix = line.match(/^#+ /)?.[0];

    if (titlePrefix) {
      if (lastNode) html.push(lastNode);
      lastNode = {
        tagName: "h" + (titlePrefix.length - 1),
        text: line.slice(titlePrefix.length),
      };
    } else if (line.startsWith("- ")) {
      if (lastNode?.tagName !== "ul") {
        if (lastNode) html.push(lastNode);
        lastNode = { tagName: "ul", text: "" };
      }
      lastNode.text += "<li>" + line.slice(2) + "</li>";
    } else if (!line.trim()) {
      if (lastNode) html.push(lastNode);
      lastNode = null;
    } else {
      if (lastNode?.tagName !== "p") {
        if (lastNode) html.push(lastNode);
        lastNode = { tagName: "p", text: "" };
      }
      lastNode.text += line + " ";
    }
  });
  if (lastNode) {
    html.push(lastNode);
  }
  return html
    .map(
      (h) =>
        "<" +
        h.tagName +
        ">" +
        h.text.replace(
          /\bhttps?:\/\/[^\s<>]+/gi,
          (a) => `<a href="${a}" target="_blank">${a}</a>`,
        ) +
        "</" +
        h.tagName +
        ">",
    )
    .join("\n");
}

export function extractLinkFromText(md: string) {
  return md.match(/\bhttps?:\/\/[^\s<>]+/gi)?.[0];
}

export function firstWhere<Input, Output>(
  arr: Input[],
  mapper: (item: Input, index: number) => Output | undefined,
): Output | undefined {
  for (let i = 0; i < arr.length; i++) {
    const result = mapper(arr[i], i);
    if (typeof result !== "undefined") return result;
  }
}

export const levelTimeBest = 25,
  levelTimeGood = 45,
  catchRateBest = 98,
  catchRateGood = 90,
  missesBest = 1,
  missesGood = 6,
  choicePerSilver = 1,
  choicePerGold = 3,
  upPerSilver = 1,
  upPerGold = 1;

export const MAX_LEVEL_SIZE = 21;
export const MIN_LEVEL_SIZE = 2;

export function automaticBackgroundColor(bricks: string[]) {
  return bricks.filter((b) => b === "g").length >
    bricks.filter((b) => b !== "_").length * 0.05
    ? "#115988"
    : "#000000";
}

export function levelCodeToRawLevel(code: string) {
  let [name, credit] = code.match(/\[([^\]]+)]/gi) || ["", ""];

  let bricks = code.split(name)[1].split(credit)[0].replace(/\s/gi, "");
  name = name.slice(1, -1);
  credit = credit.slice(1, -1);
  name ||= "Imported on " + new Date().toISOString().slice(0, 10);
  credit ||= "";
  const size = Math.sqrt(bricks.length);
  if (
    Math.floor(size) === size &&
    size >= MIN_LEVEL_SIZE &&
    size <= MAX_LEVEL_SIZE
  )
    return {
      color: automaticBackgroundColor(bricks.split("")),
      size,
      bricks,
      name,
      credit,
    };
  console.warn("Invalid level", {
    code,
    name,
    credit,
    bricks,
    size,
  });
}

export function comboKeepingRate(level: number) {
  return clamp(1 - (1 / (1 + level)) * 1.5, 0, 1);
}

export function base_combo_from_stronger_foundation(perkLevel: number) {
  let base = 1;
  for (let i = 0; i < perkLevel; i++) {
    base += 4 + i * 2;
  }
  return base;
}
