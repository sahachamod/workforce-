import requests
import json
import os
from datetime import datetime

class ApiService:
    def __init__(self, base_url="http://localhost:8001/api/v1", 
                 monitoring_url="http://localhost:8006/api/v1/monitoring",
                 roster_url="http://localhost:8004/api/v1/roster"):
        self.base_url = base_url
        self.monitoring_url = monitoring_url
        self.roster_url = roster_url
        self.token = None

    def set_token(self, token):
        self.token = token

    def login(self, email, password):
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={"email": email, "password": password})
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                # Now fetch user data
                user_response = requests.get(f"{self.base_url}/auth/me", headers=self.get_headers())
                if user_response.status_code == 200:
                    data["user"] = user_response.json()
                    return True, data
                return False, "Failed to fetch user data"
            return False, response.json().get("detail", "Login failed")
        except Exception as e:
            return False, str(e)

    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def log_activity(self, activity_data):
        try:
            response = requests.post(
                f"{self.monitoring_url}/activities",
                json=activity_data,
                headers=self.get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Failed to log activity: {e}")
            return False

    def upload_screenshot(self, filepath, taken_at, score=None):
        try:
            with open(filepath, 'rb') as f:
                files = {'file': f}
                data = {
                    'taken_at': taken_at.isoformat(),
                    'productivity_score': score
                }
                response = requests.post(
                    f"{self.monitoring_url}/screenshots",
                    files=files,
                    data=data,
                    headers=self.get_headers()
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Failed to upload screenshot: {e}")
            return False

    def check_in(self, user_id):
        try:
            response = requests.post(
                f"{self.roster_url}/attendance/checkin",
                params={"user_id": user_id},
                headers=self.get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Check-in Error: {e}")
            return False

    def check_out(self, user_id):
        try:
            response = requests.post(
                f"{self.roster_url}/attendance/checkout",
                params={"user_id": user_id},
                headers=self.get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Check-out Error: {e}")
            return False

    def get_monitoring_rules(self):
        try:
            response = requests.get(f"{self.monitoring_url}/rules", headers=self.get_headers())
            if response.status_code == 200:
                return response.json()
            return []
        except Exception:
            return []
