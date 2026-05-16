const scoreWeights = {
  pass: 1,
  unknown: 0.5,
  fail: 0
};

export function scoreCriteria(criteria, evidence = []) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error('criteria must contain at least one item');
  }

  const checks = criteria.map((criterion) => {
    const matchedEvidence = evidence.find((item) => item.criterion === criterion);
    const status = matchedEvidence?.status || 'unknown';

    return {
      criterion,
      status,
      evidence: matchedEvidence?.detail || 'No evidence provided.'
    };
  });

  const total = checks.reduce((sum, check) => sum + (scoreWeights[check.status] ?? 0), 0);
  const score = Number((total / checks.length).toFixed(2));
  const criteriaMet = checks.every((check) => check.status === 'pass');
  const unmetChecks = checks.filter((check) => check.status !== 'pass');

  return {
    criteria_met: criteriaMet,
    score,
    checks,
    next_iteration_instruction: criteriaMet
      ? null
      : unmetChecks.map((check) => `Improve criterion: ${check.criterion}`).join('; ')
  };
}

export function shouldStopRun({ criteriaMet, iteration, maxIterations, elapsedMinutes, timeoutMinutes }) {
  if (criteriaMet) {
    return {
      should_stop: true,
      stop_reason: 'criteria_met'
    };
  }

  if (iteration >= maxIterations) {
    return {
      should_stop: true,
      stop_reason: 'max_iterations_reached'
    };
  }

  if (elapsedMinutes >= timeoutMinutes) {
    return {
      should_stop: true,
      stop_reason: 'timed_out'
    };
  }

  return {
    should_stop: false,
    stop_reason: null
  };
}

