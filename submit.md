[hidden your-subject "퍼스트 보험상담"]

<label> 이름*
    [text* your-name autocomplete:name] </label>

<label> 연락처*
    [tel* your-phone class:your_phone minlength:13 "010-"] </label>

<label> 생년월일*
    [text* your-birthday class:your_birthday minlength:10 maxlength:10 placeholder "YYYY-MM-DD"] </label>

<label style="float:left; margin-top: 3px;"> 성별* :</label> [radio your-sex use_label_element "남성" "여성"]

<label> 요청사항
    [textarea your-request x3 class:your_request]</label>

[hidden your-insurance-name default:get "간병비보험"]
[hidden referer-page id:referer-page]
[hidden utm_campaign id:utm_campaign]

<label>[acceptance your-accept default:on] 개인정보제공에 동의합니다. <a href="https://thefirst.co.kr/privacy/" style="font-size: 14px; margin-left: 5px;"><strong>자세히 보기</strong></a>[/acceptance]</label>

<!--<label>[acceptance your-accept default:on] 개인정보제공에 동의합니다. <a href="#" class="modalPolicy" style="font-size: 14px; margin-left: 5px;"><strong>자세히 보기</strong></a>[/acceptance]</label>-->

[submit "신청하기"]