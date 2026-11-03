// KINGMAKER AI - FOOTBALL HISTORICAL DATA
// Source: SportScore API
// Timezone: Africa/Lagos

window.KingmakerFootballData = (() => {

  const API_V2 = "https://sportscore.com/api/v2/fixtures/";
const CACHE_PREFIX = "kingmaker_football_history_v2_";
const CACHE_HOURS = 12;
const HISTORY_DAYS = 30;

  function getDate(daysAgo) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    return date.toISOString().slice(0, 10);
  }

  function validMatch(match) {
    return (
      match &&
      match.home &&
      match.away &&
      match.status === "finished" &&
      Number.isFinite(Number(match.home_score)) &&
      Number.isFinite(Number(match.away_score))
    );
  }

  async function fetchDate(date) {
    const cacheKey = CACHE_PREFIX + date;

    try {
      const cached = JSON.parse(
        localStorage.getItem(cacheKey) || "null"
      );

      if (
        cached &&
        Date.now() - cached.savedAt < CACHE_HOURS * 3600000
      ) {
        return cached.matches;
      }
    } catch (error) {
      // Ignore invalid cached data.
    }

    const url = new URL(API_V2);

    url.searchParams.set("sport", "football");
    url.searchParams.set("date", date);
    url.searchParams.set("status", "finished");
    url.searchParams.set("limit", "200");

    const response = await fetch(url.toString(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not retrieve results for " + date);
    }

    const data = await response.json();

    const rawMatches = Array.isArray(data)
  ? data
  : Array.isArray(data.matches)
  ? data.matches
  : Array.isArray(data.data)
  ? data.data
  : Array.isArray(data.fixtures)
  ? data.fixtures
  : Array.isArray(data.events)
  ? data.events
  : [];

const matches = rawMatches.filter(validMatch);

    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          savedAt: Date.now(),
          matches
        })
      );
    } catch (error) {
      // Continue if browser storage is unavailable.
    }

    return matches;
  }

  async function getHistoricalFixtures(days = HISTORY_DAYS) {

    const dates = Array.from(
      { length: days },
      (_, index) => getDate(index + 1)
    );

    const results = [];

    // Retrieve four dates at a time to avoid excessive requests.
    for (let i = 0; i < dates.length; i += 4) {

      const batch = dates.slice(i, i + 4);

      const responses = await Promise.allSettled(
        batch.map(date => fetchDate(date))
      );

      responses.forEach(result => {
        if (result.status === "fulfilled") {
          results.push(...result.value);
        }
      });
    }

    // Remove duplicate matches.
    const unique = new Map();

    results.forEach(match => {
      const key = match.slug || match.id;

      if (key) {
        unique.set(key, match);
      }
    });

    return Array.from(unique.values());
  }

  function calculateTeamStats(teamName, fixtures, limit = 10) {

    const normalize = name =>
      String(name || "").trim().toLowerCase();

    const team = normalize(teamName);

    const matches = fixtures
      .filter(match =>
        normalize(match.home) === team ||
        normalize(match.away) === team
      )
      .sort((a, b) =>
        new Date(b.time) - new Date(a.time)
      )
      .slice(0, limit);

    if (matches.length === 0) {
      return null;
    }

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    let homeMatches = 0;
    let homeGoalsScored = 0;
    let homeGoalsConceded = 0;

    let awayMatches = 0;
    let awayGoalsScored = 0;
    let awayGoalsConceded = 0;

    const form = [];

    matches.forEach(match => {

      const isHome = normalize(match.home) === team;

      const scored = Number(
        isHome ? match.home_score : match.away_score
      );

      const conceded = Number(
        isHome ? match.away_score : match.home_score
      );

      goalsScored += scored;
      goalsConceded += conceded;

      if (scored > conceded) {
        wins++;
        form.push("W");
      } else if (scored === conceded) {
        draws++;
        form.push("D");
      } else {
        losses++;
        form.push("L");
      }

      if (isHome) {
        homeMatches++;
        homeGoalsScored += scored;
        homeGoalsConceded += conceded;
      } else {
        awayMatches++;
        awayGoalsScored += scored;
        awayGoalsConceded += conceded;
      }
    });

    const count = matches.length;

    return {
      team: teamName,
      matchesPlayed: count,

      wins,
      draws,
      losses,

      form,

      goalsScored,
      goalsConceded,

      averageGoalsScored: goalsScored / count,
      averageGoalsConceded: goalsConceded / count,

      home: {
        matches: homeMatches,
        averageGoalsScored:
          homeMatches ? homeGoalsScored / homeMatches : null,
        averageGoalsConceded:
          homeMatches ? homeGoalsConceded / homeMatches : null
      },

      away: {
        matches: awayMatches,
        averageGoalsScored:
          awayMatches ? awayGoalsScored / awayMatches : null,
        averageGoalsConceded:
          awayMatches ? awayGoalsConceded / awayMatches : null
      },

      dataQuality:
        count >= 10 ? "GOOD" :
        count >= 5 ? "LIMITED" : "INSUFFICIENT"
    };
  }

  return {
    getHistoricalFixtures,
    calculateTeamStats
  };

})();
