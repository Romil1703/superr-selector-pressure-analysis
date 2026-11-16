"""Builds the tables used in the report from the ranked CSVs. Usage: python3 report_tables.py <out_dir>"""
import sys, json, pandas as pd
O = sys.argv[1]
E = pd.read_csv(f"{O}/batters_ranked.csv", index_col=0); F = pd.read_csv(f"{O}/bowlers_ranked.csv", index_col=0)
WE = pd.read_csv(f"{O}/auction_watchlist_batters.csv", index_col=0); WF = pd.read_csv(f"{O}/auction_watchlist_bowlers.csv", index_col=0)
M = json.load(open(f"{O}/meta.json")); V = pd.read_csv(f"{O}/pressure_validation.csv").set_index("pressure")
CODE = {"Rajasthan Royals": "RR", "Sunrisers Hyderabad": "SRH", "Royal Challengers Bengaluru": "RCB", "Mumbai Indians": "MI", "Kolkata Knight Riders": "KKR",
        "Gujarat Titans": "GT", "Delhi Capitals": "DC", "Lucknow Super Giants": "LSG", "Punjab Kings": "PBKS", "Chennai Super Kings": "CSK", "-": "–"}
STYLE = {"Right-arm Fast": "RA fast", "Right-arm fast-medium": "RA fast-medium", "Right-arm medium-fast": "RA medium-fast", "Left-arm Fast": "LA fast", "Left-arm medium": "LA medium",
         "Left-arm fast-medium": "LA fast-medium", "Right-arm offbreak": "Off-spin", "Right-arm Leg-Break": "Leg-spin", "Slow left-arm orthodox": "Left-arm spin"}
s = lambda v, d=1: ("+" if v >= 0 else "−") + f"{abs(v):.{d}f}"
pct = lambda v: f"{v:.0f}%"
rng = lambda r: f"{r.rank_lo:.0f}–{r.rank_hi:.0f}"
nm = lambda n: n.replace("Namboori ", "")
T = {}
T["top"] = [[str(i + 1), nm(E.name.iloc[i]), F.name.iloc[i]] for i in range(10)]
T["press"] = [["Deliveries", f"{V.balls[False]:,}", f"{V.balls[True]:,}"], ["Mean leverage", f"{V.mean_LI[False]:.2f}", f"{V.mean_LI[True]:.2f}"],
              ["Average win-probability swing per ball", f"{V.abs_wpa[False]*100:.2f}%", f"{V.abs_wpa[True]*100:.2f}%"],
              ["Share that are in a chase", pct(V.inn2_share[False] * 100), pct(V.inn2_share[True] * 100)], ["Runs per ball", f"{V.rpb[False]:.2f}", f"{V.rpb[True]:.2f}"]]
T["valid"] = [["Pressure balls only", f"{M['oos_bat']['1']:.2f}", f"{M['oos_bowl']['1']:.2f}"], ["Half pressure, half normal (used)", f"{M['oos_bat']['0.5']:.2f}", f"{M['oos_bowl']['0.5']:.2f}"]]
T["bat10"] = [[str(r["rank"]), nm(r["name"]), s(r.rating), s(r.pressure_rv100), s(r.normal_rv100), f"{r.p_balls:.0f}", f"{r.p_sr:.1f}", f"{r.n_sr:.1f}", f"{r.p_avg:.1f}", f"{r.n_avg:.1f}",
               pct(r["pos_inn%"]), pct(r["top10_boot%"]), rng(r), CODE[r.ipl2026_team]] for _, r in E.head(10).iterrows()]
T["bowl10"] = [[str(r["rank"]), r["name"], s(r.rating), s(r.pressure_rv100), s(r.normal_rv100), f"{r.p_balls:.0f}", f"{r.p_wkts:.0f}", f"{r.p_econ:.2f}", f"{r.n_econ:.2f}", f"{r['p_dot%']:.1f}",
                pct(r["pos_inn%"]), pct(r["top10_boot%"]), rng(r), CODE[r.ipl2026_team]] for _, r in F.head(10).iterrows()]
rb = E[E.ipl2026_team == "Rajasthan Royals"]; rw = F[F.ipl2026_team == "Rajasthan Royals"]
T["rrbat"] = [[r["name"], str(r["rank"]), s(r.pressure_rv100), s(r.normal_rv100), f"{r.p_sr:.1f}"] for _, r in rb.iterrows()]
T["rrbowl"] = [[r["name"], str(r["rank"]), s(r.pressure_rv100), s(r.normal_rv100), f"{r.p_econ:.2f}", f"{r.death_p_econ:.1f} ({r.death_p_balls:.0f})"] for _, r in rw.iterrows()]
def pick(main, watch, name):
    if name in set(main.name): r = main[main.name == name].iloc[0]; return r, f"{r['rank']:.0f}"
    r = watch[watch.name == name].iloc[0]; return r, f"({r.would_rank:.0f})"
def bowl_row(name, show=None):
    r, rk = pick(F, WF, name)
    return [show or name, STYLE.get(r["style"], r["style"]), r.country, rk, f"{r.p_balls:.0f}", s(r.pressure_rv100), f"{r.p_econ:.2f} / {r.n_econ:.2f}",
            f"{r.death_p_econ:.1f} ({r.death_p_balls:.0f})", f"{r.pp_p_econ:.1f} ({r.pp_p_balls:.0f})", pct(r["pos_inn%"])]
def bat_row(name):
    r, rk = pick(E, WE, name)
    return [name, r.hand, r.country, rk, f"{r.p_balls:.0f}", s(r.pressure_rv100), f"{r.p_sr:.1f}", f"{r.p_avg:.1f}", f"{r.death_p_sr:.0f} ({r.death_p_balls:.0f})", f"{r.chase_p_avg:.1f}", pct(r["pos_inn%"])]
T["tg_pace"] = [bowl_row(n, sh) for n, sh in [("Taskin Ahmed", None), ("Hasan Mahmud", None), ("Joshua Little", "Josh Little"), ("Mark Adair", None), ("FazalHaq Farooqi", "Fazalhaq Farooqi")]]
T["tg_spin"] = [bowl_row(n) for n in ["Mujeeb Ur Rahman", "Sikandar Raza", "Liam Dawson"]]
T["tg_bat"] = [bat_row(n) for n in ["Daryl Mitchell", "Mark Chapman", "George Dockrell", "Towhid Hridoy", "Bhanuka Rajapaksa"]]
T["meta"] = M
# facts quoted in the text
ex = {}
for lab, d in [("bat", E), ("bowl", F)]:
    t = d.head(10); ex[lab] = {"top5_min_boot": float(t.head(5)["top10_boot%"].min()), "r8_10_boot": [float(x) for x in t.tail(3)["top10_boot%"]], "min_pos_inn": float(t["pos_inn%"].min()),
                               "below50": [n for n, v in zip(t.name, t["pos_inn%"]) if v < 50]}
ex["spin_in_top10"] = int((F.head(10).type == "Spin").sum())
ex["rr_bowl_below_avg_pressure"] = int((rw.pressure_rv100 < 0).sum()); ex["rr_best_bowl_rank"] = int(rw["rank"].min())
T["facts"] = ex
json.dump(T, open(f"{O}/report_tables.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(T, indent=0, ensure_ascii=False))
