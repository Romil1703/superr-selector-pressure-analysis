# Most Reliable Players Under Pressure

My Round 1 entry for **SupeRR Selector Season 2** (Rajasthan Royals): which T20 players hold up when the match is on the line, and who RR should chase at the IPL 2027 auction.

- **Report (PDF):** [`report/Methodology_Report.pdf`](report/Methodology_Report.pdf)

## The idea

1. A win-probability model scores every ball. A ball's **leverage** is how much its outcome can move the result; the top 25% are **pressure balls**.
2. Each ball is scored in runs against what an average player does in the same situation (innings, phase, wickets down, IPL or T20I). A wicket is converted to runs using the model.
3. A player's **Pressure Reliability Rating** is half his pressure level plus half his normal level, with small samples pulled toward average.
4. That blend was chosen by test: it predicts pressure performance in unseen matches about 50% better than a rating built on pressure balls alone.

## Top 10

| Rank | Batters | Bowlers |
|:-:|---|---|
| 1 | Vaibhav Sooryavanshi | Kuldeep Yadav |
| 2 | Abhishek Sharma | Rashid Khan |
| 3 | Tim David | Sunil Narine |
| 4 | Suryakumar Yadav | Jasprit Bumrah |
| 5 | Heinrich Klaasen | Varun Chakravarthy |
| 6 | Phil Salt | Mohammad Nawaz |
| 7 | Andre Russell | Josh Hazlewood |
| 8 | Cameron Green | Abrar Ahmed |
| 9 | Jos Buttler | Mujeeb Ur Rahman |
| 10 | Harry Brook | Mahedi Hasan |

## What's here

| Path | Contents |
|---|---|
| `report/` | The report as PDF and LaTeX source, with its figures |
| `code/analysis_final.py` | Full pipeline: cleaning, win-probability model, leverage, ratings, validation |
| `code/charts.py` | Draws the figures |
| `results/` | Ratings for every eligible batter and bowler, plus model and validation figures |

## Running it

```
pip install pandas scikit-learn matplotlib
python3 code/analysis_final.py <data_dir> out
python3 code/charts.py out
```

`<data_dir>` is the folder holding the six CSV files from the competition data pack. **The data pack is not included here**; it belongs to Rajasthan Royals and is available to registered participants only.

## Limits

Pressure performance is noisy. The rating predicts held-out pressure performance at about 0.20 (batters) and 0.26 (bowlers), ranks 8 to 10 are close to the players just below them, and batting ratings did not carry forward across a two-year gap. The report covers this in full.
