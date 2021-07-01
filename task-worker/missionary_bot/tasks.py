import os
import threading, queue
from multiprocessing import Process, cpu_count
import logging
from PIL import Image
import qrcode
import urllib.request
from time import sleep

from celery import Celery

from .bot import MissionaryBot
from .config import config

celery = Celery('tasks', broker=os.getenv("RABBITMQ_URL"), backend=os.getenv("REDISCLOUD_URL"))
#jesus_bg = Image.open(urllib.request.urlopen(
#    "https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/qr-code/jesus_template.png").read())

@celery.task(reply_to='results')
def test_task(task_info):
    task_info['results'] = task_info['text']
    return task_info

results = {}
@celery.task(reply_to='results')
def get_profile_links(task_info):
    """
    Task Info: sheet_url: where to insert the results
               data: {url:[names to find]}
               type: get_profile_links
               results: {name:url}
    """
    workQ = queue.Queue()
    resultsQ = queue.Queue()
    def worker(queue):
        global results
        try:
            bot = MissionaryBot(config=config['default'])
            bot.language = os.getenv("FACEBOOK_LANGUAGE")
            bot.authenticate_with_facebook()
            while True:
                item = queue.get()
                print(f'Working on {item}')
                for name in item[1]:
                    if name in results.keys():
                        item[1].remove(name)
                profile_links = bot.scrape_post_reactions_for_people(item[0], item[1])
                resultsQ.put(profile_links)
                print(f'Finished {item}')
                queue.task_done()
                if queue.empty():
                    bot.wd.quit()
                    break
        except:
            bot.wd.quit()
    def merge_results(queue):
        global results
        while True:
            obj = queue.get()
            if obj is not None:
                results = {**results, **obj}

    for key, value in task_info['data'].items():
        workQ.put([key, value])
    print('All task requests sent\n', end='')
    threading.Thread(target=merge_results, daemon=True, args=[resultsQ], name="Merge Results").start()

    # for _ in range(cpu_count()):
    for _ in range(2):
        threading.Thread(target=worker, daemon=True, name=f"Profile_worker_{_}", args=[workQ]).start()
        sleep(5) # Don't like but facebook don't like to multiple simultaeneous logins

    workQ.join()
    print('All work completed')
    task_info['results'] = results

    return task_info

@celery.task
def find_member_profiles(task_info):
    def do_work(kwargs):
        MissionaryBot(**kwargs).do_work()
    try:
        p = Process(target=do_work, args=(task_info,))
        p.start()
        return "Started process"
    except Exception as e:
        logging.error(e)
        return f"{e} Didn't completed loading Facebook profile information"
"""
@celery.task
def create_pass_along_cards(task_info):
    #Take a string and encode onto a jesus background with qr code
    try:
        assert task_info.get('text') is not None
        # Open the template
        img_bg = jesus_bg
        qr_code_text = task_info.get('text')
        # Make the qr code
        qr = qrcode.QRCode(box_size=2, border=0)
        qr.add_data(qr_code_text)
        qr.make()
        img_qr = qr.make_image(fit=True)
        img_qr = img_qr.resize(
            (int(img_bg.size[0] * 0.53), int(img_bg.size[0] * 0.53)))
        # Paste the qr code onto the image
        pos = (int(img_bg.size[0] * 0.23), int(img_bg.size[1] * 0.65))
        img_bg.paste(img_qr, pos)
    finally:
        return img_bg
"""


@celery.task
def insert_row_in_sheet(task_info):
    """ Insert a row into the users sheet and into the db"""
    pass

@celery.task
def add_friend(task_info):
    pass

@celery.task
def send_message(task_info):
    pass

@celery.task
def get_all_page_followers(task_info):
    pass

@celery.task
def get_all_page_likes(task_info):
    pass

@celery.task
def get_group_members(task_info):
    pass
