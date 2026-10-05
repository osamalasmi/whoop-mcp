// Zet ruwe WHOOP-records om naar compacte objecten met alleen de velden die
// nuttig zijn voor analyse. Scheelt veel tokens in Claude's context.

const round = (n, digits = 1) => (n == null ? null : Math.round(n * 10 ** digits) / 10 ** digits);
const hours = (ms) => (ms == null ? null : round(ms / 3_600_000, 2));
const minutes = (ms) => (ms == null ? null : Math.round(ms / 60_000));
const kcal = (kj) => (kj == null ? null : Math.round(kj / 4.184));

// ISO-tijdstip verschoven naar lokale tijd met WHOOP's timezone_offset (bv. "+02:00").
function local(iso, offset) {
  if (!iso) return null;
  const date = new Date(iso);
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset || "");
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    date.setTime(date.getTime() + sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000);
  }
  return date.toISOString();
}
const localDate = (iso, offset) => local(iso, offset)?.slice(0, 10) ?? null;
const localTime = (iso, offset) => local(iso, offset)?.slice(11, 16) ?? null;

// Records die (nog) niet gescoord zijn hebben geen `score`.
function withScore(record, base, fn) {
  if (record.score_state !== "SCORED" || !record.score) {
    return { ...base, score_state: record.score_state };
  }
  return { ...base, ...fn(record.score) };
}

export function profile(profile, body) {
  return {
    name: [profile.first_name, profile.last_name].filter(Boolean).join(" "),
    height_m: body.height_meter,
    weight_kg: round(body.weight_kilogram),
    max_hr: body.max_heart_rate,
  };
}

// Recovery heeft geen timezone_offset; created_at valt rond het wakker worden.
export const recovery = (r) =>
  withScore(r, { date: r.created_at?.slice(0, 10) ?? null }, (s) => ({
    recovery: s.recovery_score,
    hrv_ms: round(s.hrv_rmssd_milli),
    resting_hr: s.resting_heart_rate,
    spo2: round(s.spo2_percentage),
    skin_temp_c: round(s.skin_temp_celsius, 2),
    calibrating: s.user_calibrating || undefined,
  }));

export const sleep = (r) =>
  withScore(
    r,
    {
      date: localDate(r.end, r.timezone_offset),
      bedtime: localTime(r.start, r.timezone_offset),
      wake: localTime(r.end, r.timezone_offset),
      nap: r.nap || undefined,
    },
    (s) => {
      const st = s.stage_summary || {};
      const need = s.sleep_needed || {};
      return {
        asleep_h: hours(
          (st.total_light_sleep_time_milli || 0) +
            (st.total_slow_wave_sleep_time_milli || 0) +
            (st.total_rem_sleep_time_milli || 0)
        ),
        in_bed_h: hours(st.total_in_bed_time_milli),
        light_h: hours(st.total_light_sleep_time_milli),
        deep_h: hours(st.total_slow_wave_sleep_time_milli),
        rem_h: hours(st.total_rem_sleep_time_milli),
        awake_min: minutes(st.total_awake_time_milli),
        disturbances: st.disturbance_count,
        cycles: st.sleep_cycle_count,
        needed_h: hours(
          (need.baseline_milli || 0) +
            (need.need_from_sleep_debt_milli || 0) +
            (need.need_from_recent_strain_milli || 0) +
            (need.need_from_recent_nap_milli || 0)
        ),
        performance: round(s.sleep_performance_percentage),
        efficiency: round(s.sleep_efficiency_percentage),
        consistency: round(s.sleep_consistency_percentage),
        respiratory_rate: round(s.respiratory_rate),
      };
    }
  );

export const cycle = (r) =>
  withScore(r, { date: localDate(r.start, r.timezone_offset) }, (s) => ({
    strain: round(s.strain),
    kcal: kcal(s.kilojoule),
    avg_hr: s.average_heart_rate,
    max_hr: s.max_heart_rate,
  }));

export const workout = (r) =>
  withScore(
    r,
    {
      date: localDate(r.start, r.timezone_offset),
      start: localTime(r.start, r.timezone_offset),
      sport: r.sport_name,
      duration_min: r.end ? minutes(new Date(r.end) - new Date(r.start)) : null,
    },
    (s) => {
      const z = s.zone_durations || {};
      return {
        strain: round(s.strain),
        kcal: kcal(s.kilojoule),
        avg_hr: s.average_heart_rate,
        max_hr: s.max_heart_rate,
        distance_km: s.distance_meter ? round(s.distance_meter / 1000, 2) : undefined,
        hr_zones_min: [
          z.zone_zero_milli,
          z.zone_one_milli,
          z.zone_two_milli,
          z.zone_three_milli,
          z.zone_four_milli,
          z.zone_five_milli,
        ].map((ms) => minutes(ms) ?? 0),
      };
    }
  );
