"""
Hand Tracker - MediaPipe 기반 손 인식 및 랜드마크 추적 모듈
"""

import cv2
import mediapipe as mp
import numpy as np


class HandTracker:
    """MediaPipe Hands를 사용한 실시간 손 추적"""

    # MediaPipe 손 랜드마크 인덱스
    WRIST = 0
    THUMB_TIP = 4
    INDEX_TIP = 8
    MIDDLE_TIP = 12
    RING_TIP = 16
    PINKY_TIP = 20

    THUMB_MCP = 2
    INDEX_MCP = 5
    MIDDLE_MCP = 9
    RING_MCP = 13
    PINKY_MCP = 17

    INDEX_PIP = 6
    MIDDLE_PIP = 10
    RING_PIP = 14
    PINKY_PIP = 18

    def __init__(self, detection_confidence=0.7, tracking_confidence=0.6, max_hands=1):
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence,
        )
        self.landmarks = None
        self.handedness = None

    def process(self, frame):
        """프레임에서 손을 감지하고 랜드마크를 반환"""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)

        self.landmarks = None
        self.handedness = None

        if results.multi_hand_landmarks and results.multi_handedness:
            self.landmarks = results.multi_hand_landmarks[0]
            self.handedness = results.multi_handedness[0].classification[0].label
            return True
        return False

    def get_landmark(self, index):
        """특정 랜드마크의 정규화된 좌표 반환 (x, y, z)"""
        if self.landmarks is None:
            return None
        lm = self.landmarks.landmark[index]
        return (lm.x, lm.y, lm.z)

    def get_landmark_pixel(self, index, frame_shape):
        """특정 랜드마크의 픽셀 좌표 반환 (x, y)"""
        if self.landmarks is None:
            return None
        h, w, _ = frame_shape
        lm = self.landmarks.landmark[index]
        return (int(lm.x * w), int(lm.y * h))

    def get_finger_states(self):
        """
        각 손가락의 펴짐 상태를 반환
        Returns: [thumb, index, middle, ring, pinky] - 1=펴짐, 0=접힘
        """
        if self.landmarks is None:
            return None

        fingers = []
        lm = self.landmarks.landmark

        # 엄지: 좌우 방향으로 판단 (핸드 방향에 따라 다름)
        if self.handedness == "Right":
            fingers.append(1 if lm[self.THUMB_TIP].x < lm[self.THUMB_MCP].x else 0)
        else:
            fingers.append(1 if lm[self.THUMB_TIP].x > lm[self.THUMB_MCP].x else 0)

        # 나머지 손가락: y 좌표로 판단 (tip이 pip보다 위에 있으면 펴짐)
        for tip, pip in [
            (self.INDEX_TIP, self.INDEX_PIP),
            (self.MIDDLE_TIP, self.MIDDLE_PIP),
            (self.RING_TIP, self.RING_PIP),
            (self.PINKY_TIP, self.PINKY_PIP),
        ]:
            fingers.append(1 if lm[tip].y < lm[pip].y else 0)

        return fingers

    def get_distance(self, idx1, idx2):
        """두 랜드마크 사이의 정규화된 거리 반환"""
        if self.landmarks is None:
            return None
        lm = self.landmarks.landmark
        dx = lm[idx1].x - lm[idx2].x
        dy = lm[idx1].y - lm[idx2].y
        return np.sqrt(dx * dx + dy * dy)

    def get_thumb_direction(self):
        """엄지 방향 판단: 'up', 'down', 'left', 'right', 'neutral'"""
        if self.landmarks is None:
            return "neutral"

        lm = self.landmarks.landmark
        dx = lm[self.THUMB_TIP].x - lm[self.THUMB_MCP].x
        dy = lm[self.THUMB_TIP].y - lm[self.THUMB_MCP].y

        if abs(dy) > abs(dx):
            return "up" if dy < 0 else "down"
        else:
            return "right" if dx > 0 else "left"

    def draw(self, frame):
        """프레임에 손 랜드마크와 연결선 그리기"""
        if self.landmarks is not None:
            self.mp_draw.draw_landmarks(
                frame, self.landmarks, self.mp_hands.HAND_CONNECTIONS
            )
        return frame

    def release(self):
        """리소스 해제"""
        self.hands.close()
