import { getHistory } from "./gameOver";
import { appVersion, upgrades } from "./loadGameData";
import { t } from "./i18n/i18n";
import { asyncAlert } from "./asyncAlert";
import { getSettingValue, setSettingValue } from "./settings";
import { getCheckboxIcon, getIcon } from "./levelIcon";
import { RunHistoryItem, Upgrade } from "./types";

export function runHistoryViewerMenuEntry() {
  const history = getHistory();

  return [
    history.length > 10 && {
      icon: getIcon("icon:history"),
      text: t("history.title"),
      help: t("history.help", { count: history.length }),
      value: viewHistory,
    },
    history.length > 50 && {
      icon: getIcon("icon:matrix"),
      text: t("history.matrix.title"),
      help: t("history.matrix.help"),
      value: viewHighScoreMatrix,
    },
  ];
}

async function viewHistory() {
  const history = getHistory();
  let sort = 0;
  let sortDir = -1;
  let columns = [
    {
      label: t("history.columns.started"),
      field: (r) => r.started,
      render(v) {
        return new Date(v).toISOString().slice(0, 10);
      },
    },
    {
      label: t("history.columns.score"),
      field: (r) => r.score,
    },
    ...upgrades.map((u) => ({
      label: getIcon("icon:" + u.id),
      tooltip: u.name,
      field: (r) => r.perks?.[u.id] || 0,
      render(v) {
        if (!v) return "-";
        return v;
      },
    })),
  ];
  while (true) {
    const hasCurrentVersion = history.find((r) => r.appVersion === appVersion);
    const hasPastVersion = history.find((r) => r.appVersion !== appVersion);

    const header = columns
      .map(
        (c, ci) =>
          `<th data-tooltip="${c.tooltip || ""}" data-resolve-to="sort:${ci}">${c.label}</th>`,
      )
      .join("");
    const toString = (v) => v.toString();
    const tbody = history
      .filter(
        (r) =>
          !hasCurrentVersion ||
          r.appVersion === appVersion ||
          getSettingValue("show_old_versions_in_stats", false),
      )
      .sort(
        (a, b) => sortDir * (columns[sort].field(a) - columns[sort].field(b)),
      )
      .map(
        (h) =>
          "<tr>" +
          columns
            .map((c) => {
              const value = c.field(h) ?? 0;
              const render = c.render || toString;
              return "<td>" + render(value) + "</td>";
            })
            .join("") +
          "</tr>",
      )
      .join("");

    const result = await asyncAlert({
      id: "history",
      title: t("history.title"),
      className: "history",
      content: [
        `
<table>
<thead><tr>${header}</tr></thead>
<tbody>${tbody}</tbody>
</table>
                    `,
        hasPastVersion &&
          hasCurrentVersion && {
            icon: getCheckboxIcon(
              getSettingValue("show_old_versions_in_stats", false),
            ),
            value: "toggle",
            text: t("history.include_past_versions"),
          },
      ],
    });
    if (!result) return;
    if (result.startsWith("sort:")) {
      const newSort = parseInt(result.split(":")[1]);
      if (newSort == sort) {
        sortDir *= -1;
      } else {
        sortDir = -1;
        sort = newSort;
      }
    }
    if (result === "toggle") {
      setSettingValue(
        "show_old_versions_in_stats",
        !getSettingValue("show_old_versions_in_stats", false),
      );
    }
  }
}

async function viewHighScoreMatrix() {
  const history = getHistory();
  const hasCurrentVersion = history.find((r) => r.appVersion === appVersion);
  const hasPastVersion = history.find((r) => r.appVersion !== appVersion);
  const filtered = history
    .filter(
      (r) =>
        !hasCurrentVersion ||
        r.appVersion === appVersion ||
        getSettingValue("show_old_versions_in_stats", false),
    )
    .filter((r) => r.perks) as RunHistoryItem[];

  const upgradeIcon = (u: Upgrade) =>
    `<th data-tooltip="${u.name}">${getIcon("icon:" + u.id, 16)}</th>`;

  const bestScoreWhere = (
    check: (v: RunHistoryItem) => boolean,
    tooltip: (n: number) => string,
    className: string,
  ) => {
    const scores = filtered
      .filter((item) => check(item))
      .map((item) => item.score);
    if (!scores.length)
      return `<td data-tooltip="${t("history.matrix.no_runs")}" style="background: hsl(247deg 100% 30%)" class="empty ${className}"></td>`;
    const max = Math.max(...scores);
    let log = Math.round(Math.log(max));
    const letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const scaleEnd = letter.length - 1;
    if (log > scaleEnd) log = scaleEnd;

    return `<td data-tooltip="${tooltip(max)}" style="background: hsl(${Math.floor(247 - (log / scaleEnd) * 247)}deg 100% 30%)" 
    class="${className}">${letter.slice(log, log + 1)}</td>`;
  };

  const table = `<table class="score_matrix">
<thead>
<tr>
<th></th>
${upgrades.map(upgradeIcon).join("")}
</tr>
</thead>
<tbody>
${upgrades
  .map((u1, index1) => {
    return `<tr>${upgradeIcon(u1)}${upgrades
      .map((u2, index2) => {
        if (index2 < index1) {
          return bestScoreWhere(
            (run) => run.perks[u1.id] > 0 && run.perks[u2.id] > 0,
            (score) =>
              t("history.matrix.with_a_and_b", {
                perkA: u1.name,
                perkB: u2.name,
                score,
              }),
            "combined",
          );
        } else if (index1 === index2) {
          return bestScoreWhere(
            (run) => run.perks[u1.id] > 0,
            (score) =>
              t("history.matrix.with_a", {
                perkA: u1.name,
                score,
              }),
            "single",
          );
        } else {
          return bestScoreWhere(
            (run) => !run.perks[u1.id] && !run.perks[u2.id],
            (score) =>
              t("history.matrix.without_a_and_b", {
                perkA: u1.name,
                perkB: u2.name,
                score,
              }),
            "excluded",
          );
        }
      })
      .join("")}</tr>`;
  })
  .join("")}
</tbody>
</table>`;

  const result = await asyncAlert({
    id: "matrix",
    title: t("history.matrix.title"),
    className: "score_matrix_popup",
    content: [
      table,
      hasPastVersion &&
        hasCurrentVersion && {
          icon: getCheckboxIcon(
            getSettingValue("show_old_versions_in_stats", false),
          ),
          value: "toggle",
          text: t("history.include_past_versions"),
        },
    ],
  });
  if (result === "toggle") {
    setSettingValue(
      "show_old_versions_in_stats",
      !getSettingValue("show_old_versions_in_stats", false),
    );
  }
}
