import hashlib, hmac, os, secrets, sqlite3
from pathlib import Path
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

app=FastAPI(title="POSCO Community")
app.add_middleware(SessionMiddleware,secret_key=os.getenv("SESSION_SECRET","replace-in-production"))
DB=Path("posco.db")
CSS="""*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#092838;background:#f7fbfc}header{height:70px;padding:0 8%;display:flex;align-items:center;justify-content:space-between;background:white;border-bottom:1px solid #dbe6e8}header b{font-size:28px;letter-spacing:-1px}a{text-decoration:none;color:inherit}nav{display:flex;gap:22px;font-size:14px}main{min-height:calc(100vh - 140px)}.hero{padding:110px 10%;background:linear-gradient(120deg,#e0f2f6,#d8ede4)}h1{font-size:clamp(38px,6vw,75px);letter-spacing:-4px;margin:10px 0}.blue{color:#0072bc}.lead{max-width:540px;line-height:1.8;color:#49656e}.btn{display:inline-block;background:#0072bc;color:white;padding:13px 20px;border:0;margin-top:18px;cursor:pointer}.box{max-width:1000px;margin:70px auto;padding:0 24px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{background:#fff;padding:28px;border-top:4px solid #54a98a;min-height:170px}.card h3{font-size:21px}.form{background:white;max-width:460px;margin:70px auto;padding:38px;box-shadow:0 8px 30px #002b3b12}.form input,.form textarea{width:100%;padding:12px;margin:7px 0 15px;border:1px solid #ccdadd}.error{color:#b33;background:#fff1f1;padding:10px}.board-head{padding:65px 10%;background:#e6f4f6}.question{padding:23px 0;border-bottom:1px solid #d8e2e4}.question p{white-space:pre-wrap;color:#526b73}.meta{font-size:12px;color:#6c8087}footer{padding:25px 8%;background:#092838;color:#bcd0d6}@media(max-width:650px){.cards{grid-template-columns:1fr}nav{gap:10px}header{padding:0 20px}}"""
def conn():
 c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,password TEXT)");c.execute("CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY,title TEXT,content TEXT,author INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP)");return c
def pw(p,s=None):
 s=s or secrets.token_hex(16);return s+'$'+hashlib.pbkdf2_hmac('sha256',p.encode(),s.encode(),310000).hex()
def user(r):
 i=r.session.get('u');
 if not i:return None
 c=conn();x=c.execute('SELECT * FROM users WHERE id=?',(i,)).fetchone();c.close();return x
def page(r,body):
 u=user(r);auth=(f'<span>{u["username"]}님</span> <form style="display:inline" method="post" action="/logout"><button>로그아웃</button></form>' if u else '<a href="/login">로그인</a> <a href="/signup">회원가입</a>')
 return HTMLResponse(f'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POSCO</title><style>{CSS}</style><header><a href="/"><b>POSCO</b></a><nav><a href="/">기업소개</a><a href="/questions">질문 게시판</a>{auth}</nav></header><main>{body}</main><footer><b>POSCO</b><p>더 나은 세상을 향한 친환경 미래소재 기업 · 교육용 데모</p></footer></html>')
@app.get('/')
def home(r:Request):return page(r,'<section class="hero"><p>GREEN MATERIALS, BETTER TOMORROW</p><h1>철의 가능성으로<br><span class="blue">미래를 만듭니다.</span></h1><p class="lead">포스코는 친환경 철강과 미래소재로 지속가능한 내일의 기준을 세웁니다.</p><a class="btn" href="/questions">질문 게시판 바로가기 →</a></section><section class="box"><p>OUR BUSINESS</p><h2>미래를 움직이는 세 가지 힘</h2><div class="cards"><div class="card"><h3>친환경 철강</h3><p>저탄소 생산 체계와 혁신 기술로 더 강한 철강을 만듭니다.</p></div><div class="card"><h3>이차전지 소재</h3><p>전기차 시대의 에너지를 채우는 소재 사업을 확장합니다.</p></div><div class="card"><h3>그린 에너지</h3><p>수소와 재생에너지로 깨끗한 전환을 이끕니다.</p></div></div></section>')
@app.get('/signup')
def signup(r:Request):return page(r,'<div class="form"><h2>회원가입</h2><form method="post"><input name="username" placeholder="아이디" required><input name="password" type="password" placeholder="비밀번호 (6자 이상)" required><button class="btn">가입하기</button></form></div>')
@app.post('/signup')
def signup_post(r:Request,username:str=Form(...),password:str=Form(...)):
 if len(username)<3 or len(password)<6:return page(r,'<div class="form"><p class="error">아이디 3자, 비밀번호 6자 이상 입력해 주세요.</p><a href="/signup">돌아가기</a></div>')
 c=conn()
 try:c.execute('INSERT INTO users(username,password) VALUES(?,?)',(username,pw(password)));c.commit();r.session['u']=c.execute('SELECT id FROM users WHERE username=?',(username,)).fetchone()[0]
 except sqlite3.IntegrityError:return page(r,'<div class="form"><p class="error">이미 사용 중인 아이디입니다.</p></div>')
 finally:c.close()
 return RedirectResponse('/',303)
@app.get('/login')
def login(r:Request):return page(r,'<div class="form"><h2>로그인</h2><form method="post"><input name="username" placeholder="아이디" required><input name="password" type="password" placeholder="비밀번호" required><button class="btn">로그인</button></form></div>')
@app.post('/login')
def login_post(r:Request,username:str=Form(...),password:str=Form(...)):
 c=conn();x=c.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone();c.close()
 if not x or not hmac.compare_digest(pw(password,x['password'].split('$')[0]),x['password']):return page(r,'<div class="form"><p class="error">아이디 또는 비밀번호를 확인해 주세요.</p></div>')
 r.session['u']=x['id'];return RedirectResponse('/',303)
@app.post('/logout')
def logout(r:Request):r.session.clear();return RedirectResponse('/',303)
@app.get('/questions')
def questions(r:Request):
 c=conn();qs=c.execute('SELECT q.*,u.username FROM questions q JOIN users u ON q.author=u.id ORDER BY q.id DESC').fetchall();c.close();items=''.join(f'<article class="question"><h3>{q["title"]}</h3><p>{q["content"]}</p><span class="meta">{q["username"]} · {q["created"][:10]}</span></article>' for q in qs) or '<p>아직 질문이 없습니다.</p>'
 return page(r,f'<section class="board-head"><h1>질문 게시판</h1><p>포스코에 관한 궁금한 점을 남겨 주세요.</p><a class="btn" href="/questions/new">질문 작성</a></section><section class="box">{items}</section>')
@app.get('/questions/new')
def new(r:Request):return RedirectResponse('/login',303) if not user(r) else page(r,'<div class="form"><h2>질문 작성</h2><form method="post" action="/questions"><input name="title" placeholder="제목" required><textarea name="content" rows="7" placeholder="내용" required></textarea><button class="btn">등록</button></form></div>')
@app.post('/questions')
def post(r:Request,title:str=Form(...),content:str=Form(...)):
 u=user(r)
 if not u:return RedirectResponse('/login',303)
 c=conn();c.execute('INSERT INTO questions(title,content,author) VALUES(?,?,?)',(title,content,u['id']));c.commit();c.close();return RedirectResponse('/questions',303)
