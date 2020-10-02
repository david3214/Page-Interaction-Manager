from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

# Send help instruction
@app.route("/help")
def help():
    return """Watch the video to learn how to use this program"""


@app.route("/privacy")
def privacy():
  return render_template('privacy.html')


@app.route("/")
def main():
  return render_template('index.html')


@app.route("/support")
def support():
  return "Email me at ***REMOVED***"

@app.route("/post-install-tip")
def post_install_tip():
  return "Click the run addon button"


@app.route("/terms-of-service")
def terms_of_service():
  return render_template('terms_of_service.html')


@app.route('/google46b0d5ef2ffda0c5.html')
def google_verification():
  return render_template('google46b0d5ef2ffda0c5.html')


@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('assets', path)


if __name__ == '__main__':
  app.run(host='localhost', port=5000, debug=True, ssl_context='adhoc')