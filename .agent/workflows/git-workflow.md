---
description: 새로운 기능/버그 수정 작업 시작 시 따라야 할 워크플로우
---

# GitHub Issues + PR 워크플로우

## 1. 작업 시작 전 (필수)

### Issue 생성

```
GitHub → Issues → New issue
```

제목 형식:

- `[기능] 사용자 드롭다운 메뉴 추가`
- `[버그] 로그인 시 Access Denied 오류`
- `[개선] 고객 필터 UI 개선`

본문에 포함할 내용:

- [ ] 목표
- [ ] 세부 작업 체크리스트
- [ ] 관련 파일/컴포넌트

---

## 2. 브랜치 생성

```bash
git checkout main
git pull
git checkout -b feature/이슈번호-간단한설명
# 예: git checkout -b feature/15-user-dropdown
```

---

## 3. 작업 중

커밋 메시지 형식:

```
<type>(<scope>): <설명>

- 세부 변경사항 1
- 세부 변경사항 2

Refs #이슈번호
```

타입:

- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서
- `refactor`: 리팩토링
- `chore`: 설정/빌드

---

## 4. 작업 완료 후

// turbo

### PR 생성

```bash
git push -u origin feature/이슈번호-간단한설명
```

GitHub에서 PR 생성:

- 제목: `[기능] 사용자 드롭다운 메뉴 추가 (#15)`
- 본문: 변경사항 요약, 스크린샷
- `Closes #15` 추가 (머지 시 이슈 자동 종료)

---

## 5. 머지

- PR 리뷰 후 `Squash and merge` 권장
- GitHub에서 브랜치 삭제

---

## 6. PR 완료 후 정리 (필수)

### 로컬 브랜치 정리

```bash
git checkout main
git pull origin main
git branch -d feature/이슈번호-간단한설명
```

### 작업 기록

- [ ] 완료된 작업 내용을 체크리스트에 기록
- [ ] 관련 이슈 닫힘 확인

---

## 체크리스트

작업 시작 전:

- [ ] Issue 생성했나?
- [ ] 브랜치 생성했나?

작업 완료 후:

- [ ] PR 생성했나?
- [ ] Issue 번호 연결했나?

PR 머지 후:

- [ ] 로컬 브랜치 삭제했나?
- [ ] 작업 내용 기록했나?
