# 문의 데이터 product_name, utm_campaign 빈값 수정

## 증상

`marketing.inquiries` 테이블에 문의는 정상 저장되나 `product_name`, `utm_campaign` 컬럼이 항상 빈값(empty).

## 원인

WordPress `functions.php`에서 CF7 제출 데이터를 `$_GET`으로 가져오고 있음. CF7은 POST로 제출되므로 `$_GET`에 값이 없음.

```php
// 현재 (잘못된 코드)
'product'      => isset($_GET['your-insurance-name']) ? sanitize_text_field($_GET['your-insurance-name']) : '',
'utm_campaign' => isset($_GET['utm_campaign']) ? sanitize_text_field($_GET['utm_campaign']) : '',
```

CF7의 `default:get` 옵션은 URL 쿼리 파라미터를 hidden 필드 값으로 자동 세팅해주므로, `$data` (CF7 posted data)에서 읽어야 함.

## 수정사항

### 1. WordPress CF7 폼 (관리자 > Contact Forms > 해당 폼 편집)

`utm_campaign` hidden 필드에 `default:get` 추가.

```diff
- [hidden utm_campaign id:utm_campaign]
+ [hidden utm_campaign default:get id:utm_campaign]
```

> `your-insurance-name`은 이미 `default:get`이 적용되어 있어 변경 불필요.

### 2. WordPress functions.php (외모 > 테마 파일 편집기)

`$_GET` 대신 `$data`에서 값을 가져오도록 변경.

```diff
- 'product'      => isset($_GET['your-insurance-name']) ? sanitize_text_field($_GET['your-insurance-name']) : '',
- 'utm_campaign' => $utm_campaign,
+ 'product'      => isset($data['your-insurance-name']) ? sanitize_text_field($data['your-insurance-name']) : '',
+ 'utm_campaign' => isset($data['utm_campaign']) ? sanitize_text_field($data['utm_campaign']) : '',
```

`$utm_campaign` 변수 할당 코드(`$utm_campaign = isset($_GET['utm_campaign'])...`)도 더 이상 불필요하므로 삭제 가능.

## 수정 후 검증

1. 테스트 URL 접속: `https://thefirst.co.kr/submit/funeral-plan/?utm_campaign=powerContents&your-insurance-name=상조보험`
2. 문의 제출
3. Supabase `marketing.inquiries` 테이블에서 해당 row 확인
   - `product_name` = `상조보험`
   - `utm_campaign` = `powerContents`
