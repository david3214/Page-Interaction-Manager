import os
import threading
import queue
from multiprocessing import Process, cpu_count
import logging
from PIL import Image
import qrcode
import urllib.request
from time import sleep

from celery import Celery
from celery.signals import worker_process_init, worker_shutdown

from .bot import MissionaryBot
from .config import config
from .errors import BlockedError

celery = Celery('tasks', broker=os.getenv("RABBITMQ_URL"),
                backend='rpc://')
# jesus_bg = Image.open(urllib.request.urlopen(
#    "https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/qr-code/jesus_template.png").read())

bots = []
NUMBER_OF_BOTS = 2

# Delay in seconds for facebook tasks that are blocked
RETRY_DELAY = 12 * 60 * 60

# Church Facebook Post for checking Blocked Status
RESTORATION_PROCLAMATION = 'https://www.facebook.com/18523396549/videos/159489765301266'

def check_bots_health():
    global bots
    try:
        if len(bots) < NUMBER_OF_BOTS:
            raise Exception()
        for bot in bots:
            bot.wd.title
        return True
    except:
        print('Bad Webdriver')
        return False


def create_bots(**kwargs):
    global bots, NUMBER_OF_BOTS
    # remove old bots, if they can't quit they already have, and it will throw an error
    if len(bots):
        print('Clearing {} old bots'.format(len(bots)))
        for bot in bots:
            try:
                bot.wd.quit()
            except:
                pass
    bots.clear()
    print('Creating {} bots'.format(NUMBER_OF_BOTS))
    for i in range(NUMBER_OF_BOTS):
        bot = MissionaryBot(config=config['default'])
        bot.language = os.getenv("FACEBOOK_LANGUAGE")
        bot.authenticate_with_facebook()
        bots.append(bot)
        sleep(5)  # Don't like but facebook don't like to multiple simultaeneous logins


@worker_process_init.connect
def init_worker(**kwargs):
    global bots
    create_bots()


@worker_shutdown.connect
def shutdown_worker(**kwargs):
    for i in range(len(bots)):
        bots[i].wd.quit()


@celery.task(reply_to='results')
def test_task(task_info):
    task_info['results'] = task_info['text']
    return task_info


@celery.task(bind=True, reply_to='results', default_retry_delay=RETRY_DELAY, retry_kwargs={'max_retries': 3})
def get_profile_links(self, task_info):
    """
    Task Info: sheet_url: where to insert the results
               data: {url:[names to find]}
               type: get_profile_links
               results: {name:url}
    """
    global bots, RESTORATION_PROCLAMATION
    results = {}
    # If task worker is idle for a while the webDrivers will quit
    if not check_bots_health():
        create_bots()
    # TODO: Don't force sucessive blocked tasks to still access facebook to see if blocked
    if bots[0].facebook_blocked(RESTORATION_PROCLAMATION):
        print('Blocked By Facebook')
        self.retry(exe=BlockedError('User Blocked by Facebook'))
    workQ = queue.Queue()
    resultsQ = queue.Queue()

    def worker(queue, bot):
        nonlocal results
        try:
            while True:
                item = queue.get()
                print(f'Working on {item}')
                # Filters out all names that have already been done
                item[1][:] = [name for name in item[1] if (name not in results.keys() or results[name] == 'Not Found')]
                profile_links = bot.scrape_post_reactions_for_people(
                    item[0], item[1])
                resultsQ.put(profile_links)
                print(f'Finished {item}')
                queue.task_done()
                if queue.empty():
                    break
                # Empty the Queue if blocked by Facebook
                if results.get('BlockedError'):
                    while not queue.empty():
                        try:
                            queue.get()
                            queue.task_done()
                        except:
                            pass
                    break
        except:
            pass


    def merge_results(queue):
        nonlocal results
        while True:
            obj = queue.get()
            if obj is not None:
                results = {**results, **obj}

    for key, value in task_info['data'].items():
        workQ.put([key, value])
        # Fill in defaults of Not Found for all profiles.
        if len(value):
            resultsQ.put({el: 'Not Found' for el in value})
    print('All task requests sent\n', end='')
    threading.Thread(target=merge_results, daemon=True, args=[
                     resultsQ], name="Merge Results").start()

    for _ in range(NUMBER_OF_BOTS):
        threading.Thread(target=worker, daemon=True, name=f"Profile_worker_{_}", args=[
                         workQ, bots[_]]).start()
    workQ.join()

    # Task can't return partial results, all the results had defaults of Not Found
    if results.get('BlockedError'):
        print('Blocked By Facebook')
        self.retry(exe=BlockedError('User Blocked by Facebook'))
    
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
