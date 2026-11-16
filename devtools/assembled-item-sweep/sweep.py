# 조립 문항 레이아웃 추정 점검(ADR-0153) — SYLLABLE_BUILD · WORD_ORDER · LISTEN_BUILD 전 문항이 작은 화면에서 창고 · Check와
# 함께 서는지 추정합니다. 기기 렌더가 아니라 글꼴 폭(PIL) + 아래 가정으로 높이를 셉니다.
#
# 실행: python3 -m venv /tmp/v && /tmp/v/bin/pip install pillow
#       /tmp/v/bin/python devtools/assembled-item-sweep/sweep.py [수준 5 본문 폴더]
#   첫 인자가 없으면 내장본(apps/mobile/content/episodes)만 봅니다. 수준 5 본문은 버킷 사본 폴더를 넘깁니다.
#
# 가정(dp): 쓸 수 있는 높이 = 화면 − 안전 영역(Android 360×640 → 616 · iPhone SE 375×667 → 647 · 13 mini 375×812 → 728,
#   셋 모두 compact 밀도). 머리 88 · 아래 버튼 행 88 · 지시문 = 줄 수 × 28 + 16(heading 22/28) · 화면 좌우 여백 16.
#   음절 조립 무대 = 카드 위아래 48 + 뜻 24 + 16 + 칸 줄(5칸마다 64). 문장 · 듣고 조립 무대 = 위 줄(문장 줄 수 × 24, 듣기는 64)
#   + 16 + 답 줄(로마자가 서면 64, 아니면 128). 창고 = 줄 수 × 타일 높이(문장 조각 로마자 56 · 없음 46, 음절 56)
#   + 줄 사이 8 + 위 16. 힌트 줄 40(음절 · 문장 조립에 로마자가 설 때 포함, 듣고 조립 없음).
#   타일 폭 = max(한글 폭, 로마자 폭) + 좌우 패딩(문장 16 × 2 + 테두리 2, 음절 8 × 2, 하한 56).
#   판정: 작업 영역(쓸 수 있는 높이 − 머리 − 지시문 − 무대 − 버튼) < 96이면 껍데기가 한 스크롤로 합침, 창고보다 작으면 창고 스크롤.
#   모드: before(로마자 · 힌트 없음), after(듣고 조립은 첫 시도 = 로마자 없음 · 답 줄 둘), after-review(듣고 조립 다시 풀기 = 로마자 ·
#   답 줄 하나).
import json, glob, os, math, collections
from PIL import ImageFont
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
F=os.path.join(ROOT,"apps/android/app/src/main/assets/fonts")
def font(name,size): return ImageFont.truetype(f"{F}/{name}.ttf", size)
KO_CHIP=font("DuruSans",14); KO_SYL=font("DuruSans",22); ROMAN=font("DuruRoman",11)
INSTR=font("DuruSans",22); PROMPT=font("DuruSans",18)
w=lambda f,t: f.getlength(t)
SCREENS=[("Android 360×640",360,616),("iPhone SE",375,647),("13 mini",375,728)]
HEADER=88; ACTION=88; PAD=16; MERGE=96

def lines_of(f,text,width):
    words=text.split(); n=1; cur=0
    for wd in words:
        ww=w(f,wd+" ")
        if cur+ww>width and cur>0: n+=1; cur=ww
        else: cur+=ww
    return n

def bank_height(widths,height,avail,gap=8):
    rows=1; cur=0
    for x in widths:
        add=x+(gap if cur else 0)
        if cur and cur+add>avail: rows+=1; cur=x
        else: cur+=add
    return rows*height+(rows-1)*gap+16, rows

def item_rows(path):
    d=json.load(open(path)); ep=d.get('unit_id') or os.path.basename(path)
    for st in d['steps']:
        for it in st.get('items') or []:
            if it['type'] in ("SYLLABLE_BUILD","WORD_ORDER","LISTEN_BUILD"):
                yield ep,it

def evaluate(it,W,H,roman):
    t=it['type']; avail=W-2*PAD; content=W-2*PAD
    instr=(it.get('prompt') or {}).get('en') or "Build the sentence."
    head=HEADER+lines_of(INSTR,instr,content)*28+16
    tiles=it.get('tiles') or []
    show_roman = roman and all(x.get('roman') for x in tiles) and (t!="LISTEN_BUILD" or roman=="review")
    hint = roman and t!="LISTEN_BUILD"
    if t=="SYLLABLE_BUILD":
        ans=(it.get('answers') or [{}])[0].get('ko','').replace(' ','')
        slots=max(1,len(ans)); slot_rows=math.ceil(slots/5)
        stage=48+24+16+slot_rows*64
        widths=[max(56,max(w(KO_SYL,x['ko']), w(ROMAN,x.get('roman','')) if show_roman else 0)+16) for x in tiles]
        bank,rows=bank_height(widths,56,avail)
    else:
        if t=="WORD_ORDER":
            top=lines_of(PROMPT,(it.get('stimulus') or {}).get('en') or (it.get('answers') or [{}])[0].get('en',''),content)*24
        else:
            top=64
        compact_lines = show_roman  # 세 화면 모두 compact 밀도
        stage=top+16+(64 if compact_lines else 128)
        widths=[max(w(KO_CHIP,x['ko']), w(ROMAN,x.get('roman','')) if show_roman else 0)+32+2 for x in tiles]
        bank,rows=bank_height(widths,56 if show_roman else 46,avail)
    ws_need=bank+(40 if hint else 0)
    ws_view=H-head-stage-ACTION
    if ws_view<MERGE: state="merged"      # 셸이 한 스크롤로 합침(Check는 화면 안 · 창고는 스크롤로)
    elif ws_view<ws_need: state="bank-scroll"  # 창고가 작업 영역 안에서 스크롤
    else: state="fits"
    return state,rows,ws_view,ws_need

import sys
paths=sorted(glob.glob(os.path.join(ROOT,"apps/mobile/content/episodes/*.json")))
if len(sys.argv)>1: paths+=sorted(glob.glob(os.path.join(sys.argv[1],"*.json")))
items=[]
for p in paths:
    src="bundled" if "/content/episodes/" in p else "level-5"
    for ep,it in item_rows(p): items.append((src,ep,it))
out=collections.OrderedDict()
worst=[]
for name,W,H in SCREENS:
    for mode in ("before","after","after-review"):
        c=collections.Counter()
        for src,ep,it in items:
            if mode=="after-review" and it['type']!="LISTEN_BUILD": continue
            roman={"before":False,"after":True,"after-review":"review"}[mode]
            st,rows,view,need=evaluate(it,W,H,roman)
            c[st]+=1
            if mode!="before" and st!="fits": worst.append((name,mode,src,ep,it['id'],it['type'],st,rows,round(view),round(need)))
        out[f"{name} · {mode}"]=dict(c)
print("items", len(items), collections.Counter(t for _,_,it in items for t in [it['type']]))
for k,v in out.items(): print(k, v)
print("not fitting (after):", len(worst))
for row in worst[:40]: print(row)

print("--- 최소 여유(작업 영역 높이 − 필요 높이, dp) · 최대 창고 줄 수 ---")
for name,W,H in SCREENS:
    for mode in ("after","after-review"):
        roman={"after":True,"after-review":"review"}[mode]
        res=[(evaluate(it,W,H,roman),src,ep,it['id'],it['type']) for src,ep,it in items if mode=="after" or it['type']=="LISTEN_BUILD"]
        m=min(res,key=lambda r:r[0][2]-r[0][3])
        print(name,mode,"min slack",round(m[0][2]-m[0][3]),"at",m[1:],"max rows",max(r[0][1] for r in res))
