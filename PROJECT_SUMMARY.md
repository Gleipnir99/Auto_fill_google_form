# ⛓ Gleipnir & Fenrir — Project Summary

> 불가능한 것들로 짜인 사슬이 가장 강하다.

---

## 📁 프로젝트 구조

```
form-solver-ai/
├── index.html          # Gleipnir — PDF/PPT 자료 분석 & 정리
├── fenrir.html         # Fenrir — 구글 폼 AI 완성 미리보기  (secret)
├── settings.html       # Binding Chamber — 전체 설정        (secret)
├── shared.js           # 공통 유틸리티 (Claude API, 파일 처리, 토큰 추적)
├── style.css           # Norse 테마 디자인 시스템
├── favicon.svg         # 황금 사슬 아이콘 (index)
├── favicon-fenrir.svg  # 붉은 눈 늑대 아이콘 (fenrir)
└── favicon-settings.svg # 청록 모루 아이콘 (settings)
```

---

## 🌐 배포

- **URL**: `https://gleipnir99.github.io/form-solver-ai`
- **플랫폼**: GitHub Pages (Public repo, main/root)
- **GitHub**: `https://github.com/Gleipnir99/Auto_fill_google_form`

---

## 🔑 히든 페이지 접근

메인 페이지 푸터 맨 아래에 거의 투명한 룬 문자 2개가 숨겨져 있습니다:
- `ᚠ` (Fehu) → **fenrir.html** 이동
- `ᚢ` (Uruz) → **settings.html** 이동
- 또는 URL 직접 입력으로 접근 가능

---

## 📄 페이지별 기능

### index.html — Gleipnir (황금 사슬 배경)
- PDF / PPT / PPTX / DOC / DOCX / TXT 파일 업로드 (드래그 & 드롭)
- 여러 파일 동시 업로드 지원
- **정리 모드 3가지:**
  - 📋 핵심 요약 — 핵심 포인트 + 주요 개념 + 결론
  - 🔍 상세 정리 — 섹션별 깊이 있는 분석
  - 🌐 심층 조사 — 웹 검색으로 배경지식 추가 확장
- 마크다운 렌더링 결과 출력
- 전체 복사 기능

### fenrir.html — Fenrir's Eye (혈월 + 늑대 배경)
- 구글 폼 URL 입력
- Cloudflare Worker 프록시로 폼 파싱
- Claude AI가 **모든 문항에 답변 자동 생성**
- 개인정보 필드 → settings 저장값으로 자동 채움
- 완성된 폼 시각적 미리보기:
  - 객관식 → 라디오 버튼 선택 표시
  - 체크박스 → ✓ 표시
  - 척도 → 숫자 하이라이트
- "원본 보기" 탭 (iframe)
- 전체 답변 복사

### settings.html — Binding Chamber (청록 글로우 배경)
- **API 설정**: Anthropic API 키 저장/관리
- **모델 선택**: Sonnet 4 / Opus 4 / Haiku / 커스텀
- **기본 개인정보**: 이름, 학번, 소속, 학과, 이메일, 전화번호 등
- **답변 설정**: 기본 컨텍스트, 답변 근거 표시 여부
- **CORS 프록시**: Cloudflare Worker URL 설정 + 테스트
- **사용 통계**:
  - 💰 이번 기기 사용 금액 (토큰 기반 자동 계산)
  - 📊 입력/출력 토큰 수
  - 콘솔 잔여 크레딧 링크
- **위험 구역**: 데이터 초기화

---

## 🎨 디자인 시스템

### Norse/Gleipnir 테마
| 변수 | 값 | 용도 |
|------|-----|------|
| `--chain` | `#c8a84b` | 황금 사슬, 주요 액센트 |
| `--gleipnir` | `#8dd4d0` | 청록, 완료/성공 |
| `--blood` | `#7a1e1e` | 펜리르 영역, 위험 |
| `--parchment` | `#e8d9b8` | 본문 텍스트 |
| `--bg` | `#07060a` | 배경 |

### 폰트
- **Cinzel Decorative** — 타이틀
- **Cinzel** — UI 레이블
- **Crimson Text** — 본문

### 배경별 테마
- **index** — SVG 황금 사슬 패턴 + 대각선 결박 체인
- **fenrir** — 혈월(Blood Moon) + 늑대 실루엣 + 붉은 잔불
- **settings** — 청록 글로우 그라디언트

### Elder Futhark 룬 사용
`ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ`

---

## ⚙️ 기술 스택

| 항목 | 내용 |
|------|------|
| Frontend | Vanilla HTML/CSS/JS (프레임워크 없음) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| 파일 처리 | FileReader API (base64 + text) |
| 폼 파싱 | FB_PUBLIC_LOAD_DATA_ 파싱 |
| CORS 프록시 | Cloudflare Workers (무료) |
| 배포 | GitHub Pages |
| 저장소 | localStorage |

---

## 💰 Claude API 모델 단가

| 모델 | Input | Output |
|------|-------|--------|
| claude-sonnet-4-20250514 | $3.00/1M | $15.00/1M |
| claude-opus-4-6 | $15.00/1M | $75.00/1M |
| claude-haiku-4-5-20251001 | $0.25/1M | $1.25/1M |

---

## 🚀 초기 설정 가이드

### 1. Cloudflare Worker 생성 (fenrir 사용 시 필수)
1. [workers.cloudflare.com](https://workers.cloudflare.com) 무료 가입
2. Create Worker → 아래 코드 붙여넣기 → Deploy
```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('url required', { status: 400 });
    const res = await fetch(decodeURIComponent(target), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
```
3. `https://xxxx.workers.dev/?url=` 형태의 주소 복사

### 2. Settings 설정
1. 사이트 접속 → 푸터 `ᚢ` 룬 클릭 (또는 `/settings.html` 직접 입력)
2. Anthropic API 키 입력 + 저장 토글 ON
3. CORS 프록시 URL 입력 (Cloudflare Worker 주소)
4. 기본 개인정보 입력
5. **저장** 클릭

---

## 📝 Git 커밋 히스토리 요약

```
feat: Gleipnir & Fenrir Norse theme initial build
feat: fenrir form viewer - AI filled form preview
feat: settings page - API key, model, personal info, proxy
feat: PDF/PPT analyzer with AI summary modes
feat: chain background (index) + wolf/blood moon background (fenrir)
feat: page-specific favicons (chain / wolf / anvil)
feat: token usage + cost tracking in settings
feat: remove personal info section from main page
```

---

*Gleipnir cannot be broken.*
