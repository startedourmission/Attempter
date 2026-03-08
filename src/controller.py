"""
Controller - 제스처를 컴퓨터 조작으로 변환하는 모듈
"""

import pyautogui
import numpy as np


# PyAutoGUI 안전 설정
pyautogui.FAILSAFE = True  # 마우스를 화면 모서리로 보내면 긴급 중지
pyautogui.PAUSE = 0.01


class Controller:
    """제스처 → 컴퓨터 조작 매핑"""

    def __init__(self, screen_margin=0.1, smoothing_factor=5):
        self.screen_w, self.screen_h = pyautogui.size()
        self.margin = screen_margin
        self.smoothing = smoothing_factor

        # 스무딩을 위한 이전 좌표
        self._prev_x = self.screen_w // 2
        self._prev_y = self.screen_h // 2

        # 중복 실행 방지
        self._last_action = None
        self._action_cooldown = 0

        # 드래그 상태
        self._is_dragging = False

        # 커스텀 제스처 매핑
        self._custom_gestures = {}

    def execute(self, gesture):
        """제스처에 따른 액션 실행"""
        if gesture is None:
            self._on_no_gesture()
            return None

        # 쿨다운 처리
        if self._action_cooldown > 0:
            self._action_cooldown -= 1
            if gesture.name == self._last_action and gesture.name != "mouse_move":
                return None

        action = gesture.name

        # 커스텀 제스처 먼저 확인
        if action in self._custom_gestures:
            return self._execute_custom(action)

        # 기본 액션 실행
        if action == "mouse_move":
            return self._move_mouse(gesture.position)
        elif action == "left_click":
            return self._click("left")
        elif action == "right_click":
            return self._click("right")
        elif action == "drag":
            return self._drag(gesture.position)
        elif action == "scroll_up":
            return self._scroll("up")
        elif action == "scroll_down":
            return self._scroll("down")
        elif action == "volume_up":
            return self._hotkey(["volumeup"])
        elif action == "volume_down":
            return self._hotkey(["volumedown"])
        elif action == "tab_switch":
            return self._hotkey(["ctrl", "tab"])
        elif action == "close_tab":
            return self._hotkey(["ctrl", "w"])

        return None

    def _move_mouse(self, position):
        """정규화 좌표를 화면 좌표로 변환하여 마우스 이동"""
        x, y = position

        # 여백 적용 (손의 인식 범위를 화면 전체에 매핑)
        x = (x - self.margin) / (1.0 - 2 * self.margin)
        y = (y - self.margin) / (1.0 - 2 * self.margin)

        # 0~1 범위로 클램핑
        x = np.clip(x, 0, 1)
        y = np.clip(y, 0, 1)

        # 화면 좌표로 변환
        screen_x = int(x * self.screen_w)
        screen_y = int(y * self.screen_h)

        # 스무딩 (이전 좌표와의 보간)
        screen_x = int(self._prev_x + (screen_x - self._prev_x) / self.smoothing)
        screen_y = int(self._prev_y + (screen_y - self._prev_y) / self.smoothing)

        self._prev_x = screen_x
        self._prev_y = screen_y

        pyautogui.moveTo(screen_x, screen_y, _pause=False)
        return f"move({screen_x}, {screen_y})"

    def _click(self, button):
        """마우스 클릭"""
        self._set_cooldown("left_click" if button == "left" else "right_click", 10)
        pyautogui.click(button=button)
        return f"click({button})"

    def _drag(self, position):
        """드래그 (마우스 누른 채 이동)"""
        if not self._is_dragging:
            pyautogui.mouseDown()
            self._is_dragging = True
        self._move_mouse(position)
        return "drag"

    def _on_no_gesture(self):
        """제스처 없을 때 (드래그 종료 등)"""
        if self._is_dragging:
            pyautogui.mouseUp()
            self._is_dragging = False

    def _scroll(self, direction):
        """스크롤"""
        self._set_cooldown(f"scroll_{direction}", 3)
        amount = 3 if direction == "up" else -3
        pyautogui.scroll(amount)
        return f"scroll({direction})"

    def _hotkey(self, keys):
        """키보드 단축키 실행"""
        key_name = "+".join(keys)
        self._set_cooldown(key_name, 15)
        pyautogui.hotkey(*keys)
        return f"hotkey({key_name})"

    def _set_cooldown(self, action, frames):
        """중복 실행 방지 쿨다운 설정"""
        self._last_action = action
        self._action_cooldown = frames

    # --- 커스텀 제스처 ---

    def register_gesture(self, name, action_type, action_data):
        """
        커스텀 제스처 등록
        action_type: "hotkey", "type", "command"
        action_data: 키 목록, 텍스트, 또는 명령어
        """
        self._custom_gestures[name] = {
            "type": action_type,
            "data": action_data,
        }

    def unregister_gesture(self, name):
        """커스텀 제스처 제거"""
        self._custom_gestures.pop(name, None)

    def _execute_custom(self, name):
        """커스텀 제스처 실행"""
        gesture = self._custom_gestures[name]
        self._set_cooldown(name, 15)

        if gesture["type"] == "hotkey":
            pyautogui.hotkey(*gesture["data"])
            return f"custom_hotkey({'+'.join(gesture['data'])})"
        elif gesture["type"] == "type":
            pyautogui.typewrite(gesture["data"])
            return f"custom_type({gesture['data']})"

        return None
