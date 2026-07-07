"""GET /api/health — Simple health check endpoint."""

from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "livo-ai-pronunciation-coach"})
