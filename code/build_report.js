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
C.push(p("For Rajasthan Royals the message is fairly blunt: the squad lacks bowlers who hold their nerve in tight overs, and it lacks a finisher in the middle order. RR also has one of the smallest purses going into the auction, so Section 8 looks past the star names and picks out lesser-known players the data rates under pressure and RR could realistically sign."));

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
C.push(b(`${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][T.facts.spin_in_top10]} of the ten are spinners. I do not think that is a quirk. Most pressure balls come in chases and through the middle overs, and that is where a good spinner takes hold of a game.`));

C.push(h1("8. What this means for Rajasthan Royals"));
C.push(h2("The auction, and what RR can afford"));
C.push(p("The IPL 2027 auction is a one-day mini-auction in Goa on 16 December 2026. Franchises have until 17 November to hand in their retained and released lists, so as I write this (16 November) no official list exists. Two public facts shape this section."));
C.push(b("**RR were close.** They finished fourth, won the Eliminator and lost Qualifier 2 to Gujarat Titans. The match file in the data pack shows the same."));
C.push(b("**RR have very little room.** Their purse is reported at about ₹7.65 crore before any releases, with all 25 squad places and all eight overseas slots filled. They have to release players before they can bid at all, and even then they will be shopping at the cheaper end of the market."));
C.push(p("So I have not listed Hazlewood, Klaasen or Tim David as targets. They sit near the top of my rankings, but they are expected to be retained and are far beyond this purse. I looked for lesser-known players who meet three tests: no franchise held them in IPL 2026 according to the squad file, nothing bars them from playing (so no Pakistan players), and they have a pressure record in this data that anyone can check in my results files."));
C.push(h2("Where the squad is short"));
C.push(p(`Below is every Royals player who qualifies, ranked against all ${M.elig_bat} eligible batters and ${M.elig_bowl} eligible bowlers.`, { keepNext: true }));
C.push(table(["RR batter", "Rank", "Pressure", "Normal", "Pr. SR"], T.rrbat, [3, 1, 1.2, 1.2, 1.2], { frac: 0.6, size: 18 }));
C.push(gap());
C.push(table(["RR bowler", "Rank", "Pressure", "Normal", "Pr. econ", "Death pr. econ (balls)"], T.rrbowl, [3, 1, 1.2, 1.2, 1.2, 2.2], { frac: 0.78, size: 18 }));
C.push(gap());
C.push(p(`**Bowling under pressure is the weak spot.** Not one Royals bowler is in the top 40, and ${["none", "one", "two", "three", "four", "all five"][T.facts.rr_bowl_below_avg_pressure]} of the five are below average on pressure balls. The back-up seamers do not change the picture: Milne, Burger, Deshpande and Maphaka have too few pressure balls to be ranked, and all four have below-average ratings on the balls they do have. Published previews of RR’s auction say the same from the outside and name death bowling as the first priority.`));
C.push(p("**The top order is settled; the middle is not.** Sooryavanshi is first and Jaiswal is 20th. Hetmyer, Shanaka and Jadeja sit around 40th, and Jurel and Parag are 53rd and 58th, both below average on pressure balls."));
C.push(h2("Widening the net: a watchlist"));
C.push(p("My ranking needs 150 pressure balls. That bar is right for a top 10, but it hides exactly the kind of player a team with a small purse should be looking at. For this section only, I ran the same rating on players with 60 to 149 pressure balls and at least 8 matches. That adds 81 batters and 77 bowlers. They are **not** part of my ranking. In the tables below a rank in brackets shows where a watchlist player’s rating would sit in the main list. The shrinkage is unchanged, so a thin record cannot produce a big rating."));
C.push(h2("Need 1: a bowler for the tight overs"));
const wB = [2.5, 1.9, 1.7, 0.9, 0.9, 1.15, 1.8, 1.7, 1.7, 1.0];
C.push(table(["Target", "Type", "Country", "Rank", "Pr. balls", "Pressure", "Econ pr. / normal", "Death pr. econ (balls)", "Powerplay pr. econ (balls)", "+spells"],
  T.tg_pace.concat(T.tg_spin.slice(0, 2)), wB, { size: 15, left: 3, groups: { 0: "Pace", [T.tg_pace.length]: "Spin" } }));
C.push(gap());
C.push(b("**Taskin Ahmed** would be my first call. He bowls fast, goes at 7.0 an over under pressure against 8.3 normally, and concedes 7.5 in death-over pressure. That is precisely where Archer (9.4) and Sandeep Sharma (12.4) have been expensive. He is one of seven Bangladesh players reported to have registered for this auction."));
C.push(b("**Hasan Mahmud** is the cheaper version of the same idea, and also on that list of seven. He has 103 pressure balls, so he is a watchlist player: 6.8 an over under pressure against 8.2 normally, and ahead in 71% of his spells. His death figure (6.2) comes from only 24 balls, and his last match in this data is June 2025, so his current form needs checking."));
C.push(b("**Josh Little** is a left-arm quick who is better under pressure (+9.0) than out of it. He spent two seasons at Gujarat Titans, so the IPL is not new to him."));
C.push(b("**Mark Adair** is a powerplay bowler: 72% of his pressure balls come there and he goes at 6.7. I would not buy him for the death, where he goes at 10.2."));
C.push(b("**Fazalhaq Farooqi** splits opinion in my own numbers: +10.9 under pressure, −11.0 otherwise. RR had him in 2025 and know him better than my data does. Worth it at base price only."));
C.push(b("**Mujeeb Ur Rahman** is the highest-ranked bowler outside the IPL 2026 squads (7th). He bowls 61% of his pressure balls in the powerplay, and having him take those overs would let RR save Archer for the end. **Sikandar Raza** offers tidy off-spin (6.8 under pressure) and middle-order batting in one overseas slot."));
C.push(p("One name is missing on purpose. **Mahedi Hasan** is 8th in my bowling list, but he is not among the seven Bangladesh players reported as registered, so I have left him off. The Bangladesh picks also carry a risk that has nothing to do with cricket: the BCCI told KKR to release Mustafizur Rahman before IPL 2026, and reports say franchises are still cautious. If that door stays shut, Little and Adair are the fallback."));
C.push(h2("Need 2: a middle-order finisher"));
const wT = [2.6, 0.9, 1.7, 0.9, 0.9, 1.15, 1.0, 1.0, 1.7, 1.2, 0.95];
C.push(table(["Target", "Hand", "Country", "Rank", "Pr. balls", "Pressure", "Pr. SR", "Pr. avg", "Death pr. SR (balls)", "Chase pr. avg", "+inns"], T.tg_bat, wT, { size: 15, left: 3 }));
C.push(gap());
C.push(b("**Daryl Mitchell** is the man for a chase. He averages 76 in pressure chases, comes out ahead in 64% of his pressure innings, and is one of the few players whose pressure level (+11.1) is higher than his normal one (+5.0). He is the biggest name here, but he entered the last auction at a ₹2 crore base price and was not in an IPL 2026 squad."));
C.push(b("**Mark Chapman** has never been in an IPL squad. He is a left-hander who is +8.3 under pressure, with a strike rate of 145 that rises to 167 at the death (24 balls)."));
C.push(b("**George Dockrell** has the highest pressure level of any available batter (+15.5): a strike rate of 163, ahead in 80% of his innings, and dismissed no more than once in 94 pressure balls. He is a watchlist player and has never been near the IPL, so this is a base-price punt and no more."));
C.push(b("**Towhid Hridoy** holds an innings together (average 85, ahead in 66% of innings) but strikes at 124. He steadies a chase; he does not finish one. He is on the list of seven registered Bangladesh players."));
C.push(b("**Bhanuka Rajapaksa** is a specialist. He is +10.7 under pressure with a death strike rate of 203, but −19.1 the rest of the time. A late-overs cameo option only."));
C.push(h2("A trade rumour, tested"));
C.push(p("Reports have linked Sam Curran with a swap for RCB’s Romario Shepherd. Neither franchise has confirmed it. On my numbers Curran is RR’s lowest-ranked player on both lists (79th of 86 batters, 89th of 92 bowlers), so moving him makes sense. Shepherd would not fix the pressure problem, though. He is a huge +39.5 with the bat on normal balls, but on his 113 pressure balls he is −5.0, striking at 134 and averaging 12, and with the ball he is 91st of 92. He would lift RR in ordinary overs and leave the tight ones as they are."));
C.push(h2("Four cautions"));
C.push(b("**Watchlist players have small samples** (60 to 149 pressure balls). Their numbers are leads for the scouts, and I would not treat them as rankings."));
C.push(b("**Taskin, Hasan Mahmud, Adair, Chapman and Dockrell have no IPL balls in this data.** Everything I know about them is from T20Is, and they should be priced with that in mind."));
C.push(b("**Availability is my best reading** of the squad file and press reports on 16 November. The shortlist should be run again once the official pool is out. My results files list every player with his 2026 team, so that is a quick job."));
C.push(b("**Andre Russell and Mohammad Nawaz** have earned their places in my top 10s on the numbers, but they are not realistic signings. Russell was not in an IPL 2026 squad, and Pakistan players have not appeared in the IPL since 2008."));

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
C.push(b("The data pack has nothing on age, fitness, price or who will actually be in the auction. Section 8 leans on press reports for those, and reports ahead of a retention deadline can be wrong."));

C.push(h1("11. Reproducing the work"));
C.push(p("Everything in this report, including the code, the charts, the full ranked tables for every eligible player and the auction watchlist, is in my GitHub repository:"));
C.push(new Paragraph({ spacing: { after: 120 }, children: [new ExternalHyperlink({ link: REPO, children: [new TextRun({ text: REPO, color: "0563C1", underline: {}, font: FONT })] })] }));
C.push(p("One Python script cleans the data, fits the win-probability model, computes leverage and the ratings, and runs the validation checks. It takes about a minute and uses fixed random seeds, so it gives the same answer every time. Two short scripts draw the figures and build the tables, and every number in the tables of this report is written by code from the results files."));
C.push(p("**Public information used in Section 8** (all read on 16 November 2026): ESPNcricinfo’s reporting of the auction date and retention deadline, as carried by Outlook India and Deccan Chronicle; Sporting News (via Yahoo Sports) on RR’s purse, squad slots and the Curran–Shepherd reports; Outlook India and Cricket Times on the seven registered Bangladesh players; Wisden’s IPL 2026 auction base-price list; and RR auction previews by CricketAddictor and myKhel."));

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
