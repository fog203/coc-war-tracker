# CoC War Tracker

**Node.js와 Google Sheets API를 활용한 클래시 오브 클랜 클랜전 참가 현황 자동화 프로젝트**

## 프로젝트 소개

클랜원들의 클랜전 참가 설정을 수동으로 확인하는 반복 작업을 줄이기 위해 개발한 프로그램입니다.

Google Sheets에서 새로고침 버튼을 클릭하면 Node.js 프로그램이 요청을 감지하고, Clash of Clans API에서 최신 정보를 조회하여 스프레드시트에 자동 반영합니다.

## 기술 스택

- **Language:** JavaScript
- **Runtime:** Node.js
- **API:** Clash of Clans REST API, Google Sheets API
- **Automation:** Google Apps Script
- **Authentication:** API Token, Google Service Account

## 주요 기능

- 2개 클랜의 클랜원 정보 조회
- 클랜전 참가 및 불참 상태 확인
- 마을회관 레벨 기준 내림차순 정렬
- 불참 인원 배경색 자동 표시
- 클랜별 전체 인원 및 참가·불참 인원 집계
- Google Sheets 버튼을 통한 새로고침 요청
- 10초 간격 폴링을 통한 요청 감지
- 업데이트 완료 및 오류 상태 표시

## 시스템 구조

```text
Google Sheets 새로고침 버튼
          ↓
Google Apps Script
          ↓
설정 시트에 요청 상태 기록
          ↓
Node.js (watch.js)
          ↓
Clash of Clans API 호출 (sheet.js)
          ↓
Google Sheets API
          ↓
스프레드시트 데이터 업데이트
```

## 구현 과정 및 문제 해결

### 1. CoC API IP 제한

CoC API는 등록된 IP에서만 요청할 수 있어, 로컬 Node.js 프로그램에서 API를 호출하도록 구성했습니다.

### 2. Google Sheets와 Node.js 연동

Google Apps Script에서 로컬 프로그램을 직접 실행할 수 없으므로, 스프레드시트의 설정 셀을 요청 전달 수단으로 사용했습니다.

`watch.js`가 10초마다 요청 상태를 확인하고, 새로고침 요청이 있으면 `sheet.js`를 실행합니다
