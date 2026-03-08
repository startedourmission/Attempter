"""
Jarvis - 손동작 기반 컴퓨터 제어 시스템
메인 실행 파일
"""

import sys
import time
import cv2
import yaml

from hand_tracker import HandTracker
from gesture_recognizer import GestureRecognizer
from controller import Controller
from custom_gesture_manager import CustomGestureManager
from overlay import Overlay


def load_config():
    """설정 파일 로드"""
    manager = CustomGestureManager()
    return manager.get_recognition_config(), manager


def register_custom_gesture_interactive(manager, controller):
    """터미널에서 커스텀 제스처를 대화형으로 등록"""
    print("\n=== 커스텀 제스처 등록 ===")
    name = input("제스처 이름: ").strip()
    if not name:
        print("취소됨")
        return

    print("손가락 패턴 입력 (엄지/검지/중지/약지/새끼)")
    print("예: 1 0 1 0 1 = 엄지+중지+새끼 펴기")
    pattern_str = input("패턴 (5개 숫자, 공백 구분): ").strip()
    try:
        pattern = [int(x) for x in pattern_str.split()]
        if len(pattern) != 5:
            raise ValueError
    except ValueError:
        print("잘못된 패턴입니다")
        return

    print("액션 타입: hotkey / type")
    action_type = input("타입: ").strip()
    if action_type not in ("hotkey", "type"):
        print("잘못된 타입입니다")
        return

    if action_type == "hotkey":
        keys = input("키 조합 (공백 구분, 예: ctrl shift s): ").strip().split()
        action_data = keys
    else:
        action_data = input("입력할 텍스트: ").strip()

    desc = input("설명 (선택): ").strip()

    try:
        manager.add_gesture(name, pattern, action_type, action_data, desc)
        controller.register_gesture(name, action_type, action_data)
        print(f"'{name}' 제스처가 등록되었습니다!")
    except ValueError as e:
        print(f"오류: {e}")


def print_help():
    """도움말 출력"""
    print("""
╔══════════════════════════════════════════════╗
║           JARVIS - Hand Gesture Control       ║
╠══════════════════════════════════════════════╣
║                                               ║
║  기본 제스처:                                 ║
║  ☝️  검지만 펴기      → 마우스 이동           ║
║  ✌️  검지+중지 모으기  → 좌클릭               ║
║  🤟 검지+중지+약지    → 우클릭               ║
║  👍 엄지 위로         → 볼륨 업               ║
║  👎 엄지 아래로       → 볼륨 다운             ║
║  🤘 검지+새끼         → 탭 전환               ║
║  ✊ 주먹 쥐기         → 탭 닫기               ║
║  🖐️  손바닥+위로 밀기  → 스크롤 업            ║
║  🖐️  손바닥+아래 밀기  → 스크롤 다운          ║
║  👌 엄지+검지 핀치    → 드래그                ║
║                                               ║
║  키보드:                                      ║
║  Q: 종료  C: 커스텀 제스처 등록  H: 도움말    ║
║                                               ║
╚══════════════════════════════════════════════╝
""")


def main():
    """메인 루프"""
    print("🤖 Jarvis 시작 중...")

    # 설정 로드
    config, gesture_manager = load_config()

    # 모듈 초기화
    tracker = HandTracker(
        detection_confidence=config.get("min_detection_confidence", 0.7),
        tracking_confidence=config.get("min_tracking_confidence", 0.6),
    )
    recognizer = GestureRecognizer(
        hold_frames=config.get("gesture_hold_frames", 3),
        click_threshold=config.get("click_distance_threshold", 0.05),
        swipe_threshold=config.get("swipe_threshold", 0.08),
    )
    controller = Controller(
        screen_margin=config.get("screen_margin", 0.1),
        smoothing_factor=config.get("smoothing_factor", 5),
    )
    overlay = Overlay()

    # 저장된 커스텀 제스처 로드
    for name, info in gesture_manager.get_custom_gestures().items():
        controller.register_gesture(name, info["action"], info["data"])

    # 카메라 열기
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("카메라를 열 수 없습니다!")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print_help()
    print("카메라 준비 완료. 손을 보여주세요!")

    prev_time = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # 좌우 반전 (거울 모드)
            frame = cv2.flip(frame, 1)

            # FPS 계산
            current_time = time.time()
            fps = 1.0 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0
            prev_time = current_time

            # 손 추적
            gesture = None
            action_result = None

            if tracker.process(frame):
                tracker.draw(frame)
                gesture = recognizer.recognize(tracker)
                if gesture:
                    action_result = controller.execute(gesture)

            # 오버레이 그리기
            frame = overlay.draw(frame, gesture, action_result, fps)

            # 화면 표시
            cv2.imshow("Jarvis", frame)

            # 키 입력 처리
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("c"):
                register_custom_gesture_interactive(gesture_manager, controller)
            elif key == ord("h"):
                print_help()

    except KeyboardInterrupt:
        print("\n종료합니다...")
    finally:
        tracker.release()
        cap.release()
        cv2.destroyAllWindows()
        print("Jarvis 종료")


if __name__ == "__main__":
    main()
