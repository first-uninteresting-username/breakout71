import { t } from "./i18n/i18n";

import { OptionDef, OptionId } from "./types";
import { getSettingValue, setSettingValue } from "./settings";

import { getHighScore, hoursSpentPlaying } from "./game_utils";

export const options = {
  sound: {
    default: true,
    name: t("settings.sounds"),
    help: t("settings.sounds_help"),
  },
  menu_sound: {
    default: true,
    name: t("settings.menu_sound"),
    help: t("settings.menu_sound_help"),
  },
  "mobile-mode": {
    default:
      window.innerHeight > window.innerWidth ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0,
    name: t("settings.mobile"),
    help: t("settings.mobile_help"),
  },
  notch_space: {
    default: false,
    name: t("settings.notch_space"),
    help: t("settings.notch_space_help"),
  },
  enable_autosave: {
    default: true,
    name: t("settings.enable_autosave"),
    help: t("settings.enable_autosave_help"),
  },
  touch_delayed_start: {
    default: true,
    name: t("settings.touch_delayed_start"),
    help: t("settings.touch_delayed_start_help"),
  },
  basic: {
    default: false,
    name: t("settings.basic"),
    help: t("settings.basic_help"),
  },
  match_pixel_ratio: {
    default: false,
    name: t("settings.match_pixel_ratio"),
    help: t("settings.match_pixel_ratio_help"),
  },
  colorful_coins: {
    default: false,
    name: t("settings.colorful_coins"),
    help: t("settings.colorful_coins_help"),
  },
  extra_bright: {
    default: true,
    name: t("settings.extra_bright"),
    help: t("settings.extra_bright_help"),
  },
  smooth_lighting: {
    default: true,
    name: t("settings.smooth_lighting"),
    help: t("settings.smooth_lighting_help"),
  },
  precise_lighting: {
    default: true,
    name: t("settings.precise_lighting"),
    help: t("settings.precise_lighting_help"),
  },
  probabilistic_lighting: {
    default: false,
    name: t("settings.probabilistic_lighting"),
    help: t("settings.probabilistic_lighting_help"),
  },
  contrast: {
    default: false,
    name: t("settings.contrast"),
    help: t("settings.contrast_help"),
  },
  show_fps: {
    default: false,
    name: t("settings.show_fps"),
    help: t("settings.show_fps_help"),
  },
  show_stats: {
    default: false,
    name: t("settings.show_stats"),
    help: t("settings.show_stats_help"),
  },
  show_puck_rails: {
    default: true,
    name: t("settings.show_puck_rails"),
    help: t("settings.show_puck_rails_help"),
  },
  particles: {
    default: true,
    name: t("settings.particles"),
    help: t("settings.particles_help"),
  },
  pointerLock: {
    default: false,
    name: t("settings.pointer_lock"),
    help: t("settings.pointer_lock_help"),
  },
  kid: {
    default: false,
    name: t("settings.kid"),
    help: t("settings.kid_help"),
  },
  // Could not get the sharing to work without loading androidx and all the modern android things so for now I'll just disable sharing in the android app
  record: {
    default: false,
    name: t("settings.record"),
    help: t("settings.record_help"),
  },
  fullscreen: {
    default: false,
    name: t("settings.fullscreen"),
    help: t("settings.fullscreen_help"),
  },
  donation_reminder: {
    default: hoursSpentPlaying() > 5,
    name: t("settings.donation_reminder"),
    help: t("settings.donation_reminder_help"),
  },
  level_unlocks_hints: {
    default: getHighScore() > 1000,
    name: t("settings.level_unlocks_hints"),
    help: t("settings.level_unlocks_hints_help"),
  },
} as const satisfies { [k: string]: OptionDef };

export function isOptionOn(key: OptionId) {
  return getSettingValue(
    "breakout-settings-enable-" + key,
    options[key]?.default,
  );
}

export function toggleOption(key: OptionId) {
  setSettingValue("breakout-settings-enable-" + key, !isOptionOn(key));
}

export function getPixelRatio() {
  return isOptionOn("match_pixel_ratio") ? window.devicePixelRatio || 1 : 1;
}
