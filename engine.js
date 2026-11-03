/* KINGMAKER AI SPORTS PREDICTOR
   Statistical Prediction Engine v1.0
   Timezone: Africa/Lagos
*/

const KingmakerEngine = (() => {

  const CONFIG = {
    targetOdds: 3.00,
    selectionsRequired: 3,
    minimumProbability: 0.65,
    minimumValue: 0.03
  };

  // Calculate average
  function average(values) {
    if (!values || !values.length) return 0;
    return values.reduce((a,b) => a+b,0) / values.length;
  }

  // Calculate recent form
  function calculateForm(results) {
    if (!results || !results.length) return 0;

    const points = results.map(result => {
      if (result === "W") return 3;
      if (result === "D") return 1;
      return 0;
    });

    return average(points) / 3;
  }

  // Football expected goals estimate
  function footballGoals(team, opponent) {
  const attack = Number.isFinite(Number(team.averageGoalsScored))
    ? Number(team.averageGoalsScored)
    : average(team.goalsScored || []);

  const defence = Number.isFinite(Number(opponent.averageGoalsConceded))
    ? Number(opponent.averageGoalsConceded)
    : average(opponent.goalsConceded || []);

  if (
    !Number.isFinite(attack) ||
    !Number.isFinite(defence) ||
    attack < 0 ||
    defence < 0
  ) {
    throw new Error("Insufficient historical team statistics.");
  }

  return Math.min(
    4,
    (Math.max(0.2, attack) + Math.max(0.2, defence)) / 2
  );
  }
    return Math.min(4, (attack + defence) / 2);
  }

  // Poisson probability
  function poisson(lambda, goals) {
    let factorial = 1;

    for (let i = 1; i <= goals; i++) {
      factorial *= i;
    }

    return Math.exp(-lambda) * Math.pow(lambda, goals) / factorial;
  }

  // Football outcome probabilities
  function footballPrediction(home, away) {

    const homeGoals = footballGoals(home, away) * 1.10;
    const awayGoals = footballGoals(away, home);

    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;

    for (let h = 0; h <= 10; h++) {
      for (let a = 0; a <= 10; a++) {

        const probability =
          poisson(homeGoals, h) *
          poisson(awayGoals, a);

        if (h > a) homeWin += probability;
        else if (h === a) draw += probability;
        else awayWin += probability;
      }
    }

    const total = homeWin + draw + awayWin;

    return {
      homeWin: homeWin / total,
      draw: draw / total,
      awayWin: awayWin / total
    };
  }

  // Basketball strength comparison
  function basketballPrediction(home, away) {

    const homeAttack = average(home.pointsScored);
    const awayAttack = average(away.pointsScored);

    const homeDefence = average(home.pointsConceded);
    const awayDefence = average(away.pointsConceded);

    const homeRating =
      homeAttack - homeDefence +
      (homeAttack + awayDefence) / 2 + 3;

    const awayRating =
      awayAttack - awayDefence +
      (awayAttack + homeDefence) / 2;

    const difference = homeRating - awayRating;

    const homeProbability =
      1 / (1 + Math.exp(-difference / 12));

    return {
      homeWin: homeProbability,
      awayWin: 1 - homeProbability
    };
  }

  // Convert odds into implied probability
  function impliedProbability(odds) {
    if (!Number.isFinite(odds) || odds <= 1) return 0;
    return 1 / odds;
  }

  // Evaluate betting opportunity
  function evaluateSelection(probability, odds) {

    const implied = impliedProbability(odds);

    return {
      probability,
      odds,
      impliedProbability: implied,
      expectedValue: (probability * odds) - 1,
      valueEdge: probability - implied,
      qualifies:
        probability >= CONFIG.minimumProbability &&
        probability - implied >= CONFIG.minimumValue
    };
  }

  // Build three-selection accumulator
  function buildAccumulator(selections) {

    const qualified = selections
      .filter(s => s.qualifies && s.odds > 1)
      .sort((a,b) => b.expectedValue - a.expectedValue);

    if (qualified.length < CONFIG.selectionsRequired) {
      return {
        status: "INSUFFICIENT_QUALIFIED_SELECTIONS",
        message: "Not enough selections meet the qualification rules.",
        selections: qualified
      };
    }

    const chosen = qualified.slice(0, CONFIG.selectionsRequired);

    const combinedOdds = chosen.reduce(
      (total, selection) => total * selection.odds, 1
    );

    const independentProbability = chosen.reduce(
      (total, selection) => total * selection.probability, 1
    );

    return {
      status: combinedOdds >= CONFIG.targetOdds
        ? "QUALIFIED"
        : "BELOW_TARGET",

      selections: chosen,
      combinedOdds,
      estimatedAccumulatorProbability: independentProbability,
      targetOdds: CONFIG.targetOdds,
      warning: "Accumulator probability assumes independence. Correlation must be assessed separately."
    };
  }

  return {
    calculateForm,
    footballPrediction,
    basketballPrediction,
    evaluateSelection,
    buildAccumulator,
    config: CONFIG
  };

})();

if (typeof window !== "undefined") {
  window.KingmakerEngine = KingmakerEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = KingmakerEngine;
}
