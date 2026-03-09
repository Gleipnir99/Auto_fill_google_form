# ᚠ FormSolver — Bound by Gleipnir

Google Form 분석기 + 생성기. Claude AI 기반. GitHub Pages 배포용.

> *글레이프니르는 존재하지 않는 것들로 만들어진 사슬이다. 불가능한 것들이 가장 강하게 묶는다.*

---

## 🚀 배포

### GitHub Pages

1. 레포 Fork 또는 Clone
2. `Settings → Pages → Source: main / root` 저장
3. `https://<username>.github.io/form-solver-ai` 접속

### 로컬 실행

```bash
git clone https://github.com/<username>/form-solver-ai.git
cd form-solver-ai
python3 -m http.server 3000
# → http://localhost:3000
```

---

## 📖 사용법 — FormSolver (메인)

1. [console.anthropic.com](https://console.anthropic.com) 에서 API 키 발급
2. **I** — API 키 입력
3. **II** — 개인정보 입력 (이름, 학번 등, 선택)
4. **III** — Google Form URL + 컨텍스트 입력
5. `ᚲ 폼 분석 & 정답 생성` 클릭

---

## 🔥 The Forge — 숨겨진 폼 생성기

> 이 섹션은 개발자용입니다.

**접근 방법:** 메인 페이지 하단 footer의 `ᚠ` 룬 문자를 클릭.  
(opacity가 거의 0 — 존재를 알아야 찾을 수 있다)

**경로:** `/fenrir.html`

**기능:**
- 폼 목적·유형·문항 수 입력
- Claude AI가 완전한 Google Form 구조 자동 생성
- 미리보기 / JSON / 텍스트 3가지 형식으로 출력
- 정답 포함 시험 문항 생성 가능

---

## 📁 파일 구조

```
form-solver-ai/
├── index.html    # 메인 — Form 정답 생성기
├── style.css     # 공유 디자인 시스템 (Gleipnir & Fenrir 테마)
├── app.js        # 메인 로직
├── fenrir.html   # 히든 — Form 생성기 (The Forge)
└── README.md
```

---

## 🎨 디자인 시스템

**서사:** 글레이프니르(Gleipnir)와 펜리르(Fenrir) — 존재하지 않는 재료로 만들어진 마법의 리본이 세상에서 가장 강한 존재를 결박하는 이야기.

| 변수 | 색상 | 용도 |
|------|------|------|
| `--chain` | `#c8a84b` | 황금 사슬 — 주요 강조 |
| `--gleipnir` | `#8dd4d0` | 마법의 리본 — 완료/성공 |
| `--blood` | `#7a1e1e` | 펜리르의 영역 — 위험/경고 |
| `--parchment` | `#e8d9b8` | 양피지 — 기본 텍스트 |
| `--void` | `#1c1628` | 공허 — 깊은 배경 |

**폰트:**
- `Cinzel Decorative` — 타이틀
- `Cinzel` — UI 레이블
- `Crimson Text` — 본문

---

## ⚠️ 주의

- Anthropic API 사용 비용 발생 ([요금](https://www.anthropic.com/pricing))
- API 키는 브라우저 메모리에만 존재
- CORS 제한으로 일부 폼은 직접 파싱 불가 (Claude가 컨텍스트 기반 보완)

---

## 📄 License

MIT
