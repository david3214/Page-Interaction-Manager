""" Used for interacting with redis and queue """
import os
import pickle
import gzip
import urllib.parse

from flask import Flask, request
import redis

from snippets import create_tasks_with_data

url = urllib.parse.urlparse(os.environ.get('REDISCLOUD_URL'))
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)
app = Flask(__name__)
project = os.environ.get("PROJECT")
location = os.environ.get("LOCATION")
queue = os.environ.get("QUEUE")

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
        area_book_results = pickle.loads(r.get(church_username + ':area_book_results'))
        long_status = f'There are {r.llen(church_username + ":facebook_search_results")} people in queue.\
          Status: {r.get(church_username + ":status").decode("utf-8")}\
          Total: {len(area_book_results)}\
          Completed: {pops}\
          Remaining: {len(area_book_results) - pops}'
        return long_status
      except:
        return r.get(church_username + ":status")
    else:
      return "No Bot with that name"

  elif request.method == "POST":
    # Create Bot
    church_username = request.form['church_username']
    church_password = request.form['church_password']
    facebook_username = request.form['facebook_username']
    facebook_password = request.form['facebook_password']
    pros_area_id = request.form['pros_area_id']
    try:
      if (church_username == None or church_password == None or facebook_username == None or facebook_password == None or pros_area_id == None):
        raise ValueError
      if r.exists(church_username + ":status"):
        return "Bot already exist"
      else:
        data = request.form
        create_tasks_with_data(project, location, queue, data)
        return f"added bot {church_username}"
    except Exception as e:
      return f"Exception: {e}"

  elif request.method == "DELETE":
    #Remove bot
    church_username = urllib.parse.unquote_plus(args['church_username'])
    try:
      if r.exists(church_username + ":status"):
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

if __name__ == '__main__':
  app.run(host='127.0.0.1', port=8080, debug=True)