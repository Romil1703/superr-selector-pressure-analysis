"""Builds the tables used in the report from the ranked CSVs.
Usage: python3 report_tables.py <out_dir> <ipl2027_released_players.json>"""
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
# RR's IPL 2027 squad after the official retention lists (17 November 2026): 17 retained, plus Mohammed Shami
# and Manimaran Siddharth traded in. Sam Curran was traded to LSG; Hetmyer and eight others were released.
RR27 = ["Riyan Parag", "Yashasvi Jaiswal", "Vaibhav Sooryavanshi", "Ravindra Jadeja", "Dhruv Jurel", "Jofra Archer", "Aman Rao Perala",
        "Brijesh Sharma", "Nandre Burger", "Dasun Shanaka", "Donovan Ferreira", "Lhuan-dre Pretorius", "Ravi Bishnoi", "Sandeep Sharma",
        "Shubham Dubey", "Sushant Mishra", "Yash Raj Punja", "Mohammed Shami", "Manimaran Siddharth"]
rb = E[E.name.isin(RR27)]; rw = F[F.name.isin(RR27)]
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
# ---- the ten auction picks. Every one is in the IPL 2027 pool: either in no IPL 2026 squad, or released on
# 17 November 2026 (ipl2027_released_players.json). RR has 6 slots, 3 of them overseas, so the list is split.
REL = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
TEN = [("Taskin Ahmed", "bowl", "Fast bowler", "Death overs", "Never in the IPL"),
       ("Blessing Muzarabani", "bowl", "Fast bowler", "New ball and middle overs", "\u20B975 lakh (KKR, 2026)"),
       ("Daryl Mitchell", "bat", "Middle-order batter", "Finishing chases", "Not in an IPL 2026 squad"),
       ("Joshua Little", "bowl", "Left-arm fast bowler", "Death overs if Taskin is blocked", "Played for GT, 2023\u201324"),
       ("Mark Chapman", "bat", "Middle-order batter", "Back-up finisher", "Never in an IPL squad"),
       ("Kamindu Mendis", "bat", "Batting all-rounder", "Late-overs hitting, part-time spin", "\u20B975 lakh (SRH, 2026)"),
       ("Mujeeb Ur Rahman", "bowl", "Off-spinner", "Spin cover", "Unsold, 2026 auction"),
       ("Akash Madhwal", "bowl", "Seam bowler", "Back-up Indian seamer", "Released by CSK"),
       ("Abishek Porel", "bat", "Wicketkeeper-batter", "Back-up keeper", "Released by DC"),
       ("M Shahrukh Khan", "bat", "Middle-order hitter", "Indian finisher", "Released by GT")]
SHOW = {"Joshua Little": "Josh Little", "M Shahrukh Khan": "Shahrukh Khan"}
ctry = lambda c: "India" if c in ("-", "India A") else c
T["ten"] = []
for k, (n, kind, role, job, deal) in enumerate(TEN):
    r, rk = pick(F, WF, n) if kind == "bowl" else pick(E, WE, n)
    assert r.ipl2026_team == "-" or n in REL or SHOW.get(n, n) in REL, f"{n} is not in the 2027 pool"
    assert not str(r.country).startswith("Pakistan"), n
    T["ten"].append([str(k + 1), SHOW.get(n, n), role, ctry(r.country), job, deal, rk + (" bowl" if kind == "bowl" else " bat"), s(r.pressure_rv100), s(r.rating)])
def bowl_ev(n):
    x = bowl_row(n, SHOW.get(n)); x[2] = ctry(x[2]); return x
def bat_ev(n):
    x = bat_row(n); x[0] = SHOW.get(n, n); x[2] = ctry(x[2]); return x
T["ev_bowl"] = [bowl_ev(n) for n in ["Taskin Ahmed", "Blessing Muzarabani", "Joshua Little", "Mujeeb Ur Rahman", "Akash Madhwal"]]
T["ev_bat"] = [bat_ev(n) for n in ["Daryl Mitchell", "Mark Chapman", "Kamindu Mendis", "Abishek Porel", "M Shahrukh Khan"]]
sh = F[F.name == "Mohammed Shami"].iloc[0]
T["shami"] = {"rank": int(sh["rank"]), "p_balls": int(sh.p_balls), "pp_balls": int(sh.pp_p_balls), "pp_econ": round(float(sh.pp_p_econ), 1),
              "death_balls": int(sh.death_p_balls), "death_econ": round(float(sh.death_p_econ), 1), "pressure": s(sh.pressure_rv100), "normal": s(sh.normal_rv100)}
T["watch_n"] = {"bat": len(WE), "bowl": len(WF)}
bo = F[F.name == "Trent Boult"].iloc[0]; T["boult"] = s(bo.pressure_rv100)
T["n_watch_in_ten"] = sum(x[6].startswith("(") for x in T["ten"])
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
