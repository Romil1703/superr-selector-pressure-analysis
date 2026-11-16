# Most Reliable Players Under Pressure

My Round 1 entry for **SupeRR Selector Season 2** (Rajasthan Royals): which T20 players hold up when the match is on the line, and who RR should chase at the IPL 2027 auction.

- **Report (PDF):** [`report/Methodology_Report.pdf`](report/Methodology_Report.pdf)

## The idea

1. A win-probability model scores every ball. A ball's **leverage** is how much its outcome can move the result; the top 25% are **pressure balls**.
2. Each ball is scored in runs against what an average player does in the same situation (innings, phase, wickets down, IPL or international). A wicket is converted to runs using the model.
3. A player's **Pressure Reliability Rating** is half his pressure level plus half his normal level, with small samples pulled toward average.
4. That blend was chosen by test: it predicts pressure performance in unseen matches nearly 50% better than a rating built on pressure balls alone.

## Top 10

| Rank | Batters | Bowlers |
|:-:|---|---|
| 1 | Vaibhav Sooryavanshi | Kuldeep Yadav |
| 2 | Abhishek Sharma | Sunil Narine |
| 3 | Tim David | Rashid Khan |
| 4 | Suryakumar Yadav | Jasprit Bumrah |
| 5 | Heinrich Klaasen | Varun Chakravarthy |
| 6 | Phil Salt | Josh Hazlewood |
| 7 | Andre Russell | Mujeeb Ur Rahman |
| 8 | Cameron Green | Mahedi Hasan |
| 9 | Harry Brook | Mohammad Nawaz |
| 10 | Jos Buttler | Wanindu Hasaranga |

## What's here

| Path | Contents |
|---|---|
| `report/` | The report as PDF and Word, with its figures |
| `code/analysis_final.py` | Full pipeline: cleaning, win-probability model, leverage, ratings, validation, auction watchlist |
| `code/charts.py` | Draws the figures |
| `code/report_tables.py` | Builds every table in the report from the results files |
| `code/build_report.js` | Writes the Word report from those tables and figures |
| `results/batters_ranked.csv`, `results/bowlers_ranked.csv` | Ratings for every eligible batter (86) and bowler (92) |
| `results/auction_watchlist_*.csv` | Same rating for players with 60 to 149 pressure balls. Not part of the ranking; used only for the auction section |
| `results/meta.json` | Model and validation figures |

## Running it

```
pip install pandas scikit-learn matplotlib
python3 code/analysis_final.py <data_dir> out
python3 code/charts.py out
python3 code/report_tables.py out
npm install docx && node code/build_report.js out Methodology_Report.docx
```

`<data_dir>` is the folder holding the six CSV files from the competition data pack. **The data pack is not included here**; it belongs to Rajasthan Royals and is available to registered participants only. The run takes about a minute and uses fixed random seeds.

## Change log

**16 Nov 2026**

- Fixed the opposition weighting. The data pack labels two A-team tournaments (Emerging Teams Asia Cup 2024, Asia Cup Rising Stars 2025) with the same format code as the IPL, and the earlier code treated every team in them as an IPL side. Balls against UAE, Oman, Hong Kong and the A teams were getting full weight instead of 0.6, and those matches were being compared with IPL averages. They are now grouped with T20Is, as the report always described. This moved the bowling top 10 (Narine up to 2nd, Hazlewood to 6th, Hasaranga in at 10th, Abrar Ahmed out) and swapped Brook and Buttler at 9 and 10 in the batting list.
- Added the auction watchlist and rewrote the auction section around lower-cost players RR could realistically sign.
- The report is now built by code from the results files.

## Limits

Pressure performance is noisy. The rating predicts held-out pressure performance at about 0.20 (batters) and 0.25 (bowlers), ranks 8 to 10 are close to the players just below them, and batting ratings did not carry forward across a two-year gap. The report covers this in full.
