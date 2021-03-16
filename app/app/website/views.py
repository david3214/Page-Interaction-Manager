from flask import (jsonify, render_template, send_from_directory)
from . import website


@website.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404


@website.route("/")
def main():
    return render_template('index.html')


@website.route("/help")
def help():
    return """Watch the video to learn how to use this program"""


@website.route("/privacy")
def privacy():
    return render_template('privacy.html')


@website.route("/support")
def support():
    return "Email me at ***REMOVED***"


@website.route("/post-install-tip")
def post_install_tip():
    return "Click the run addon button"


@website.route("/terms-of-service")
def terms_of_service():
    return render_template('terms_of_service.html')


@website.route('/google46b0d5ef2ffda0c5.html')
def google_verification():
    return render_template('google46b0d5ef2ffda0c5.html')


@website.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('assets', path)

