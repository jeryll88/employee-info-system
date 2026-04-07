from flask import Flask, jsonify
from datetime import date, datetime, timedelta
from flask.json.provider import DefaultJSONProvider
import json

app = Flask(__name__)

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, timedelta):
            total_seconds = int(obj.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return super().default(obj)

app.json = CustomJSONProvider(app)

@app.route('/test')
def test():
    data = {
        'date': date(2026, 4, 7),
        'datetime': datetime(2026, 4, 7, 10, 30, 0),
        'timedelta': timedelta(hours=8, minutes=15)
    }
    return jsonify(data)

if __name__ == '__main__':
    with app.test_client() as client:
        response = client.get('/test')
        print(f"Status: {response.status_code}")
        print(f"Content: {response.get_data(as_text=True)}")
