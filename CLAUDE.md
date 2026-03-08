# Jarvis - Hand Gesture Computer Control

손동작으로 컴퓨터를 제어하는 시스템.

## 기술 스택

- **Python 3.9+**
- **OpenCV** - 카메라 캡처 및 영상 처리
- **MediaPipe** - 손 랜드마크 감지
- **PyAutoGUI** - 마우스/키보드 제어
- **pynput** - 입력 장치 제어

## 프로젝트 구조

```
src/
  main.py              # 메인 실행 파일
  hand_tracker.py       # MediaPipe 손 추적
  gesture_recognizer.py # 제스처 인식
  controller.py         # 마우스/키보드 제어
  custom_gesture_manager.py  # 커스텀 제스처 관리
  overlay.py            # 카메라 OSD 오버레이
config/
  gestures.yaml         # 제스처 설정 및 매핑
```

## 실행 방법

```bash
pip install -r requirements.txt
cd src && python main.py
```

## 주요 명령어

- `pip install -r requirements.txt` - 의존성 설치
- `cd src && python main.py` - 실행
