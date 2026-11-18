// Builds the methodology report (.docx) from results/report_tables.json and the charts.
// Usage: node build_report.js <results_dir> <output.docx>
const fs = require("fs"), path = require("path");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Footer, PageNumber, AlignmentType, LevelFormat,
  BorderStyle, WidthType, ShadingType, ExternalHyperlink, VerticalAlign } = require("docx");
const R = process.argv[2], OUT = process.argv[3];
const T = JSON.parse(fs.readFileSync(path.join(R, "report_tables.json"), "utf8"));
const M = T.meta, FONT = "Calibri", W = 9638; // text width in DXA (A4, 2 cm margins)
const REPO = "https://github.com/Romil1703/superr-selector-pressure-analysis";

// **bold** and *italic* inline markup
function runs(text, base = {}) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map(s =>
    s.startsWith("**") ? new TextRun({ text: s.slice(2, -2), bold: true, font: FONT, ...base }) :
    s.startsWith("*") ? new TextRun({ text: s.slice(1, -1), italics: true, font: FONT, ...base }) : new TextRun({ text: s, font: FONT, ...base }));
}
const p = (t, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, ...o, children: runs(t) });
const b = t => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 70, line: 276 }, children: runs(t) });
const h1 = t => new Paragraph({ style: "H1", children: [new TextRun({ text: t, font: FONT })] });
const h2 = t => new Paragraph({ style: "H2", children: [new TextRun({ text: t, font: FONT })] });
const cap = t => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: runs(t, { size: 17, italics: true, color: "595959" }) });
const gap = () => new Paragraph({ spacing: { after: 60 }, children: [] });
function img(file, wcm) {
  const buf = fs.readFileSync(path.join(R, file)), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), px = wcm / 2.54 * 96;
  return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 40 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: px, height: px * h / w } })] });
}
const line = (c = "BFBFBF", sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color: c }), none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
// widths: fractions of table width; frac: share of the page width the table takes; left: number of left-aligned leading columns
function table(head, rows, widths, { frac = 1, size = 18, left = 1, groups = {} } = {}) {
  const tw = Math.round(W * frac), sum = widths.reduce((a, c) => a + c, 0);
  const cw = widths.map(x => Math.round(tw * x / sum)); cw[cw.length - 1] += tw - cw.reduce((a, c) => a + c, 0);
  const cell = (txt, i, hd, last) => new TableCell({
    width: { size: cw[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: hd ? { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } : undefined,
    margins: { top: 45, bottom: 45, left: 70, right: 70 },
    borders: { top: hd ? line("7F7F7F", 8) : none, bottom: hd ? line("7F7F7F", 6) : last ? line("7F7F7F", 8) : line("D9D9D9", 4), left: none, right: none },
    children: [new Paragraph({ keepNext: !last, alignment: i < left ? AlignmentType.LEFT : AlignmentType.CENTER, children: runs(String(txt), { size, bold: hd || undefined }) })] });
  const trs = [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((t, i) => cell(t, i, true)) })];
  rows.forEach((r, k) => {
    if (groups[k]) trs.push(new TableRow({ cantSplit: true, children: [new TableCell({ columnSpan: head.length, width: { size: tw, type: WidthType.DXA },
      margins: { top: 45, bottom: 45, left: 70, right: 70 }, borders: { top: none, bottom: line("D9D9D9", 4), left: none, right: none },
      children: [new Paragraph({ keepNext: true, children: runs(groups[k], { size, italics: true, bold: true }) })] })] }));
    trs.push(new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false, k === rows.length - 1)) }));
  });
  return new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: cw, alignment: AlignmentType.CENTER, rows: trs });
}
const f2 = x => x.toFixed(2), sg = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
const bat = n => T.bat10.find(r => r[1].includes(n)), bowl = n => T.bowl10.find(r => r[1].includes(n));
const impB = Math.round((M.oos_bat["0.5"] / M.oos_bat["1"] - 1) * 100), impW = Math.round((M.oos_bowl["0.5"] / M.oos_bowl["1"] - 1) * 100);

const C = [];
C.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Most Reliable Players Under Pressure", bold: true, size: 44, color: "1F1F1F", font: FONT })] }));
C.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "How I ranked them, and who Rajasthan Royals should go after at the IPL 2027 auction", size: 26, color: "595959", font: FONT })] }));
C.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "SupeRR Selector Season 2  |  Round 1  |  Romil", size: 19, color: "595959", font: FONT })] }));
C.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "Code and full results: ", size: 19, color: "595959", font: FONT }),
  new ExternalHyperlink({ link: REPO, children: [new TextRun({ text: REPO.replace("https://", ""), size: 19, color: "0563C1", underline: {}, font: FONT })] })] }));

C.push(h1("1. The short version"));
C.push(p("Every cricket fan has an opinion on who is “clutch”. I wanted to see what the ball-by-ball data says, and I wanted one number per player that answers a plain question: *when the game is in the balance, how many runs is this player worth over an average one?*"));
C.push(p("My method has three parts. First I built a win-probability model and used it to find the balls that matter most to the result. The top quarter of those are my “pressure balls”. Then I scored every ball against what an average player manages in the same situation. Finally, and this is the part I care about most, I checked my rating against matches it had never seen. A pressure ranking that does not repeat is only a list of who got lucky."));
C.push(p(`That check forced me to change course halfway through. My first rating used pressure balls only, and it fell apart when tested. The one in this report mixes a player’s pressure record with his normal level, and it predicts unseen pressure performance nearly 50% better. I describe what went wrong, and what I did about it, in Section 5.`));
C.push(table(["Rank", "Top 10 batters", "Top 10 bowlers"], T.top, [1, 3, 3], { frac: 0.62, size: 20, left: 0 }));
C.push(gap());
C.push(p("For Rajasthan Royals the message is fairly blunt: the squad lacks bowlers who hold their nerve in tight overs, and it lacks a finisher in the middle order. Section 8 uses the official retention lists of 17 November to pick ten lower-priced players, all in the auction pool, who the data rates under pressure and who fit RR\u2019s six open places."));

C.push(h1("2. The data"));
C.push(p("I used only the data pack: roughly 201,000 deliveries from IPL 2022 to 2026 and T20 Internationals, along with the match, squad and competition files."));
C.push(p(`Some matches had to go. I removed no-results, abandoned games, ties and super overs, which left **${M.matches} matches and ${M.balls.toLocaleString("en-US")} deliveries**. For each ball I then rebuilt the state of the game as the bowler ran in: the score, wickets down, balls left, the target and the required rate. Rain-affected games needed care. I used the revised targets and overs from the match file, otherwise the required rates in those games would have been wrong.`));
C.push(p("One labelling detail matters later. The pack marks two A-team tournaments (the Emerging Teams Asia Cup 2024 and the Asia Cup Rising Stars 2025) with the same format code as the IPL. They are not IPL cricket, so I group them with the T20Is."));

C.push(h1("3. What I mean by pressure"));
C.push(h2("Why not just use the death overs?"));
C.push(p("That was my first instinct too, and it does not survive a few examples. Needing 12 an over is terrifying with three wickets left and fairly routine with nine in hand. The 19th over of a chase that is already gone has no pressure in it at all, even though it is a “death over”. Required rate, wickets in hand, balls left: these are all hints at the same underlying thing, which is *how much does this ball matter to who wins?* I decided to measure that directly."));
C.push(h2("Step 1: a win-probability model"));
C.push(p(`I trained a gradient-boosted model to predict whether the batting side goes on to win. It sees the innings, runs, wickets down, balls remaining, runs needed, the current and required run rates, and a projected first-innings total. To keep it honest I used five-fold cross-validation grouped by match, so the probability for any ball comes from a model that never saw that match. On those held-out predictions the AUC is ${f2(M.auc)} and the Brier score is ${f2(M.brier)}.`));
C.push(h2("Step 2: leverage"));
C.push(p("For each ball I asked the model six what-ifs: what would the win probability be after a dot, a single, a two, a four, a six, or a wicket? I weighted them by how often each happens in T20 cricket (37%, 36%, 7%, 11%, 5%, 4%). If the six answers are far apart, the ball matters a lot. That spread is the ball’s **leverage**. I scaled it so that an average ball scores 1.0, and I multiplied knockout matches by 1.2 because more is riding on them."));
C.push(h2("Step 3: the cut-off"));
C.push(p(`A ball counts as high-pressure when its leverage is **${f2(M.li_threshold)} or higher**. That is the top 25% of all deliveries.`));
C.push(p("Figure 1 shows where those balls fall across an innings.", { keepNext: true }));
C.push(img("c1_pressure_by_over.png", 13.2));
C.push(cap("Figure 1. Share of balls that are high-pressure, by over."));
C.push(h2("Does it pick out the right balls?"));
C.push(table(["", "Normal balls", "Pressure balls"], T.press, [3.2, 1.3, 1.3], { frac: 0.7, size: 20 }));
C.push(gap());
C.push(p("A pressure ball shifts the match more than three times as far as a normal one, and batters score more slowly on them, which is what you would hope to see. One thing I did not expect: pressure is not mostly a death-overs story. In a chase, 44% of powerplay balls are high-pressure, compared with 15% in a first-innings powerplay. It makes sense once you think about it. Losing an opener early in a live chase hurts far more than conceding a boundary late in a game that is already settled."));

C.push(h1("4. Scoring a ball"));
C.push(p("I compare every ball with the average for its situation. A situation here means the innings, the phase (powerplay, middle or death), how many wickets are down, whether it is a pressure ball, and whether the match is IPL or international."));
C.push(b("**For a batter:** runs scored minus the runs expected, with a penalty if he gets out (reduced by the chance that an average batter would have got out there anyway)."));
C.push(b("**For a bowler:** runs expected minus runs conceded, with a bonus for a wicket (reduced by the average chance of taking one)."));
C.push(p(`That leaves the awkward question of how many runs a wicket is worth. I did not want to pick a number out of the air, so I read it off the win-probability model. Losing a wicket costs as much win probability as **${M.wicket_cost_runs.pressure.toFixed(1)} runs on a pressure ball** and **${(Math.floor(M.wicket_cost_runs.normal * 10) / 10).toFixed(1)} runs on a normal ball**. Byes, leg-byes and run-outs are not held against the bowler. Wides and no-balls are.`));
C.push(p("Since the comparison always stays inside the same phase and the same kind of competition, an opener is never measured against a finisher, and an IPL innings is never measured against a T20I knock against a weak attack."));

C.push(h1("5. The rating, and the test that shaped it"));
C.push(h2("My first attempt, and why I dropped it"));
C.push(p("The natural thing to do is rank players on their pressure balls and nothing else. That is what I built first, and the list looked believable enough."));
C.push(p("Then I tried to break it. I split the matches into two random halves and rated every batter in each half separately. If the rating captured real skill, a batter who looked good in one half should look good in the other. He did not. The two sets of ratings had almost nothing to do with each other; the correlation was close to zero. A few hundred balls, a handful of which decide a match, is simply too little to separate skill from luck. The top 10 also reshuffled every time I moved the pressure cut-off slightly, which was a second warning."));
C.push(h2("What I use instead"));
C.push(p("For each player I calculate runs above average per 100 balls twice: once on his pressure balls and once on his normal balls. Both figures are pulled toward zero when the sample is small. In practice I add 300 average pressure balls and 200 average normal balls to every player before dividing. Then:"));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 140 }, border: { top: line("7F7F7F", 6), bottom: line("7F7F7F", 6) },
  children: runs("**Pressure Reliability Rating  =  ½ × pressure level  +  ½ × normal level**", { size: 22 }) }));
C.push(p("You can read it as *the runs I expect this player to be worth, over an average player, per 100 pressure balls.* Both halves are shown for every player in the tables, so it is always clear how his pressure level compares with his usual one."));
C.push(h2("Why half and half"));
C.push(p("I did not choose the weights by feel. A hundred times over, I built ratings from a random half of the matches and compared them with what the same players actually did under pressure in the other half.", { keepNext: true }));
C.push(table(["Rating built from", "Batters", "Bowlers"], T.valid.map((r, i) => i ? r.map(x => `**${x}**`) : r), [3, 1.2, 1.2], { frac: 0.62, size: 20 }));
C.push(cap("Correlation with held-out pressure performance (Spearman)."));
C.push(p(`The blend is clearly better: ${impB}% better for batters and ${impW}% for bowlers. If you want to know how someone will play under pressure, it helps a great deal to know how he plays the rest of the time. Any weight on pressure between a quarter and a half gives nearly the same accuracy. I went with a half because pressure balls are only a quarter of all balls, and I wanted them to count for more than their share.`, { keepNext: true }));
C.push(img("c4_validation.png", 13.6));
C.push(cap("Figure 2. How well each weighting predicts pressure performance in unseen matches. The black outline marks the weighting I used."));

C.push(h1("6. Keeping it fair"));
C.push(b(`**Who qualifies:** a player needs at least 150 pressure balls, at least 15 matches with pressure involvement, and at least one match since January 2025. The last condition removes retired players. ${M.elig_bat} batters and ${M.elig_bowl} bowlers make the cut.`));
C.push(b("**Pakistan and Bangladesh players are left out of the lists.** This ranking is meant to help an IPL franchise. Pakistan players have not appeared in the IPL since 2008, and Bangladesh players\u2019 status is unclear after the BCCI told KKR to release Mustafizur Rahman before IPL 2026. Their deliveries stay in the data, so they still shape the averages and every other player\u2019s numbers. They are only removed from the ranked lists."));
C.push(b("**Small samples:** the added average balls drag thin records back toward the middle."));
C.push(b("**IPL and T20Is:** both are included. Expected values are calculated separately for each, and a ball against an associate nation or an A side counts 0.6 as much as a ball against an IPL team or a full-member nation."));
C.push(b("**Roles:** comparing within the same situation takes care of openers versus finishers and powerplay versus death bowlers."));

C.push(h1("7. The top 10"));
C.push(p("All values are runs better than average per 100 balls. “+inns” is the share of a player’s pressure innings (or spells) in which he came out ahead. “Top-10” and “Range” come from resampling the matches, which I explain in Section 9."));
C.push(h2("Batters"));
C.push(img("c2_bat_top10.png", 14.6));
C.push(cap("Figure 3. Pressure level, normal level and rating for the top 10 batters."));
const w14 = [0.5, 3.1, 1.05, 1.15, 1.05, 0.9, 0.95, 0.95, 0.9, 0.95, 0.9, 0.95, 0.95, 0.85];
C.push(table(["#", "Batter", "Rating", "Pressure", "Normal", "Pr. balls", "Pr. SR", "Norm. SR", "Pr. avg", "Norm. avg", "+inns", "Top-10", "Range", "IPL ’26"], T.bat10, w14, { size: 15, left: 2 }));
C.push(gap());
const so = bat("Sooryavanshi"), kl = bat("Klaasen"), gr = bat("Green");
C.push(b(`**Sooryavanshi** is first, and it is not close. He strikes at ${Math.round(so[6])} under pressure, averages more than he does in normal play, and stays in the top 10 in ${so[11]} of resamples. He has only ${so[5]} pressure balls, so I was ready for the shrinkage to knock him down. It did not.`));
C.push(b(`**Klaasen** is the batter whose game barely changes: ${kl[3]} under pressure against ${kl[4]} normally, and his strike rate actually rises.`));
C.push(b("**Tim David** is the best finisher in the data. He strikes at 200 across 141 pressure balls at the death."));
C.push(b("**Suryakumar and Brook** are in the list on class. Both dip under pressure, though they stay above average."));
C.push(b(`**Ranks 8 to 10** are close. Green, Brook and Buttler are separated by ${(parseFloat(gr[2]) - parseFloat(bat("Buttler")[2])).toFixed(1)} runs per 100 balls, and Tilak Varma in 11th is level with Buttler to one decimal place.`));
C.push(h2("Bowlers"));
C.push(img("c3_bowl_top10.png", 14.6));
C.push(cap("Figure 4. Pressure level, normal level and rating for the top 10 bowlers."));
C.push(table(["#", "Bowler", "Rating", "Pressure", "Normal", "Pr. balls", "Wkts", "Pr. econ", "Norm. econ", "Dot %", "+spells", "Top-10", "Range", "IPL ’26"], T.bowl10, w14, { size: 15, left: 2 }));
C.push(gap());
const ku = bowl("Kuldeep"), hz = bowl("Hazlewood");
C.push(b(`**Kuldeep** is the same bowler whatever the situation (${ku[3]} and ${ku[4]}), and he takes a wicket every 13 pressure balls.`));
C.push(b(`**Kuldeep, Narine and Rashid** are separated by half a run per 100 balls. I have ordered them as the numbers fall, but it is close to a three-way tie at the top.`));
C.push(b(`**Hazlewood** is the one who lifts. He is ${hz[3]} under pressure against ${hz[4]} normally, and his economy drops by a full run.`));
C.push(b("**Narine, Bumrah and Mujeeb** are outstanding in normal play and good, rather than great, under pressure. The rating gives them credit for both."));
const bk = bowl("Bhuvneshwar");
if (bk) C.push(b(`**Bhuvneshwar** is one of the two least secure picks. He is in the top 10 on his normal level (${bk[4]}); under pressure he is about average (${bk[3]}), and he makes the top 10 in only ${bk[11]} of resamples.`));
const mz = bowl("Muzarabani");
if (mz) C.push(b(`**Muzarabani**, in 10th, is the other. He is good both under pressure (${mz[3]}) and normally (${mz[4]}), but 164 pressure balls is a small base, and he makes the top 10 in ${mz[11]} of resamples.`));
C.push(b(`${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][T.facts.spin_in_top10]} of the ten are spinners. I do not think that is a quirk. Most pressure balls come in chases and through the middle overs, and that is where a good spinner takes hold of a game.`));

C.push(h1("8. What this means for Rajasthan Royals"));
C.push(h2("The official lists, and what RR has to work with"));
C.push(p("All ten franchises published their retained and released players on 17 November 2026. The auction is a one-day mini-auction in Goa on 16 December. RR finished fourth last season and lost Qualifier 2 to Gujarat Titans, as the match file in the data pack also shows."));
C.push(b("**Kept:** 17 players, including Parag (captain), Jaiswal, Sooryavanshi, Jadeja, Jurel, Archer, Bishnoi and Sandeep Sharma."));
C.push(b("**Traded:** Mohammed Shami and M. Siddharth came in. Sam Curran went to Lucknow Super Giants."));
C.push(b("**Released:** Shimron Hetmyer, Adam Milne, Kwena Maphaka, Tushar Deshpande, Kuldeep Sen, Yudhvir Singh, Vignesh Puthur, Ravi Singh and Emanjot Chahal."));
C.push(b("**To spend:** ₹27.05 crore on six places, three of which can go to overseas players."));
C.push(p(`That is a reasonable purse for six places, but I have kept to the lower price bracket on purpose. The big names in the pool, such as Head, Starc, Pathirana and Hasaranga, will draw bidding wars from teams with far more room: Lucknow have ₹47.45 crore and Kolkata ₹41.65 crore. Every one of my ten was released this week or was in no IPL squad last season, and none has a recent big-money deal behind him. That way RR can fill all six places from this list and keep money in hand. (One exception might be worth breaking the budget for: Trent Boult, released by Mumbai, has the highest pressure level of any bowler in the pool, ${T.boult}.)`));
C.push(h2("Where the squad is short now"));
C.push(p(`Below is every player in RR’s 2027 squad who qualifies for my ranking, out of ${M.elig_bat} eligible batters and ${M.elig_bowl} eligible bowlers. The others have too few pressure balls to rank.`, { keepNext: true }));
C.push(table(["RR batter", "Rank", "Pressure", "Normal", "Pr. SR"], T.rrbat, [3, 1, 1.2, 1.2, 1.2], { frac: 0.6, size: 18 }));
C.push(gap());
C.push(table(["RR bowler", "Rank", "Pressure", "Normal", "Pr. econ", "Death pr. econ (balls)"], T.rrbowl, [3, 1, 1.2, 1.2, 1.2, 2.2], { frac: 0.78, size: 18 }));
C.push(gap());
const ord = n => { const v = +n, t = v % 100, u = v % 10; return v + ((t >= 11 && t <= 13) ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"); };
const S = T.shami;
C.push(p(`**The death overs are still the weak spot.** Shami arrives as the best-ranked bowler in the squad (${ord(S.rank)}), but he is a new-ball bowler: ${S.pp_balls} of his ${S.p_balls} pressure balls came in the powerplay, where he goes at ${S.pp_econ}. He has bowled only ${S.death_balls} pressure balls at the death. He makes the start of an innings stronger, not the end. At the death, Archer (9.4) and Sandeep Sharma (12.4) remain expensive, and ${["none", "one", "two", "three", "four", "all five"][T.facts.rr_bowl_below_avg_pressure]} of the five ranked bowlers are below average on pressure balls. The seamers RR released were no answer either: Milne, Deshpande and Maphaka, the three with enough balls to rate, are all below average.`));
const rrk = n => ord(T.rrbat.find(r => r[0].includes(n))[1]);
C.push(p(`**The middle order is one finisher short.** Hetmyer, now released, has 118 death-overs pressure balls in this data at a strike rate of 159. Shanaka can take over that job (109 balls at 171), but behind him the cover is thin. Jadeja is ${rrk("Jadeja")}, Jurel and Parag are ${rrk("Jurel")} and ${rrk("Parag")} and below average on pressure balls, and Ferreira and Pretorius have too few pressure balls to rate. RR needs one more batter for the last five overs, ideally one who can also see a chase home.`));
C.push(h2("Widening the net: a watchlist"));
C.push(p(`My ranking needs 150 pressure balls. That bar is right for a top 10, but it hides most of the players a team shopping in the lower price bracket should look at, and nearly every Indian player outside the big names. For this section only, I ran the same rating on players with 40 to 149 pressure balls and at least 5 matches. That adds ${T.watch_n.bat} batters and ${T.watch_n.bowl} bowlers. They are **not** part of my ranking. A rank in brackets shows where a watchlist player’s rating would sit in the main list. The shrinkage is unchanged (300 average pressure balls added to everyone), so a thin record cannot produce a big rating.`));
C.push(h2("The ten players RR should target"));
C.push(p("Every player below is in the IPL 2027 pool: either released on 17 November or in no IPL 2026 squad. None is a Pakistan or Bangladesh player. RR can sign only three overseas players, so picks 1 to 7 are a priority order for those three places, and picks 8 to 10 are for the Indian places.", { keepNext: true }));
C.push(table(["#", "Player", "Role", "Country", "Job at RR", "Last IPL deal", "Rank", "Pressure", "Rating"], T.ten,
  [0.45, 2.3, 2.1, 1.45, 2.6, 2.2, 1.15, 1.0, 0.95], { size: 15, left: 0, groups: { 0: "Overseas: three places", 7: "Indian: three places" } }));
C.push(cap("The ten auction picks. “Rank” is the player’s place in my batting or bowling list; brackets mark a watchlist player."));
C.push(p("**My first-choice six:** Blessing Muzarabani, Daryl Mitchell and Josh Little for the overseas places, with Akash Madhwal, Abishek Porel and Shahrukh Khan for the Indian places. If a first choice is gone, the next name down the same group takes his place. The best value is at the top: Muzarabani is in my bowling top 10 and cost \u20B975 lakh last season."));
C.push(h2("The evidence: bowlers"));
C.push(table(["Player", "Type", "Country", "Rank", "Pr. balls", "Pressure", "Econ pr. / normal", "Death pr. econ (balls)", "Powerplay pr. econ (balls)", "+spells"],
  T.ev_bowl, [2.5, 1.9, 1.6, 0.9, 0.9, 1.15, 1.8, 1.7, 1.7, 1.0], { size: 15, left: 3 }));
C.push(gap());
C.push(b("**1. Blessing Muzarabani** is the find of this auction. He is 10th in my bowling list, so he is a top-10 pressure bowler, and he is the highest-ranked fast bowler anywhere in the pool. Kolkata signed him for \u20B975 lakh as a replacement last season and have now released him. He belongs at the start of an innings (6.6 an over in powerplay pressure) rather than the end (11.3). With Shami and Archer, he would give RR three strong new-ball options."));
C.push(b("**3. Josh Little** is my answer to the death-overs problem. He is a left-arm quick who is better under pressure (+9.0) than out of it, and he concedes 8.7 in death-over pressure, where Archer goes at 9.4 and Sandeep Sharma at 12.4. He has played two IPL seasons at Gujarat."));
C.push(b("**4. Gerald Coetzee** is the other death option. On 26 death-over pressure balls he has gone at just 5.8, and he is +7.2 under pressure. He went unsold at the 2026 auction, joined Hyderabad as a \u20B92 crore injury replacement, and has now been released. He is \u22126.5 on normal balls, though, so he is a specialist for the tight overs and should be priced as one."));
C.push(b("**8. Akash Madhwal** is the weakest-evidenced pick, and I want to be plain about that. He has only 40 pressure balls: +6.2 under pressure and 4.1 an over in the powerplay, but 15.3 at the death. With so few balls, his rating rests mostly on the shrinkage. He is here because the Indian seamers in the pool with bigger samples are no better: the best of them on pressure balls is Deshpande, at +0.6, whom RR has just released."));
C.push(p("Two names I left off on purpose: **Mujeeb Ur Rahman** (7th in my bowling list) and **Trent Boult**. Mujeeb is good value, but RR\u2019s spin is already well stocked with Bishnoi, Jadeja, Siddharth and Parag. Boult will cost more than this bracket."));
C.push(h2("The evidence: batters"));
C.push(table(["Player", "Hand", "Country", "Rank", "Pr. balls", "Pressure", "Pr. SR", "Pr. avg", "Death pr. SR (balls)", "Chase pr. avg", "+inns"],
  T.ev_bat, [2.6, 0.9, 1.6, 0.9, 0.9, 1.15, 1.0, 1.0, 1.7, 1.2, 0.95], { size: 15, left: 3 }));
C.push(gap());
C.push(b("**2. Daryl Mitchell** is the man for a chase. He averages 76 in pressure chases, comes out ahead in 64% of his pressure innings, and is better under pressure (+11.1) than in normal play (+5.0). He was not in an IPL 2026 squad."));
C.push(b("**5. Mark Chapman** has never been in an IPL squad. He is a left-hander who is +8.3 under pressure, with a strike rate of 145 that rises to 167 at the death (24 balls)."));
C.push(b("**6. Bevon Jacobs** is the hidden gem. He is a young New Zealand batter whom Mumbai bought for \u20B930 lakh in 2025 and released a year later. He is equally good under pressure and in normal play (+5.7 on both), comes out ahead in 71% of his pressure innings, and bats at about No. 5. With 60 pressure balls the sample is small, but at a base-price fee he is the kind of player RR can develop alongside Sooryavanshi."));
C.push(b("**7. Kamindu Mendis** cost Hyderabad \u20B975 lakh last season and has been released. He is a pressure specialist: +10.1 under pressure, a death strike rate of 219 (36 balls) and a pressure-chase average of 118. On normal balls, though, he is \u22128.6, which is why his overall rating is only just above average. He also bowls part-time spin."));
C.push(b("**9. Abishek Porel** would be the back-up keeper to Jurel. He is a left-hander who strikes at 153 under pressure and is about average there (+1.1)."));
C.push(b("**10. Shahrukh Khan** has the lowest rating of the ten (\u22124.1), so treat him as a role pick, not a ratings pick. He is above average under pressure (+2.1) and has faced 41 pressure balls at the death, which is the kind of work Hetmyer used to do. The Indian middle-order hitters in the pool are thin in this data, and none of them rates above average."));
C.push(h2("Four cautions"));
C.push(b(`**Watchlist players have small samples** (40 to 149 pressure balls). ${["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven"][T.n_watch_in_ten]} of the ten are on the watchlist. Their numbers are leads for the scouts, and I would not treat them as rankings.`));
C.push(b("**The Indian picks are where this data is thinnest.** The pack has no domestic cricket, so Indian players are judged on IPL balls alone. RR’s scouts should check Madhwal, Porel and Shahrukh Khan against their Syed Mushtaq Ali form."));
C.push(b("**Some picks have little or no IPL record.** Chapman and Jacobs have no IPL pressure balls in this data, and Mitchell, Little and Kamindu have fewer than 40. Their numbers come mostly from T20Is."));
C.push(b("**The auction list is not final yet.** The BCCI has not published the final player list. Released players will be in it if they register, but Mitchell, Chapman, Little and Jacobs, who were in no 2026 squad, should be checked when it comes out."));

C.push(h1("9. How far to trust this"));
C.push(p("I would rather be upfront about how solid these rankings are.", { keepNext: true }));
C.push(img("c5_rank_uncertainty.png", 14.6));
C.push(cap("Figure 5. Each player’s rank (dot), with a blue tick and a pink tick marking the two ends of the range it fell in across 80% of resamples."));
const fb = T.facts.bat, fw = T.facts.bowl, lo = Math.min(...fb.r8_10_boot, ...fw.r8_10_boot), hi = Math.max(...fb.r8_10_boot, ...fw.r8_10_boot);
C.push(b(`**Prediction on unseen matches:** ${f2(M.oos_bat["0.5"])} for batters and ${f2(M.oos_bowl["0.5"])} for bowlers. Those are not big numbers. Pressure performance is noisy whichever way you measure it. What matters is that this rating does nearly 50% better than the pressure-only version.`));
C.push(b(`**Resampling:** I redrew the ${M.matches} matches 400 times and ranked everyone again each time. The top five batters land in the top 10 at least ${Math.round(fb.top5_min_boot)}% of the time and the top five bowlers at least ${Math.round(fw.top5_min_boot)}%. Ranks 8 to 10 are between ${Math.round(lo)}% and ${Math.round(hi)}%, so they are not far ahead of the players just below them.`));
C.push(b(`**Moving the cut-off:** if I use the top 30% or the top 20% of balls instead of 25%, ${M.top10_overlap.bat_cut30} and ${M.top10_overlap.bat_cut20} of my top 10 batters stay, and ${M.top10_overlap.bowl_cut30} and ${M.top10_overlap.bowl_cut20} of my top 10 bowlers stay.`));
C.push(b(`**Consistency from match to match:** every bowler in the top 10 comes out ahead in at least half of his pressure spells. So does every batter except ${fb.below50.join(" and ")} (${Math.round(fb.min_pos_inn)}% of innings).`));
C.push(b(`**Looking forward in time:** I rated players using only matches before 2025 and compared that with how they did under pressure in 2025–26. For bowlers the link is positive (${sg(M.temporal_bowl.blend)}, from ${M.temporal_bowl.n_players} players). For batters it is ${sg(M.temporal_bat.blend)} (${M.temporal_bat.n_players} players), which is no better than chance. Batting form did not carry across that gap, so I have more faith in my bowling list than in my batting list.`));

C.push(h1("10. Limits"));
C.push(b("Even the better rating explains only a small part of future pressure performance. The ranking is an informed ordering and should be read that way."));
C.push(b("The pressure figure is shrunk harder than the normal one because there are fewer pressure balls. As a result each player’s pressure-versus-normal gap probably looks a bit worse than it is."));
C.push(b("The win-probability model knows nothing about the venue, the pitch, the quality of the two teams or who is at the crease."));
C.push(b("Only the striker and the bowler get credit. Fielding and partnerships are left out."));
C.push(b("The 25% cut-off, the 0.6 opposition weight and the shrinkage sizes are my own judgement calls. I tested the blend weight. I did not tune the others."));
C.push(b("The data pack has nothing on age, fitness, price or who will actually be in the auction. Section 8 uses the official retention lists of 17 November for the squad and the pool, and press reports for prices and registrations, which can be wrong."));

C.push(h1("11. Reproducing the work"));
C.push(p("Everything in this report, including the code, the charts, the full ranked tables for every eligible player and the auction watchlist, is in my GitHub repository:"));
C.push(new Paragraph({ spacing: { after: 120 }, children: [new ExternalHyperlink({ link: REPO, children: [new TextRun({ text: REPO, color: "0563C1", underline: {}, font: FONT })] })] }));
C.push(p("One Python script cleans the data, fits the win-probability model, computes leverage and the ratings, and runs the validation checks. It takes about a minute and uses fixed random seeds, so it gives the same answer every time. Two short scripts draw the figures and build the tables, and every number in the tables of this report is written by code from the results files."));
C.push(p("**Public information used in Section 8** (read on 16 to 18 November 2026): Yahoo Sports, CricTracker, Khel Now and The Tribune (ANI) on the official retained and released lists, RR\u2019s purse, slots and trades; Outlook India and The Federal on Blessing Muzarabani\u2019s KKR signing; The Papare on Kamindu Mendis\u2019s 2026 fee; Sports Digest on players unsold at the 2026 auction; Outlook India, CricketAddictor and SportsTak on the Bangladesh players and why they are left out; The Week and ESPNcricinfo on Gerald Coetzee\u2019s SRH replacement fee; the Mumbai Indians website and Wikipedia on Bevon Jacobs; and ESPNcricinfo on Mohit Sharma\u2019s retirement, which is why he is not a candidate."));

const doc = new Document({
  creator: "Romil", title: "Most Reliable Players Under Pressure",
  styles: { default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "H1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: "1F1F1F" }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "H2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, color: "1F1F1F" }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } }] },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 240 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Most Reliable Players Under Pressure  |  Page ", size: 16, color: "7F7F7F", font: FONT }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "7F7F7F", font: FONT })] })] }) },
    children: C }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
