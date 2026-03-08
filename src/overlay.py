"""
Overlay - 카메라 피드 위에 제스처 정보를 표시하는 OSD 모듈
"""

import cv2


class Overlay:
    """카메라 피드에 상태 정보를 오버레이"""

    # 제스처별 표시 아이콘/텍스트
    GESTURE_LABELS = {
        "mouse_move": "MOVE",
        "left_click": "CLICK",
        "right_click": "R-CLICK",
        "drag": "DRAG",
        "scroll_up": "SCROLL UP",
        "scroll_down": "SCROLL DOWN",
        "volume_up": "VOL +",
        "volume_down": "VOL -",
        "tab_switch": "TAB",
        "close_tab": "CLOSE TAB",
        "idle": "...",
    }

    def __init__(self):
        self._action_log = []

    def draw(self, frame, gesture=None, action_result=None, fps=0):
        """프레임에 오버레이 정보 그리기"""
        h, w, _ = frame.shape

        # 반투명 상단 바
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 50), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        # FPS 표시
        cv2.putText(frame, f"FPS: {fps:.0f}", (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        # 제스처 이름 표시
        if gesture:
            label = self.GESTURE_LABELS.get(gesture.name, gesture.name)
            color = (0, 255, 255) if gesture.name != "idle" else (128, 128, 128)
            cv2.putText(frame, label, (w // 2 - 60, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

            # 손가락 상태 표시
            finger_names = ["T", "I", "M", "R", "P"]
            for i, (name, state) in enumerate(zip(finger_names, gesture.fingers)):
                color = (0, 255, 0) if state else (80, 80, 80)
                x = w - 180 + i * 35
                cv2.putText(frame, name, (x, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # 최근 액션 로그
        if action_result:
            self._action_log.append(action_result)
            if len(self._action_log) > 5:
                self._action_log.pop(0)

        for i, log in enumerate(self._action_log[-3:]):
            y = h - 20 - i * 25
            cv2.putText(frame, log, (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # 안내 텍스트
        cv2.putText(frame, "Q: Quit | C: Custom Gesture | H: Help",
                    (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (128, 128, 128), 1)

        return frame
