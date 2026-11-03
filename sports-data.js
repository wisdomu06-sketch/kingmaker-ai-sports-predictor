// Kingmaker AI Sports Predictor
// Free football and basketball data connection
// Source: SportScore API

(() => {
  const API = "https://sportscore.com/api/widget/matches/";
  const section = document.createElement("section");

  section.id = "live-sports-data";

  section.innerHTML = `
    <style>
      #live-sports-data {
        max-width: 900px;
        margin: 24px auto;
        padding: 20px;
        color: #eaf2ff;
        font-family: Arial, sans-serif;
      }

      #live-sports-data .sports-card {
        background: #111f31;
        border: 1px solid #293c55;
        border-radius: 14px;
        padding: 18px;
        margin-bottom: 18px;
      }

      #live-sports-data h2,
      #live-sports-data h3 {
        color: #49d5e5;
      }

      #live-sports-data button {
        background: #1687f8;
        color: white;
        border: 0;
        border-radius: 8px;
        padding: 12px 18px;
        font-weight: bold;
        cursor: pointer;
      }

      #live-sports-data .match {
        padding: 12px 0;
        border-bottom: 1px solid #293c55;
      }

      #live-sports-data .muted {
        color: #a7b7cc;
        font-size: 14px;
      }

      #live-sports-data .error {
        color: #ffca80;
      }
    </style>

    <div class="sports-card">
      <h2>LIVE SPORTS DATA</h2>
      <p>Testing the connection to real football and basketball data.</p>
      <button id="sports-refresh">Load sports data</button>
      <p id="sports-status" aria-live="polite">Waiting to connect...</p>
    </div>

    <div class="sports-card">
      <h3>⚽ Football</h3>
      <div id="football-results">Not loaded yet.</div>
    </div>

    <div class="sports-card">
      <h3>🏀 Basketball</h3>
      <div id="basketball-results">Not loaded yet.</div>
    </div>

    <p class="muted">
      Sports data provided by
      <a href="https://sportscore.com/" rel="dofollow"
         style="color:#49d5e5">SportScore</a>.
      Match availability depends on the data source.
    </p>
  `;

  document.body.appendChild(section);

  function getText(object, paths) {
    for (const path of paths) {
      const value = path.split(".").reduce(
        (current, key) => current?.[key],
        object
      );

      if (value !== undefined && value !== null && value !== "") {
        return typeof value === "object"
          ? value.name || value.displayName || ""
          : String(value);
      }
    }

    return "";
  }

  function renderMatches(container, matches) {
    if (!Array.isArray(matches) || matches.length === 0) {
      container.textContent = "No matches were returned by the data source.";
      return;
    }

    container.replaceChildren();

    matches.forEach(match => {
      const home = getText(match, [
        "homeTeam.name",
        "home_team.name",
        "home.name",
        "homeTeam",
        "home_team",
        "home_team_name",
        "homeTeamName",
        "team1.name"
      ]);

      const away = getText(match, [
        "awayTeam.name",
        "away_team.name",
        "away.name",
        "awayTeam",
        "away_team",
        "away_team_name",
        "awayTeamName",
        "team2.name"
      ]);

      const competition = getText(match, [
        "competition.name",
        "league.name",
        "tournament.name",
        "competition",
        "league",
        "tournament"
      ]);

      const status = getText(match, [
        "status.long",
        "status.name",
        "status",
        "match_status"
      ]);

      const score = getText(match, [
        "score",
        "scores.fulltime",
        "fulltime_score"
      ]);

      const row = document.createElement("div");
      row.className = "match";

      const title = document.createElement("strong");
      title.textContent =
        (home || "Home team") + " vs " + (away || "Away team");

      const details = document.createElement("div");
      details.className = "muted";
      details.textContent = [
        competition,
        status,
        score ? "Score: " + score : ""
      ].filter(Boolean).join(" • ");

      row.append(title, details);
      container.appendChild(row);
    });
  }

  async function loadSport(sport, containerId) {
    const container = document.getElementById(containerId);

    try {
      const response = await fetch(
        API + "?sport=" + encodeURIComponent(sport) + "&limit=10",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("The data source returned HTTP " + response.status);
      }

      const data = await response.json();
      const matches = Array.isArray(data)
        ? data
        : data.matches || data.data || data.events || [];

      renderMatches(container, matches);

      return matches.length;
    } catch (error) {
      container.textContent =
        "Could not load data. " + error.message;

      container.classList.add("error");
      throw error;
    }
  }

  async function loadAllSports() {
    const status = document.getElementById("sports-status");
    const button = document.getElementById("sports-refresh");

    button.disabled = true;
    status.textContent = "Connecting to the sports data source...";

    const results = await Promise.allSettled([
      loadSport("football", "football-results"),
      loadSport("basketball", "basketball-results")
    ]);

    const successful = results.filter(
      result => result.status === "fulfilled"
    ).length;

    if (successful === 2) {
      status.textContent =
        "Both data requests completed. Check the match lists below.";
    } else if (successful === 1) {
      status.textContent =
        "One sport responded. The other data request failed.";
    } else {
      status.textContent =
        "Connection failed. Check your internet connection or try again later.";
    }

    button.disabled = false;
  }

  document.getElementById("sports-refresh")
    .addEventListener("click", loadAllSports);

  loadAllSports();
})();
