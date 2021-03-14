import os
import threading, queue
import multiprocessing

from celery import Celery

from missionary_bot import MissionaryBot

app = Celery('tasks', broker=os.getenv("RABBITMQ_URL"), backend=os.getenv("REDISCLOUD_URL"))

results = {}
@app.task(reply_to='result_queue')
def get_profile_links(missing_links):
    workQ = queue.Queue()
    resultsQ = queue.Queue()
    def worker(queue):
        global results
        try:
            bot = MissionaryBot(facebook_username=os.getenv("FACEBOOK_USERNAME"), 
                                facebook_password=os.getenv("FACEBOOK_PASSWORD"))
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

    for key, value in missing_links.items():
        workQ.put([key, value])
    print('All task requests sent\n', end='')
    threading.Thread(target=merge_results, daemon=True, args=[resultsQ], name="Merge Results").start()

    for _ in range(multiprocessing.cpu_count()):
        threading.Thread(target=worker, daemon=True, name=f"Profile_worker_{_}", args=[workQ]).start()

    workQ.join()
    print('All work completed')
    
    return results

@app.task
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

