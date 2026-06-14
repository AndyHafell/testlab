import os
import json
import hmac
from urllib.parse import urlparse
from flask import (Flask, request, render_template, jsonify, abort)
from dotenv import load_dotenv

import db
import elevenlabs_client

load_dotenv()

ALLOWED_EVENT_TYPES = {"chat_start", "conversion"}
MAX_SESSION_ID = 200
MAX_META_CHARS = 2000


def create_app(db_path=None):
    app = Flask(__name__)
    app.config["DB_PATH"] = db_path or os.environ.get("DB_PATH", "sales_agent.db")
    db.init_db(app.config["DB_PATH"])

    def require_token():
        token = request.args.get("token") or ""
        expected = os.environ.get("DASHBOARD_TOKEN", "")
        if not expected or not hmac.compare_digest(token, expected):
            abort(403)

    @app.route("/")
    def landing():
        return render_template(
            "index.html",
            skool_url=os.environ.get("SKOOL_JOIN_URL", "#"),
            agent_id=os.environ.get("ELEVENLABS_AGENT_ID", ""),
        )

    @app.route("/dashboard")
    def dashboard():
        require_token()
        return render_template("dashboard.html", token=request.args.get("token"))

    @app.route("/api/stats")
    def api_stats():
        require_token()
        return jsonify(db.get_stats(app.config["DB_PATH"]))

    def _same_origin():
        # Block cross-site browser writes to this public, unauthenticated endpoint.
        # Allow when no Origin/Referer is present (some privacy modes strip them);
        # only reject a header that IS present but points at a different host.
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        if not origin:
            return True
        return urlparse(origin).netloc == request.host

    @app.route("/api/event", methods=["POST"])
    def api_event():
        if not _same_origin():
            abort(403)
        payload = request.get_json(silent=True)
        if payload is None:
            try:
                payload = json.loads(request.get_data(as_text=True) or "{}")
            except ValueError:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}
        event_type = payload.get("type")
        session_id = payload.get("session_id")
        if event_type not in ALLOWED_EVENT_TYPES or not session_id:
            abort(400)
        if not isinstance(session_id, str) or len(session_id) > MAX_SESSION_ID:
            abort(400)
        meta = payload.get("meta")
        meta_json = json.dumps(meta) if meta is not None else None
        if meta_json is not None and len(meta_json) > MAX_META_CHARS:
            abort(400)
        db.insert_event(app.config["DB_PATH"], session_id, event_type, meta=meta_json)
        return ("", 204)

    @app.route("/api/signed-url")
    def api_signed_url():
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        agent_id = os.environ.get("ELEVENLABS_AGENT_ID")
        if not api_key or not agent_id:
            return jsonify({"error": "ElevenLabs not configured"}), 500
        try:
            signed = elevenlabs_client.get_signed_url(api_key, agent_id)
        except Exception as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"signedUrl": signed})

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5057,
                     debug=os.environ.get("FLASK_DEBUG") == "1")
