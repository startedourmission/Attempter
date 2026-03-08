"""
Custom Gesture Manager - 사용자 정의 제스처 등록 및 관리
"""

import yaml
import os


CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "gestures.yaml")


class CustomGestureManager:
    """커스텀 제스처의 등록, 저장, 로드를 관리"""

    def __init__(self, config_path=None):
        self.config_path = config_path or CONFIG_PATH
        self.config = self._load_config()

    def _load_config(self):
        """설정 파일 로드"""
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            return {"custom_gestures": {}}

    def _save_config(self):
        """설정 파일 저장"""
        with open(self.config_path, "w", encoding="utf-8") as f:
            yaml.dump(self.config, f, allow_unicode=True, default_flow_style=False)

    def add_gesture(self, name, finger_pattern, action_type, action_data, description=""):
        """
        커스텀 제스처 추가

        Args:
            name: 제스처 이름 (예: "screenshot")
            finger_pattern: [thumb, index, middle, ring, pinky] (예: [1, 1, 0, 0, 1])
            action_type: "hotkey" | "type"
            action_data: 키 목록 또는 텍스트
            description: 제스처 설명
        """
        if len(finger_pattern) != 5 or not all(f in (0, 1) for f in finger_pattern):
            raise ValueError("finger_pattern은 0과 1로 구성된 5개 요소 리스트여야 합니다")

        # 기본 제스처와 충돌 확인
        conflict = self._check_conflict(finger_pattern)
        if conflict:
            raise ValueError(f"손가락 패턴이 '{conflict}' 제스처와 충돌합니다")

        self.config.setdefault("custom_gestures", {})[name] = {
            "description": description,
            "fingers": finger_pattern,
            "action": action_type,
            "data": action_data,
        }
        self._save_config()

    def remove_gesture(self, name):
        """커스텀 제스처 제거"""
        custom = self.config.get("custom_gestures", {})
        if name not in custom:
            raise KeyError(f"'{name}' 제스처가 존재하지 않습니다")
        del custom[name]
        self._save_config()

    def list_gestures(self):
        """모든 제스처 목록 반환 (기본 + 커스텀)"""
        result = {}

        # 기본 제스처
        defaults = self.config.get("default_gestures", {})
        for name, info in defaults.items():
            result[name] = {
                "type": "default",
                "description": info.get("description", ""),
                "fingers": info.get("fingers", []),
            }

        # 커스텀 제스처
        custom = self.config.get("custom_gestures", {})
        for name, info in custom.items():
            result[name] = {
                "type": "custom",
                "description": info.get("description", ""),
                "fingers": info.get("fingers", []),
                "action": info.get("action", ""),
                "data": info.get("data", ""),
            }

        return result

    def get_custom_gestures(self):
        """커스텀 제스처만 반환"""
        return self.config.get("custom_gestures", {})

    def get_recognition_config(self):
        """인식 설정 반환"""
        return self.config.get("recognition", {})

    def _check_conflict(self, finger_pattern):
        """기본 제스처와의 충돌 확인"""
        defaults = self.config.get("default_gestures", {})
        for name, info in defaults.items():
            if info.get("fingers") == finger_pattern:
                return name

        custom = self.config.get("custom_gestures", {})
        for name, info in custom.items():
            if info.get("fingers") == finger_pattern:
                return name

        return None
