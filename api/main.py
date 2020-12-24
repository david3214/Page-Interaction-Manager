""" Used for interacting with redis and queue """
import os
import json
import pickle
import gzip
import urllib.parse
from io import BytesIO
from pathlib import Path

import pandas as pd
import pyarrow as pa
from flask import Flask, request, send_file, jsonify, abort
import redis
from PIL import Image
import qrcode

from snippets import create_tasks_with_data_v2

url = urllib.parse.urlparse(os.environ.get('REDISCLOUD_URL'))
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)
app = Flask(__name__)
project = os.environ.get("PROJECT")
location = os.environ.get("LOCATION")
queue = os.environ.get("QUEUE")
context = pa.default_serialization_context()

@app.route('/')
def hello():
    """Basic index to verify app is serving."""
    return 'Hello World!'

@app.route('/bot', methods=['GET', 'POST', 'DELETE'])
def bot():
  args = request.args
  if request.method == "GET":
    church_username = urllib.parse.unquote_plus(args['church_username'])
    # Get status
    if r.exists(church_username + ":status"):
      try:
        pops = int(r.get(church_username + ":current_index"))
        area_book_results = context.deserialize(r.get(church_username+':area_book_results'))
        long_status = f'There are {r.llen(church_username + ":facebook_search_results")} people in queue.\
          Status: {r.get(church_username + ":status").decode("utf-8")}\
          Total: {len(area_book_results.index)}\
          Completed: {pops}\
          Remaining: {len(area_book_results.index) - pops}'
        return long_status
      except Exception as e:
        print(e)
        return r.get(church_username + ":status")
    else:
      return "Bot not created yet"

  elif request.method == "POST":
    # Create Bot
    church_username = request.form['church_username']
    church_password = request.form['church_password']
    facebook_username = request.form['facebook_username']
    facebook_password = request.form['facebook_password']
    try:
      if (church_username == None or church_password == None or facebook_username == None or facebook_password == None):
        raise ValueError
      if r.exists(church_username + ":status"):
        return "Bot already exist"
      else:
        payload = request.form
        create_tasks_with_data_v2('http://35.224.213.80/find_member_profiles', payload)
        #create_tasks_with_data(project, location, queue, 'https://96.3.72.48/find_member_profiles', payload)
        return f"added bot {church_username}"
    except Exception as e:
      return f"Exception: {e}"

  elif request.method == "DELETE":
    #Remove bot
    church_username = urllib.parse.unquote_plus(args['church_username'])
    try:
      if r.exists(church_username + ":status"):
        r.delete(church_username + ":alive")
        r.delete(church_username + ":status")
        r.delete(church_username + ":current_index")
        r.delete(church_username + ':area_book_results')
        r.delete(church_username + ":facebook_key")
        r.delete(church_username + ":facebook_search_results")
        return f"Removed bot {church_username}"
    except:
      return "Missing bot name"
  return 'done'


#@app.route("/proxy-data/<site>")
##@cache.cached(timeout=3600)
#def pass_data_view(site):
#  args = request.args
#  url = urllib.parse.unquote_plus(args['url'])
#  if site == "facebook":
#    facebook_username = urllib.parse.unquote_plus(args['facebook_username'])
#    facebook_password = urllib.parse.unquote_plus(args['facebook_password'])
#    bot = MissionaryBot(church_username="proxy", facebook_username=facebook_username, facebook_password=facebook_password)
#    bot.authenticate_with_facebook()
#    # Scroll to botom to get all the data
#  elif site == "church":
#    church_username = urllib.parse.unquote_plus(args['church_username'])
#    church_password = urllib.parse.unquote_plus(args['church_password'])
#    bot = MissionaryBot(church_username=church_username, church_password=church_password)
#    bot.authenticate_with_church()
#
#  return bot.pass_data(url)


@app.route("/get-next-profile")
def get_next_profile():
  args = request.args
  church_username = urllib.parse.unquote_plus(args['church_username'])
  if r.exists(church_username + ":status"):
    try:
      results = r.lpop(church_username + ":facebook_search_results")
      if results:
        results = gzip.decompress(results)
        r.incr(church_username + ":current_index")
      else:
        raise Exception
    except:
      results = {'about':'No People Ready', 'content': ''}
    finally:
      return results
  else:
    return {'about':'No bots with that name', 'content': ''}

"""
Add key for facebook 2 factor authentication
"""
@app.route("/add-key", methods=['POST'])
def add_key():
  try:
    if request.method == "POST":
      if request.form['key'] == "" or request.form['church_username'] == "":
        raise ValueError
      else:
        key = request.form['key']
        church_username = request.form['church_username']
        r.set(church_username + ":facebook_key", key)
        return "✅"
    else:
      return "❌"
  except Exception as e:
    print(e)
    return "❌"
    
#@app.route('/get-missionary-emails')
#def get_missionary_emails():
#  args = request.args
#  church_username = urllib.parse.unquote_plus(args['church_username'])
#  church_password = urllib.parse.unquote_plus(args['church_password'])
#  bot = MissionaryBot(church_username=church_username, church_password=church_password)
#  return bot.get_missionary_emails()

def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG', quality=95)
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

@app.route('/pass_along_cards', methods=['GET'])
def pass_along_cards():
  """
  Take a string and encode onto a jesus background with qr code
  """
  try:
    assert request.args.get('text') is not None
    jesus_bg = Image.open(Path("jesus_template.png"))
    # Open the template
    img_bg = jesus_bg
    # Make the qr code
    qr = qrcode.QRCode(box_size=2, border=0)
    qr.add_data(request.args.get('text'))
    qr.make()
    img_qr = qr.make_image(fit=True)
    img_qr = img_qr.resize((int(img_bg.size[0] * 0.53), int(img_bg.size[0] * 0.53)))
    # Paste the qr code onto the image
    pos = (int(img_bg.size[0] * 0.23), int(img_bg.size[1] * 0.65))
    img_bg.paste(img_qr, pos)
    

  #except Exception as e:
  #  print(e)
  #  results = e
  #  return results
  finally:
    return serve_pil_image(img_bg)


@app.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404


@app.route('/page-interaction-manager/credentials', methods=['POST', 'GET', 'DELETE'])
def credentials():
    """ Handle the credentials """
    if request.method == "POST":
        for page in request.json['data']:
            r.sadd(f"PIM:{page['id']}", json.dumps(page))
        return json.dumps({'success':True}), 200, {'ContentType':'application/json'} 
    if request.method == "GET":
      results = str(r.smembers(f"PIM:{request.args['id']}"))
      return jsonify(results)
    if request.method == "DELETE":
      key = f"PIM:{request.args['page_id']}"
      for page in r.sscan_iter(key):
        page = json.loads(page)
        if page['google_sheets']['id'] == request.args['sheet_id']:
          resp = r.srem(key, json.dumps(page))
          return jsonify(resp)
      abort(404, description="Resource not found")

if __name__ == '__main__':
  app.run(host='127.0.0.1', port=5001, debug=True)