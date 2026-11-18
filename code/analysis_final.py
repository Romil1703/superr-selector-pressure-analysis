"""SupeRR Selector S2 R1 - Pressure performance analysis.
Usage: python3 analysis_final.py <data_dir> <out_dir>"""
import sys, os, numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
D, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

b = pd.read_csv(f"{D}/ball_by_ball.csv", low_memory=False)
m = pd.read_csv(f"{D}/matches.csv"); c = pd.read_csv(f"{D}/competitions.csv")
m = m.merge(c[["comp_id", "match_format", "comp_name"]], on="comp_id")
# --- cleaning
m = m[~m.result.str.contains("No Result|Abandon|Tie|tied|Super", case=False, na=True) & m.win_team_id.notna()]
b = b[b.innings.isin([1, 2]) & b.match_id.isin(m.match_id)].copy()
b = b.sort_values(["match_id", "innings", "innings_ball_num"]).reset_index(drop=True)
b["et"] = b.extras_type.fillna("None")
b["legal"] = ~b.et.isin(["wide", "Overstep"])
b["tot"] = b.runs + b.extras1_runs + b.extras_2_runs
b["wk"] = b.is_wicket.astype(str).str.lower().eq("true").astype(int)
b["four"] = b.is_four.astype(str).str.lower().eq("true"); b["six"] = b.is_six.astype(str).str.lower().eq("true")
g = b.groupby(["match_id", "innings"])
b["runs_before"] = g.tot.cumsum() - b.tot
b["wk_before"] = g.wk.cumsum() - b.wk
b["legal_before"] = g.legal.cumsum() - b.legal

mi = m.set_index("match_id")
inn1 = b[b.innings == 1].groupby("match_id").tot.sum()
def total_balls(r):
    v = r.second_inn_revised_overs
    if pd.isna(v): return 120
    return v if v > 20 else v * 6
mi["balls2"] = mi.apply(total_balls, axis=1)
mi["target"] = mi.revised_target.fillna(inn1.reindex(mi.index) + 1)
mi["balls1"] = mi.first_inn_revised_overs.apply(lambda v: 120 if pd.isna(v) else (v if v > 20 else v * 6))
b["target"] = b.match_id.map(mi.target); b["balls_tot"] = np.where(b.innings == 1, b.match_id.map(mi.balls1), b.match_id.map(mi.balls2))
b["won"] = (b.batting_team_id == b.match_id.map(mi.win_team_id)).astype(int)
b["knock"] = b.match_id.map(mi.knock_out).fillna(0)
# IPL vs everything else. The pack also labels two A-team "Emerging/Rising Stars" Asia Cups as "T20";
# those are grouped with T20Is, not with the IPL.
b["fmt"] = np.where(b.match_id.map(mi.comp_name).str.startswith("IPL"), "IPL", "T20I")

def feats(inn, runs, wk, legal, target, btot):
    bl = np.maximum(btot - legal, 0)
    need = target - runs
    crr = runs / np.maximum(legal, 1) * 6
    rrr = np.where(inn == 2, need / np.maximum(bl, 1) * 6, 0)
    proj = np.where(inn == 1, runs + crr / 6 * bl * (10 - wk) / 10, 0)
    return np.column_stack([inn, runs, wk, bl, np.where(inn == 2, need, 0), crr, rrr, proj, 10 - wk])

X = feats(b.innings.values, b.runs_before.values, b.wk_before.values, b.legal_before.values, b.target.fillna(0).values, b.balls_tot.values)
# --- win probability model (trained match-grouped; out-of-fold to avoid leakage)
mids = b.match_id.unique(); fold = dict(zip(mids, rng.integers(0, 5, len(mids))))
f = b.match_id.map(fold).values
def fit(Xt, yt):
    return HistGradientBoostingClassifier(max_iter=250, learning_rate=0.05, max_leaf_nodes=24, min_samples_leaf=200, random_state=0).fit(Xt, yt)
models = [fit(X[f != k], b.won.values[f != k]) for k in range(5)]
def wp(Xq, folds):
    out = np.empty(len(Xq))
    for k in range(5):
        s = folds == k
        if s.any(): out[s] = models[k].predict_proba(Xq[s])[:, 1]
    return out
b["wp_pre"] = wp(X, f)
from sklearn.metrics import roc_auc_score, brier_score_loss
print("WP AUC", roc_auc_score(b.won, b.wp_pre), "Brier", brier_score_loss(b.won, b.wp_pre))

# post-ball WP: next ball's pre state within innings; innings end -> next innings start / result
b["wp_post"] = g.wp_pre.shift(-1)
last = b.wp_post.isna()
# end of innings 1 -> WP at start of innings 2 (from batting-first team's view)
first2 = b[b.innings == 2].groupby("match_id").wp_pre.first()
b.loc[last & (b.innings == 1), "wp_post"] = 1 - b.loc[last & (b.innings == 1), "match_id"].map(first2)
b.loc[b.wp_post.isna(), "wp_post"] = b.loc[b.wp_post.isna(), "won"]
b["wpa"] = b.wp_post - b.wp_pre

# --- leverage index: spread of WP over plausible outcomes of this ball
outs = [(0, 0, .37), (1, 0, .36), (2, 0, .07), (4, 0, .11), (6, 0, .05), (0, 1, .04)]
vals = []
for r, w, p in outs:
    Xo = feats(b.innings.values, b.runs_before.values + r, b.wk_before.values + w, b.legal_before.values + 1, b.target.fillna(0).values, b.balls_tot.values)
    v = wp(Xo, f)
    # terminal states
    if True:
        inn2 = b.innings.values == 2
        v = np.where(inn2 & (b.runs_before.values + r >= b.target.values), 1, v)
        v = np.where(inn2 & ((b.wk_before.values + w >= 10) | (b.legal_before.values + 1 >= b.balls_tot.values)) & (b.runs_before.values + r < b.target.values), 0, v)
    vals.append(v)
V = np.array(vals); P = np.array([o[2] for o in outs])[:, None]
mean = (V * P).sum(0); sd = np.sqrt(((V - mean) ** 2 * P).sum(0))
b["LI"] = np.clip(sd / sd.mean(), 0.2, None) * np.where(b.knock == 1, 1.2, 1.0)
thr = b.LI.quantile(0.75)
b["pressure"] = b.LI >= thr
print("pressure threshold LI", thr, "share", b.pressure.mean())

# --- opposition strength weight
FULL = {"Afghanistan","Australia","Bangladesh","England","India","Ireland","New Zealand","Pakistan","South Africa","Sri Lanka","West Indies","Zimbabwe"}
tn = pd.read_csv(f"{D}/teams.csv").drop_duplicates("team_id").set_index("team_id").team_name
ipl_ids = set(b.loc[b.fmt == "IPL", "batting_team_id"])
def w_of(tid): return 1.0 if (tn.get(tid, "") in FULL or tid in ipl_ids) else 0.6
wmap = {t: w_of(t) for t in pd.unique(np.r_[b.batting_team_id, b.bowling_team_id])}
b["w_bat"] = b.bowling_team_id.map(wmap); b["w_bowl"] = b.batting_team_id.map(wmap)

# --- attribution
bat_ball = ~b.et.isin(["wide"])                  # balls faced (no-balls count as faced, like scorecards)
b["bat_wpa"] = np.where(b.et.isin(["byes", "legbyes", "wide", "Penalty"]) & (b.wk == 0), 0, b.wpa)
# non-striker run out: move credit
ns_out = (b.wk == 1) & (b.dismissed_player_id == b.non_striker_id)
b["bat_id"] = np.where(ns_out, b.non_striker_id, b.striker_id)
runout = b.dismissal_type.fillna("").str.contains("Run", case=False) | b.dismissal_type.fillna("").str.contains("Retire|Obst", case=False)
b["bowl_wpa"] = np.where(b.et.isin(["byes", "legbyes", "Penalty"]) | runout, 0, -b.wpa)
b["bowl_wk"] = ((b.wk == 1) & ~runout).astype(int)
b["bowl_runs"] = np.where(b.et.isin(["byes", "legbyes"]), b.runs, b.tot)




# ================= FINAL RATING: predicted pressure performance =================
import json
W_P, K_P, K_N = 0.5, 300, 200            # blend weight and shrinkage (chosen by out-of-sample test below)
b["date"] = pd.to_datetime(b.match_id.map(mi.match_date))
b["phase"] = pd.cut(b.legal_before, [-1, 35, 89, 200], labels=["PP", "Mid", "Death"]).astype(str)
b["wkb"] = pd.cut(b.wk_before, [-1, 1, 3, 5, 10], labels=False)
b["bat_out"] = ((b.wk == 1) & (b.dismissed_player_id == b.striker_id)).astype(int)
names = pd.concat([b[["striker_id", "striker_name"]].set_axis(["id", "name"], axis=1), b[["bowler_id", "bowler_name"]].set_axis(["id", "name"], axis=1)]).drop_duplicates("id").set_index("id").name
mp = pd.read_csv(f"{D}/competition_team_player_mapping.csv")
ipl26 = mp[mp.comp_name == "IPL 2026"].drop_duplicates("player_id").set_index("player_id").team_name
nat = mp[~mp.comp_name.str.contains("IPL")].groupby("player_id").team_name.agg(lambda s: s.value_counts().index[0])
allm = b.match_id.unique()

def prep(q):
    """Flag pressure at quantile q, compute context-adjusted run value (rv) for batters and bowlers."""
    d = b.copy(); d["P"] = d.LI >= d.LI.quantile(q)
    bb = d[d.et != "wide"].copy(); bb["id"] = bb.striker_id; bb["n"] = 1.0
    bb["nw"] = bb.bat_wpa / bb.LI
    wk_cost = {}
    for flag in [True, False]:           # runs-equivalent of a wicket, from the WP model
        s = bb[bb.P == flag]; nk = s[s.wk == 0]
        wk_cost[flag] = -(s[s.bat_out == 1].nw.mean() - nk[nk.runs == 0].nw.mean()) / np.polyfit(nk.runs, nk.nw, 1)[0]
    keys = ["innings", "phase", "wkb", "P", "fmt"]
    cost = bb.P.map(wk_cost)
    bb["rv"] = (bb.runs - bb.groupby(keys).runs.transform("mean")) - cost * (bb.bat_out - bb.groupby(keys).bat_out.transform("mean"))
    bb["w"] = bb.w_bat; bb["wpa_"] = bb.bat_wpa
    bw = d.copy(); bw["id"] = bw.bowler_id; bw["n"] = bw.legal.astype(float)
    cost = bw.P.map(wk_cost)
    bw["rv"] = -(bw.bowl_runs - bw.groupby(keys).bowl_runs.transform("mean")) + cost * (bw.bowl_wk - bw.groupby(keys).bowl_wk.transform("mean"))
    bw["w"] = bw.w_bowl; bw["wpa_"] = bw.bowl_wpa
    return bb, bw, wk_cost

def agg(src):
    d = pd.DataFrame({"id": src.id, "match_id": src.match_id, "P": src.P, "v": src.rv * src.w, "n": src.n * src.w, "raw": src.n, "wpa": src.wpa_, "rvraw": src.rv})
    return d.groupby(["id", "match_id", "P"], as_index=False)[["v", "n", "raw", "wpa", "rvraw"]].sum()
def rating(g, ids, w=None, wp=W_P):
    if w is not None:
        g = g.copy(); m = g.match_id.map(w).fillna(0).values; g["v"] *= m; g["n"] *= m
    p = g[g.P].groupby("id")[["v", "n"]].sum().reindex(ids).fillna(0); n = g[~g.P].groupby("id")[["v", "n"]].sum().reindex(ids).fillna(0)
    P_ = p.v / (p.n + K_P) * 100; N_ = n.v / (n.n + K_N) * 100
    return wp * P_ + (1 - wp) * N_, P_, N_
def eligible(g, src, min_balls=150, min_matches=15):
    p = g[g.P].groupby("id"); ok = set(p.raw.sum()[lambda s: s >= min_balls].index) & set(p.match_id.nunique()[lambda s: s >= min_matches].index)
    last = src.groupby("id").date.max(); ok = ok & set(last[last >= "2025-01-01"].index)
    # Pakistan players are left out of the lists: they have not played in the IPL since 2008, so an IPL
    # franchise cannot sign them. Their balls still count towards every average and towards other players' numbers.
    return sorted(i for i in ok if not str(nat.get(i, "")).startswith("Pakistan"))

def validate(g):
    """Out-of-sample: which estimator built on half the matches best predicts raw pressure rv in the other half?"""
    res = {}
    for _ in range(100):
        h = pd.Series(rng.random(len(allm)) < .5, index=allm); m = g.match_id.map(h).values
        A, B = g[m], g[~m]; pa = A[A.P].groupby("id").raw.sum(); pb = B[B.P].groupby("id")[["rvraw", "raw"]].sum()
        ids = pb[pb.raw >= 75].index.intersection(pa[pa >= 75].index); y = pb.rvraw.reindex(ids) / pb.raw.reindex(ids)
        for wp in [0, .25, .5, .75, 1]: res.setdefault(wp, []).append(rating(A, ids, wp=wp)[0].corr(y, method="spearman"))
    return {str(k): round(float(np.mean(v)), 3) for k, v in res.items()}
def temporal(g, src):
    dt = src.groupby("match_id").date.first(); early = g.match_id.map(dt) < "2025-01-01"
    A, B = g[early.values], g[~early.values]; pa = A[A.P].groupby("id").raw.sum(); pb = B[B.P].groupby("id")[["rvraw", "raw"]].sum()
    ids = pb[pb.raw >= 75].index.intersection(pa[pa >= 75].index); y = pb.rvraw.reindex(ids) / pb.raw.reindex(ids)
    return {"n_players": len(ids), "blend": round(float(rating(A, ids)[0].corr(y, method="spearman")), 3), "pressure_only": round(float(rating(A, ids, wp=1)[0].corr(y, method="spearman")), 3)}

def analyse(kind, min_balls=150, min_matches=15, check=True):
    src = BB if kind == "bat" else BW; g = agg(src); el = eligible(g, src, min_balls, min_matches)
    sc, P_, N_ = rating(g, el)
    R = pd.DataFrame({"name": names.reindex(el), "rating": sc, "pressure_rv100": P_, "normal_rv100": N_}, index=el)
    cnt = pd.Series(0.0, index=el); ranks = []
    for _ in range(400):
        w = pd.Series(rng.choice(allm, len(allm))).value_counts(); s = rating(g, el, w)[0]; cnt[s.nlargest(10).index] += 1; ranks.append(s.rank(ascending=False))
    rk = pd.concat(ranks, axis=1); R["top10_boot%"] = cnt / 4; R["rank_lo"] = rk.quantile(.1, axis=1); R["rank_hi"] = rk.quantile(.9, axis=1)
    for q in [0.70, 0.80]:               # sensitivity to the pressure cut-off
        s2 = SENS[q][0 if kind == "bat" else 1]; R[f"rank_cut{int(round((1-q)*100))}"] = rating(agg(s2), el)[0].rank(ascending=False)
    P = src[src.P]; N = src[~src.P]
    if kind == "bat":
        for pf, d in [("p_", P), ("n_", N)]:
            gg = d.groupby("id"); R[pf + "balls"] = gg.size().reindex(el); R[pf + "runs"] = gg.runs.sum().reindex(el)
            R[pf + "sr"] = R[pf + "runs"] / R[pf + "balls"] * 100; R[pf + "avg"] = R[pf + "runs"] / gg.bat_out.sum().reindex(el).clip(lower=1)
            R[pf + "bdry%"] = (gg.four.sum() + gg.six.sum()).reindex(el) / R[pf + "balls"] * 100
            R[pf + "dot%"] = d[d.tot == 0].groupby("id").size().reindex(el).fillna(0) / R[pf + "balls"] * 100
        R["avg_bat_pos"] = P.groupby("id").batting_order.mean().reindex(el); R["hand"] = src.groupby("id").batting_type.agg(lambda s: s.value_counts().index[0]).reindex(el)
    else:
        for pf, d in [("p_", P), ("n_", N)]:
            gg = d.groupby("id"); R[pf + "balls"] = gg.n.sum().reindex(el); R[pf + "wkts"] = gg.bowl_wk.sum().reindex(el)
            R[pf + "econ"] = gg.bowl_runs.sum().reindex(el) / R[pf + "balls"] * 6
            R[pf + "dot%"] = d[(d.tot == 0) & d.legal].groupby("id").size().reindex(el).fillna(0) / R[pf + "balls"] * 100
        R["p_balls_per_wkt"] = R.p_balls / R.p_wkts.clip(lower=1)
        R["type"] = src.groupby("id").pace_or_spin.agg(lambda s: s.value_counts().index[0]).reindex(el); R["style"] = src.groupby("id").bowling_type.agg(lambda s: s.value_counts().index[0]).reindex(el)
    R["p_inns"] = P.groupby("id").match_id.nunique().reindex(el)
    R["p_wpa_total"] = P.groupby("id").wpa_.sum().reindex(el) * 100
    R["pos_inn%"] = (P.groupby(["id", "match_id"]).rv.sum() > 0).groupby(level=0).mean().reindex(el) * 100
    ph = P.groupby(["id", "phase"]).size().unstack(fill_value=0); ph = ph.div(ph.sum(axis=1), axis=0) * 100
    for c_ in ["PP", "Mid", "Death"]: R["p_" + c_ + "%"] = ph[c_].reindex(el)
    R["ipl_p_balls"] = P[P.fmt == "IPL"].groupby("id").n.sum().reindex(el).fillna(0)
    R["ipl2026_team"] = ipl26.reindex(el).fillna("-").values; R["country"] = nat.reindex(el).fillna("-").values
    R["last_match"] = src.groupby("id").date.max().reindex(el).dt.date
    R = R.sort_values("rating", ascending=False); R.insert(0, "rank", range(1, len(R) + 1))
    return (R, validate(g), temporal(g, src)) if check else R

SENS = {q: prep(q) for q in [0.70, 0.80]}
BB, BW, WKC = prep(0.75)
E, valb, tmpb = analyse("bat"); F, valw, tmpw = analyse("bowl")
E.to_csv(f"{OUT}/batters_ranked.csv"); F.to_csv(f"{OUT}/bowlers_ranked.csv")
ov = lambda T, c: int((T.sort_values(c).index[:10].isin(T.index[:10])).sum())
meta = {"auc": round(roc_auc_score(b.won, b.wp_pre), 4), "brier": round(brier_score_loss(b.won, b.wp_pre), 4), "li_threshold": round(float(thr), 3), "balls": len(b), "matches": int(b.match_id.nunique()),
        "elig_bat": len(E), "elig_bowl": len(F), "wicket_cost_runs": {"pressure": round(float(WKC[True]), 2), "normal": round(float(WKC[False]), 2)},
        "oos_bat": valb, "oos_bowl": valw, "temporal_bat": tmpb, "temporal_bowl": tmpw,
        "top10_overlap": {"bat_cut30": ov(E, "rank_cut30"), "bat_cut20": ov(E, "rank_cut20"), "bowl_cut30": ov(F, "rank_cut30"), "bowl_cut20": ov(F, "rank_cut20")}}
json.dump(meta, open(f"{OUT}/meta.json", "w"), indent=1); print(json.dumps(meta, indent=1))
pd.set_option("display.width", 320); pd.set_option("display.max_columns", 50)
print(E[["rank", "name", "rating", "pressure_rv100", "normal_rv100", "top10_boot%", "rank_lo", "rank_hi", "rank_cut30", "rank_cut20", "p_balls", "p_sr", "n_sr", "p_avg", "n_avg", "p_wpa_total", "pos_inn%", "avg_bat_pos", "ipl2026_team", "country"]].head(30).round(1).to_string())
print(F[["rank", "name", "rating", "pressure_rv100", "normal_rv100", "top10_boot%", "rank_lo", "rank_hi", "rank_cut30", "rank_cut20", "p_balls", "p_wkts", "p_econ", "n_econ", "p_wpa_total", "pos_inn%", "p_Death%", "type", "ipl2026_team", "country"]].head(30).round(1).to_string())
sv = b.groupby("pressure").agg(balls=("LI", "size"), mean_LI=("LI", "mean"), rpb=("tot", "mean"), wk_rate=("wk", "mean"), abs_wpa=("wpa", lambda x: x.abs().mean()), inn2_share=("innings", lambda x: (x == 2).mean()))
sv.to_csv(f"{OUT}/pressure_validation.csv"); print(sv)
b.groupby(["innings", "phase"]).pressure.mean().unstack().to_csv(f"{OUT}/pressure_by_phase.csv")
b[["LI", "pressure", "innings", "legal_before"]].sample(20000, random_state=1).to_csv(f"{OUT}/li_sample.csv", index=False)
# ---- role detail for squad-fit analysis: death-over, powerplay and chase pressure numbers
def roles(E, F):
    dP = BW[BW.P & (BW.phase == "Death")].groupby("id"); F["death_p_balls"] = dP.n.sum().reindex(F.index).fillna(0); F["death_p_econ"] = dP.bowl_runs.sum().reindex(F.index) / F.death_p_balls.clip(lower=1) * 6
    F["death_p_wkts"] = dP.bowl_wk.sum().reindex(F.index).fillna(0)
    ppP = BW[BW.P & (BW.phase == "PP")].groupby("id"); F["pp_p_balls"] = ppP.n.sum().reindex(F.index).fillna(0); F["pp_p_econ"] = ppP.bowl_runs.sum().reindex(F.index) / F.pp_p_balls.clip(lower=1) * 6
    dB = BB[BB.P & (BB.phase == "Death")].groupby("id"); E["death_p_balls"] = dB.size().reindex(E.index).fillna(0); E["death_p_sr"] = dB.runs.sum().reindex(E.index) / E.death_p_balls.clip(lower=1) * 100
    cB = BB[BB.P & (BB.innings == 2)].groupby("id"); E["chase_p_balls"] = cB.size().reindex(E.index).fillna(0); E["chase_p_sr"] = cB.runs.sum().reindex(E.index) / E.chase_p_balls.clip(lower=1) * 100
    E["chase_p_avg"] = cB.runs.sum().reindex(E.index) / cB.bat_out.sum().reindex(E.index).clip(lower=1)
roles(E, F)
E.to_csv(f"{OUT}/batters_ranked.csv"); F.to_csv(f"{OUT}/bowlers_ranked.csv")

# ---- auction watchlist: players below the ranking threshold (40-149 pressure balls, 5+ matches).
# The floor is low so that Indian players with only a few IPL seasons can be rated at all.
# Same rating, same shrinkage. These players are NOT in the official ranking; "would_rank" is where
# their rating would sit in the main list. Used only for the auction section.
WE = analyse("bat", 40, 5, check=False); WF = analyse("bowl", 40, 5, check=False); roles(WE, WF)
ipl_any = set(mp[mp.comp_name.str.contains("IPL")].player_id)
for W, M_, fn in [(WE, E, "auction_watchlist_batters.csv"), (WF, F, "auction_watchlist_bowlers.csv")]:
    W = W[~W.index.isin(M_.index)].copy()
    W["would_rank"] = [int((M_.rating > r).sum()) + 1 for r in W.rating]
    W["ever_in_ipl_squad"] = W.index.isin(ipl_any)
    W = W.drop(columns=["rank", "rank_cut30", "rank_cut20"]); W.insert(0, "watch_rank", range(1, len(W) + 1))
    W.to_csv(f"{OUT}/{fn}")
