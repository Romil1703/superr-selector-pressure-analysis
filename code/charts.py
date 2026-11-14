"""Charts for the report. Usage: python3 charts.py <out_dir>"""
import sys,json,pandas as pd,matplotlib;matplotlib.use("Agg");import matplotlib.pyplot as plt
O=sys.argv[1];E=pd.read_csv(f"{O}/batters_ranked.csv",index_col=0);F=pd.read_csv(f"{O}/bowlers_ranked.csv",index_col=0);L=pd.read_csv(f"{O}/li_sample.csv");M=json.load(open(f"{O}/meta.json"))
plt.rcParams.update({"font.size":10,"axes.spines.top":False,"axes.spines.right":False})
A,G,K="#000000","#9a9a9a","#000000"
L["over"]=(L.legal_before//6+1).clip(upper=20)
fig,ax=plt.subplots(figsize=(7,3))
for i,c in [(1,"#1E88E5"),(2,"#D81B60")]:
    s=L[L.innings==i].groupby("over").pressure.mean()*100; ax.plot(s.index,s.values,linestyle="none",marker="o",ms=4.5,color=c); ax.text(20.3,s.values[-1],f"Innings {i}",color=c,va="center",fontsize=9)
ax.set_xlim(0.5,23);ax.set_xlabel("Over");ax.set_ylabel("% of balls that are high-pressure");ax.set_xticks(range(1,21));fig.tight_layout();fig.savefig(f"{O}/c1_pressure_by_over.png",dpi=170)
for df,fn,lab in [(E,"c2_bat_top10.png","batters"),(F,"c3_bowl_top10.png","bowlers")]:
    t=df.head(10).iloc[::-1];fig,ax=plt.subplots(figsize=(7.4,3.7));y=range(len(t))
    ax.scatter(t.normal_rv100,y,color="#1E88E5",s=44,zorder=2,label="Normal balls");ax.scatter(t.pressure_rv100,y,color="#D81B60",s=44,zorder=3,label="Pressure balls");ax.scatter(t.rating,y,marker="D",color="#2E7D32",s=40,zorder=4,label="Rating (blend)")
    ax.set_yticks(list(y));ax.set_yticklabels([f"{int(r['rank'])}. {r['name']}" for _,r in t.iterrows()]);ax.grid(axis="y",color="#eeeeee",lw=.6);ax.set_axisbelow(True)
    ax.set_xlabel("Runs better than an average player, per 100 balls (shrunk)");ax.set_title(f"Top 10 {lab}: pressure vs normal level",loc="left",fontsize=11);ax.legend(frameon=False,fontsize=8,loc="lower right");fig.tight_layout();fig.savefig(f"{O}/{fn}",dpi=170)
fig,axs=plt.subplots(1,2,figsize=(7.4,2.9),sharey=True)
for ax,k,lab in [(axs[0],"oos_bat","Batters"),(axs[1],"oos_bowl","Bowlers")]:
    d=M[k];xs=list(d.keys());vals=list(d.values());ax.bar(xs,vals,color=["#1E88E5","#00897B","#2E7D32","#8E24AA","#D81B60"],width=.6,edgecolor=["black" if x=="0.5" else "none" for x in xs],linewidth=1.6)
    for i,v in enumerate(vals): ax.text(i,v+.005,f"{v:.2f}",ha="center",fontsize=8)
    ax.set_title(lab,loc="left",fontsize=10);ax.set_xlabel("Weight on pressure balls (1 = pressure only)")
axs[0].set_ylabel("Correlation with held-out\npressure performance");fig.tight_layout();fig.savefig(f"{O}/c4_validation.png",dpi=170)
fig,axs=plt.subplots(1,2,figsize=(7.4,3.4))
for ax,df,lab in [(axs[0],E,"Batters"),(axs[1],F,"Bowlers")]:
    t=df.head(15).iloc[::-1];y=range(len(t));ax.scatter(t.rank_lo,y,color="#1E88E5",s=30,marker="|");ax.scatter(t.rank_hi,y,color="#D81B60",s=30,marker="|");ax.scatter(t["rank"],y,c=list(y),cmap="viridis",s=30,zorder=3)
    ax.set_yticks(list(y));ax.set_yticklabels(t.name.str.replace("Namboori ",""),fontsize=7.5);ax.set_xlabel("Rank (dot) and 80% range (ticks)",fontsize=8.5);ax.set_title(lab,loc="left",fontsize=10)
fig.tight_layout();fig.savefig(f"{O}/c5_rank_uncertainty.png",dpi=170)
