// ============================================================
// engine.js — Plan Generation Engine
// ProReady
// ============================================================

const SPORTS_DATA = {
  football: {
    name: 'Football',
    icon: '⚽',
    color: '#16a34a',
    warmup: ['5 min light jog', 'High knees × 30s', 'Lateral shuffles × 30s', 'Hip circles × 10 each', 'Sprint accelerations × 3'],
    sessions: {
      far:       ['Tactical drills & shooting', 'Fitness conditioning run', 'Set-piece training', 'Speed & agility work'],
      mid:       ['Small-sided games (5v5)', 'Technical passing circuits', 'Positional play review', 'Explosive short sprints'],
      near:      ['Light passing & movement', 'Set-piece walkthrough', 'Mental visualization session'],
      dayBefore: ['Gentle stretch & light jog (15 min)', 'Tactical team briefing', 'Equipment check', 'Early dinner & rest'],
      matchDay:  ['Dynamic warm-up (10 min)', 'Activation drills', 'Short passing sequences', 'Pre-match mental routine'],
    },
    meals: {
      far:       { morning: 'Oatmeal + banana + boiled eggs', afternoon: 'Grilled chicken rice bowl + salad', evening: 'Pasta with lean mince & vegetables', night: 'Warm milk, avoid heavy snacks' },
      mid:       { morning: 'Whole-grain toast + peanut butter + fruit', afternoon: 'Brown rice + chicken + steamed veg', evening: 'Grilled fish + sweet potato + spinach', night: 'Yogurt or light protein shake' },
      near:      { morning: 'Eggs + wholegrain toast + orange juice', afternoon: 'Pasta + grilled chicken (carb load begins)', evening: 'Rice + dal + vegetables (light)', night: 'Banana + warm milk' },
      dayBefore: { morning: 'Oatmeal + honey + nuts', afternoon: 'Pasta/rice + chicken (carb loading)', evening: 'Light meal: toast + soup', night: 'Banana + water, sleep by 10 PM' },
      matchDay:  { morning: 'Toast + eggs + fruit juice (3h before)', afternoon: 'Banana or energy bar (1h before match)', evening: 'Post-match: protein shake + carbs', night: 'Full recovery meal: rice + chicken + veg' },
    },
    recovery: {
      far: 'Foam roll quads & hamstrings. Ice any sore spots. 10 min static stretch.',
      mid: 'Cold shower post-training. Protein within 30 min. Stretch hip flexors.',
      near: 'Ice bath (10 min) or cold shower. Foam roll. Elevate legs.',
      dayBefore: 'Full body stretch 20 min. Mental visualization. No screens after 9 PM.',
      matchDay: 'Post-match: ice bath, compression. Hydrate 1L within 1h.',
    }
  },
  cricket: {
    name: 'Cricket',
    icon: '🏏',
    color: '#ca8a04',
    warmup: ['5 min jog', 'Shoulder & wrist rotations', 'Hip flexor stretches', 'Catching warmup × 20', 'Short sprint bursts × 3'],
    sessions: {
      far:       ['Batting net session (60 min)', 'Bowling practice (30 min)', 'Fielding & catching drills', 'Fitness conditioning'],
      mid:       ['Focused batting net (45 min)', 'Bowling spell simulation', 'Catching + ground fielding', 'Video analysis of opponents'],
      near:      ['Light net session (30 min)', 'Mental visualization drills', 'Opponent strategy review'],
      dayBefore: ['Light stretching only (20 min)', 'Equipment check & kit prep', 'Watch match footage', 'Early dinner & rest'],
      matchDay:  ['Light warm-up jog (5 min)', 'Catching & throwing warmup', 'Pre-match mental routine', 'Team talk & strategy'],
    },
    meals: {
      far:       { morning: 'Oatmeal + nuts + banana', afternoon: 'Rice + dal + sabzi (balanced meal)', evening: 'Grilled chicken + roti + salad', night: 'Warm milk + light snack' },
      mid:       { morning: 'Eggs + whole grain toast + fruit', afternoon: 'Brown rice + lentils + vegetables', evening: 'Fish curry (light) + rice + spinach', night: 'Yogurt + banana' },
      near:      { morning: 'Upma or oats + boiled eggs', afternoon: 'Pasta or rice + chicken (carb load)', evening: 'Roti + dal + light sabzi', night: 'Banana + warm milk' },
      dayBefore: { morning: 'Oats + honey + nuts', afternoon: 'Rice + chicken biryani (carb-heavy)', evening: 'Light khichdi or soup', night: 'Milk + banana, sleep by 10 PM' },
      matchDay:  { morning: 'Idli/toast + egg (3h before)', afternoon: 'Banana or energy bar (1h before)', evening: 'Post-match recovery shake + meal', night: 'Full recovery: rice + protein + salad' },
    },
    recovery: {
      far: 'Stretch shoulders, wrists, and back. 10 min cool-down jog. Hydrate well.',
      mid: 'Cold shower post-session. Protein shake. Forearm & shoulder stretch.',
      near: 'Ice shoulders if needed. Foam roll back & legs. Full body stretch.',
      dayBefore: 'Rest completely. Mental rehearsal. Prepare kit. Sleep 8+ hours.',
      matchDay: 'Post-match: hydrate, eat, rest. Ice any strained muscles.',
    }
  }
};

// ── Readiness Score ─────────────────────────────────────────
function calculateReadinessScore(sleepHours, soreness, intensity, daysToMatch) {
  const sleep = parseFloat(sleepHours) || 7;

  const sleepScore = Math.min(sleep / 8, 1) * 100;
  const fatigueScore = soreness === 'low' ? 100 : soreness === 'medium' ? 62 : 28;

  // Intensity scoring is contextual — close to match, low is better
  let intensityScore;
  if (daysToMatch >= 5)      intensityScore = intensity === 'high' ? 85 : intensity === 'medium' ? 95 : 65;
  else if (daysToMatch >= 3) intensityScore = intensity === 'medium' ? 90 : intensity === 'low' ? 75 : 45;
  else if (daysToMatch >= 2) intensityScore = intensity === 'low' ? 90 : intensity === 'medium' ? 65 : 20;
  else                       intensityScore = intensity === 'low' ? 98 : intensity === 'medium' ? 55 : 15;

  const total = Math.round(sleepScore * 0.35 + fatigueScore * 0.30 + intensityScore * 0.35);
  return {
    total: Math.min(100, Math.max(0, total)),
    sleepScore: Math.round(sleepScore),
    fatigueScore: Math.round(fatigueScore),
    intensityScore: Math.round(intensityScore),
  };
}

// ── Alerts ──────────────────────────────────────────────────
function generateAlerts(sleepHours, soreness, intensity, daysToMatch) {
  const sleep = parseFloat(sleepHours) || 7;
  const alerts = [];

  if (sleep < 6) {
    alerts.push({ type: 'danger', icon: '😴', title: 'Critical Sleep Deficit', message: `Only ${sleep}h sleep detected. Athletes need 7–9h for peak performance. This will impact reaction time and stamina.` });
  } else if (sleep < 7) {
    alerts.push({ type: 'warning', icon: '⚠️', title: 'Low Sleep Hours', message: `${sleep}h sleep is below the recommended 7–9h. Try sleeping 30 min earlier tonight.` });
  }

  if (intensity === 'high' && daysToMatch <= 2) {
    alerts.push({ type: 'danger', icon: '🔥', title: 'Overtraining Risk', message: `High intensity training ${daysToMatch} day(s) before match risks muscle fatigue and injury. Switch to rest/recovery mode immediately.` });
  } else if (intensity === 'high' && daysToMatch === 3) {
    alerts.push({ type: 'warning', icon: '💪', title: 'Intensity Too High', message: 'With 3 days left, moderate intensity is the optimal choice. Reduce load to preserve match-day energy.' });
  }

  if (soreness === 'high') {
    alerts.push({ type: 'warning', icon: '🩹', title: 'High Muscle Soreness', message: 'Prioritize foam rolling, ice therapy, and protein-rich meals today to accelerate recovery.' });
  }

  if (daysToMatch === 0) {
    alerts.push({ type: 'info', icon: '🏆', title: "It's Match Day!", message: "Trust your preparation. Stay hydrated, eat light, and warm up properly. You've got this!" });
  }

  return alerts;
}

// ── Insights from history ────────────────────────────────────
function generateInsights(currentInputs, history) {
  const insights = [];
  const sleep = parseFloat(currentInputs.sleepHours) || 7;

  if (!history || history.length === 0) {
    insights.push({ icon: '🚀', text: 'First preparation tracked! Your data will be used to generate performance patterns after this match.', type: 'info' });
    insights.push({ icon: '💡', text: 'Research shows: 8h sleep in the 3 days before a match improves sprint speed by up to 10%.', type: 'tip' });
    return insights;
  }

  const last = history[history.length - 1];
  const lastSleep = parseFloat(last.inputs?.sleepHours) || 7;

  if (sleep > lastSleep + 0.4) {
    insights.push({ icon: '📈', text: `Sleep improved — ${sleep}h vs ${lastSleep}h last prep. Better sleep means faster recovery and sharper focus.`, type: 'positive' });
  } else if (sleep < lastSleep - 0.4) {
    insights.push({ icon: '📉', text: `Sleep is down compared to last prep (${lastSleep}h). This could impact your performance. Prioritize rest.`, type: 'warning' });
  }

  if (last.report) {
    const r = last.report.rating;
    if (r >= 7) {
      insights.push({ icon: '🏆', text: `You rated your last match ${r}/10. Your preparation strategy is effective — maintain consistency.`, type: 'positive' });
    } else if (r <= 5) {
      insights.push({ icon: '🔍', text: `Last match: ${r}/10. Look at what was different and adjust your sleep, recovery, and training intensity.`, type: 'warning' });
    }
  }

  if (currentInputs.soreness === 'high' && last.inputs?.soreness === 'low') {
    insights.push({ icon: '⚠️', text: 'Higher soreness than last prep. Increase recovery activities: foam rolling, cold therapy, and protein intake.', type: 'warning' });
  }

  // Comparison summary
  const lastScore = last.readiness_score || 0;
  const phrase = lastScore < 70 ? 'You are better prepared than your last match!' : 'Preparation is on par with your last match.';
  insights.push({ icon: '📊', text: phrase, type: 'positive' });

  return insights;
}

// ── Day schedule builder ─────────────────────────────────────
function buildDaySchedule(sport, daysToMatch, scheduleHours, sleepHours, soreness, matchTime) {
  const sd = SPORTS_DATA[sport];
  const phase =
    daysToMatch >= 5 ? 'far' :
    daysToMatch >= 3 ? 'mid' :
    daysToMatch === 2 ? 'near' :
    daysToMatch === 1 ? 'dayBefore' : 'matchDay';

  const sess = sd.sessions[phase];
  const meal = sd.meals[phase];
  const rec  = sd.recovery[phase];

  const intensityPct =
    daysToMatch >= 5 ? 70 :
    daysToMatch >= 3 ? 50 :
    daysToMatch === 2 ? 30 :
    daysToMatch === 1 ? 10 : 20;

  const intensityLabel =
    intensityPct >= 65 ? 'Moderate–High' :
    intensityPct >= 45 ? 'Moderate' :
    intensityPct >= 25 ? 'Light' :
    intensityPct >= 15 ? 'Activation' : 'Full Rest';

  const hasCommitment = scheduleHours && scheduleHours !== 'none';
  const matchHour = matchTime ? parseInt(matchTime.split(':')[0], 10) : 15; // default 3 PM
  const isMatchSlot = (slot) => {
    if (daysToMatch !== 0) return false;
    if (slot === 'morning' && matchHour < 12) return true;
    if (slot === 'afternoon' && matchHour >= 12 && matchHour < 17) return true;
    if (slot === 'evening' && matchHour >= 17) return true;
    return false;
  };
  const isPostMatch = (slot) => {
    if (daysToMatch !== 0) return false;
    if (slot === 'afternoon' && matchHour < 12) return true;
    if (slot === 'evening' && matchHour < 17) return true;
    if (slot === 'night') return true;
    return false;
  };

  const getMatchNotes = (slot) => {
    if (isMatchSlot(slot)) return 'Stay focused. Execute your game plan. Trust your preparation.';
    if (isPostMatch(slot)) return 'Ice bath or cold shower. Protein meal. Celebrate or reflect.';
    return `Warm-up: ${sd.warmup.join(' → ')}`; // Pre-match
  };

  return {
    morning: {
      activity: daysToMatch === 0 ? (isMatchSlot('morning') ? `⚔️ MATCH TIME (${matchTime})` : `${sd.icon} Pre-match warm-up & activation`) : `Training: ${sess[0]}`,
      food:  meal.morning,
      notes: daysToMatch === 0 ? getMatchNotes('morning') : `Intensity: ${intensityLabel} (${intensityPct}%). ${sd.warmup.slice(0,3).join(', ')}`,
      intensity: daysToMatch === 0 ? (isMatchSlot('morning') ? 100 : 20) : intensityPct,
      tags: daysToMatch === 0 ? (isMatchSlot('morning') ? ['MATCH', '⚔️'] : ['Pre-Match', 'Activation']) : [sess[0].split(' ')[0], intensityLabel]
    },
    afternoon: {
      activity: daysToMatch === 0 ? (isMatchSlot('afternoon') ? `⚔️ MATCH TIME (${matchTime})` : isPostMatch('afternoon') ? 'Post-match recovery' : 'Light pre-match activation') : (hasCommitment ? `📚 College / Work (${scheduleHours})` : `${sess[1] || 'Recovery session'}`),
      food: meal.afternoon,
      notes: daysToMatch === 0 ? getMatchNotes('afternoon') : (hasCommitment ? 'Stay hydrated. Light snack.' : 'Post-session: protein shake. Hydrate.'),
      intensity: daysToMatch === 0 ? (isMatchSlot('afternoon') ? 100 : isPostMatch('afternoon') ? 0 : 20) : (hasCommitment ? 0 : Math.round(intensityPct * 0.6)),
      tags: daysToMatch === 0 ? (isMatchSlot('afternoon') ? ['MATCH', '⚔️'] : isPostMatch('afternoon') ? ['Recovery'] : ['Prep']) : hasCommitment ? ['College', 'Work'] : ['Recovery']
    },
    evening: {
      activity: daysToMatch === 0 ? (isMatchSlot('evening') ? `⚔️ MATCH TIME (${matchTime})` : isPostMatch('evening') ? 'Post-match recovery protocol' : 'Pre-match prep') : (hasCommitment ? `Evening training: ${sess[0]}` : daysToMatch === 1 ? 'Visualization' : `Skill work: ${sess[2] || 'Technique'}`),
      food: meal.evening,
      notes: daysToMatch === 0 ? getMatchNotes('evening') : (daysToMatch === 1 ? 'Pack your kit.' : rec),
      intensity: daysToMatch === 0 ? (isMatchSlot('evening') ? 100 : 0) : (hasCommitment ? intensityPct : Math.round(intensityPct * 0.75)),
      tags: daysToMatch === 0 ? (isMatchSlot('evening') ? ['MATCH', '⚔️'] : ['Recovery']) : ['Skill', 'Stretching']
    },
    night: {
      activity: daysToMatch === 0 && isMatchSlot('night') ? `⚔️ MATCH TIME (${matchTime})` : `Sleep target: ${Math.max(8, parseFloat(sleepHours))}h — Lights out by 10 PM`,
      food: meal.night,
      notes: daysToMatch === 0 && isMatchSlot('night') ? getMatchNotes('night') : `${soreness === 'high' ? 'Ice pack on sore muscles. ' : ''}Body repairs during deep sleep.`,
      intensity: daysToMatch === 0 && isMatchSlot('night') ? 100 : 0,
      tags: daysToMatch === 0 && isMatchSlot('night') ? ['MATCH'] : ['Sleep', 'Recovery']
    }
  };
}

// ── Imminent match plan (<2 hours) ───────────────────────────
function buildImminentPlan(sport, minutesLeft) {
  const sd = SPORTS_DATA[sport];
  const timeStr = minutesLeft < 60 ? `${minutesLeft} min` : `${Math.floor(minutesLeft/60)}h ${minutesLeft%60}m`;
  return [{
    day_label: '⚡ MATCH IMMINENT',
    date: new Date().toISOString().split('T')[0],
    daysToMatch: 0,
    isMatchDay: true,
    isImminent: true,
    timeStr,
    schedule: {
      morning: {
        activity: `Immediate pre-match protocol — ${timeStr} remaining`,
        food: 'Small banana or energy bar (quick-release carbs)',
        notes: `DO: Stay calm, hydrate 500ml water NOW. DON'T: Eat heavy food or stress about preparation.`,
        intensity: 20,
        tags: ['URGENT', 'Pre-Match', 'NOW']
      },
      afternoon: {
        activity: `Dynamic warm-up: ${sd.warmup.join(' → ')}`,
        food: 'Sip isotonic drink / water steadily',
        notes: '10 min maximum warm-up. Focus on major muscles and joint mobility.',
        intensity: 25,
        tags: ['Warm-Up', 'Activation', 'Quick']
      },
      evening: {
        activity: 'Mental focus: 4-7-8 breathing + visualization',
        food: 'Last sip of water 15 min before',
        notes: 'Breathe in 4s, hold 7s, out 8s — repeat 4 times. Visualize your best performance.',
        intensity: 10,
        tags: ['Mental', 'Focus', 'Breathing']
      },
      night: {
        activity: `⚔️ MATCH TIME — Give everything!`,
        food: 'Post-match: recovery meal + 1L water',
        notes: 'Trust your training. Execute your game plan. You are prepared.',
        intensity: 100,
        tags: ['MATCH', '⚔️', 'Execute']
      }
    }
  }];
}

// ── Main export ──────────────────────────────────────────────
function generatePlan(inputs) {
  const { sport, matchDate, sleepHours, soreness, intensity, scheduleHours, history, matchTime } = inputs;

  const now = new Date();

  // Parse matchDate as local noon to avoid UTC timezone offset issues
  // e.g. "2026-05-10" parsed as UTC midnight is actually May 9 evening in IST
  const [mY, mM, mD] = matchDate.split('-').map(Number);
  const match = new Date(mY, mM - 1, mD, 12, 0, 0); // local noon

  const diffMs   = match - now;
  const diffMin  = Math.round(diffMs / 60000);
  const diffDays = Math.ceil(diffMs / 86400000);

  let days = [];
  let specialMessage = null;

  if (diffMs <= 0) {
    specialMessage = { type: 'past', message: 'This match date has already passed. Head to the Report tab to record your performance!' };
  } else if (diffMin < 120) {
    // Less than 2 hours — emergency plan
    days = buildImminentPlan(sport, diffMin);
  } else {
    const planDays = Math.min(diffDays - 1, 6); // leave room for match day
    for (let i = 0; i < planDays; i++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() + i);
      const daysToMatch = diffDays - i;

      const dayLabel = daysToMatch === 1 ? 'Day -1 (Pre-Match Eve)' : `Day -${daysToMatch}`;

      days.push({
        day_label: dayLabel,
        date: dayDate.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }),
        daysToMatch,
        isMatchDay: false,
        schedule: buildDaySchedule(sport, daysToMatch, scheduleHours, sleepHours, soreness, matchTime)
      });
    }

    // Always append the actual Match Day entry
    const matchDayDate = new Date(match);
    days.push({
      day_label: '🏆 Match Day',
      date: matchDayDate.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }),
      daysToMatch: 0,
      isMatchDay: true,
      schedule: buildDaySchedule(sport, 0, scheduleHours, sleepHours, soreness, matchTime)
    });
  }

  const readiness = calculateReadinessScore(sleepHours, soreness, intensity, diffDays);
  const alerts    = generateAlerts(sleepHours, soreness, intensity, diffDays);
  const insights  = generateInsights(inputs, history || []);

  return {
    id: Date.now().toString(),
    generatedAt: new Date().toISOString(),
    sport,
    matchDate,
    inputs,
    readiness_score: readiness.total,
    sub_scores: readiness,
    insights,
    alerts,
    days,
    specialMessage,
    sportData: SPORTS_DATA[sport]
  };
}
