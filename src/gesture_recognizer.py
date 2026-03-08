"""
Gesture Recognizer - 손 랜드마크 기반 제스처 인식 모듈
"""

from dataclasses import dataclass
from collections import deque


@dataclass
class Gesture:
    """인식된 제스처 정보"""
    name: str
    confidence: float
    position: tuple  # (x, y) 정규화 좌표
    fingers: list  # 손가락 상태
    extra: dict  # 추가 데이터 (방향, 거리 등)


class GestureRecognizer:
    """손가락 상태 및 손 움직임 기반 제스처 인식"""

    def __init__(self, hold_frames=3, click_threshold=0.05, swipe_threshold=0.08):
        self.hold_frames = hold_frames
        self.click_threshold = click_threshold
        self.swipe_threshold = swipe_threshold

        # 제스처 안정화용 히스토리
        self._gesture_history = deque(maxlen=hold_frames)
        # 스와이프 감지용 위치 히스토리
        self._position_history = deque(maxlen=10)
        # 드래그 상태
        self._dragging = False

    def recognize(self, tracker):
        """
        HandTracker에서 현재 제스처를 인식
        Returns: Gesture 또는 None
        """
        fingers = tracker.get_finger_states()
        if fingers is None:
            self._gesture_history.clear()
            self._dragging = False
            return None

        index_pos = tracker.get_landmark(tracker.INDEX_TIP)
        if index_pos is None:
            return None

        position = (index_pos[0], index_pos[1])
        self._position_history.append(position)

        gesture_name = self._classify_gesture(fingers, tracker)

        # 제스처 안정화: hold_frames 동안 같은 제스처여야 인식
        self._gesture_history.append(gesture_name)
        if len(self._gesture_history) < self.hold_frames:
            return None

        if len(set(self._gesture_history)) != 1:
            return None

        extra = {}
        if gesture_name in ("scroll_up", "scroll_down"):
            extra["direction"] = gesture_name.split("_")[1]
        elif gesture_name in ("volume_up", "volume_down"):
            extra["thumb_direction"] = tracker.get_thumb_direction()
        elif gesture_name == "drag":
            extra["dragging"] = True
            self._dragging = True

        return Gesture(
            name=gesture_name,
            confidence=1.0,
            position=position,
            fingers=fingers,
            extra=extra,
        )

    def _classify_gesture(self, fingers, tracker):
        """손가락 상태로 제스처 분류"""
        thumb, index, middle, ring, pinky = fingers

        # 주먹 = 탭 닫기
        if fingers == [0, 0, 0, 0, 0]:
            return "close_tab"

        # 엄지만 = 볼륨 제어
        if thumb and not index and not middle and not ring and not pinky:
            direction = tracker.get_thumb_direction()
            if direction == "up":
                return "volume_up"
            elif direction == "down":
                return "volume_down"
            return "idle"

        # 검지만 = 마우스 이동
        if not thumb and index and not middle and not ring and not pinky:
            return "mouse_move"

        # 엄지 + 검지 = 드래그 (핀치 거리 확인)
        if thumb and index and not middle and not ring and not pinky:
            dist = tracker.get_distance(tracker.THUMB_TIP, tracker.INDEX_TIP)
            if dist is not None and dist < self.click_threshold * 2:
                return "drag"
            return "mouse_move"

        # 검지 + 중지 = 클릭 (두 손가락 거리 확인)
        if not thumb and index and middle and not ring and not pinky:
            dist = tracker.get_distance(tracker.INDEX_TIP, tracker.MIDDLE_TIP)
            if dist is not None and dist < self.click_threshold:
                return "left_click"
            return "mouse_move"

        # 검지 + 중지 + 약지 = 우클릭
        if not thumb and index and middle and ring and not pinky:
            dist = tracker.get_distance(tracker.INDEX_TIP, tracker.MIDDLE_TIP)
            if dist is not None and dist < self.click_threshold:
                return "right_click"
            return "idle"

        # 검지 + 새끼 (록 제스처) = 탭 전환
        if not thumb and index and not middle and not ring and pinky:
            return "tab_switch"

        # 손바닥 펴기 = 스크롤
        if all(fingers):
            swipe = self._detect_swipe()
            if swipe == "up":
                return "scroll_up"
            elif swipe == "down":
                return "scroll_down"
            return "idle"

        return "idle"

    def _detect_swipe(self):
        """위치 히스토리로 스와이프 방향 감지"""
        if len(self._position_history) < 5:
            return None

        start = self._position_history[-5]
        end = self._position_history[-1]
        dy = end[1] - start[1]

        if abs(dy) > self.swipe_threshold:
            return "up" if dy < 0 else "down"
        return None

    def reset(self):
        """상태 초기화"""
        self._gesture_history.clear()
        self._position_history.clear()
        self._dragging = False
