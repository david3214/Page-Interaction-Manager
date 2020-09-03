#web: gunicorn --workers=1 app:app

import multiprocessing

#bind = "127.0.0.1:8000"
workers = 1 # multiprocessing.cpu_count() * 2 + 1