# Missionary Tools

If you are a missionary and you want to make a tool for everyone please make it here.

[**app**](app/) is the flask app that has the front and backend code functions

[**appscript**](appscript/) has all the code for the addon

[**task-worker**](task-worker/) is the missionary bot module

## External Resources used in this project.

### [Google Cloud](https://cloud.google.com/gcp/)
- Used to host the Google Spreadsheets Add-on via Workspace Marketplace SDK
- Used for a sql database to house spreadsheet data, user preferences etc
- Compute Engine was used in the past for running the task_worker, instead of locally
- Kubernetes Cluster
  - Runs app as a container, for google auth and facebook webhooks to website missionary-tools.com
    - Redirects IP to missionary-tools via an Ingress Controller and Load Balancer 
  - Runs app celery worker as the process results queue
  - Has a Cloud SQL Proxy container for connecting to the sql database
- Buckets store photos etc.
- Depending on Issue #7 a redis database may also be hosted on Google Cloud

### [CloudAMPQ](https://customer.cloudamqp.com/)
- Used to host a RabbitMQ Server, that task_worker and app use.
- When Feature #9 is implemented this will no longer be needed

### [Heroku](https://dashboard.heroku.com/apps)
- Used to house a redis database
- Mainly used by task_worker [bot](task_worker/missionary_bot/bot.py)
- When Issue #7 is implemented this will either be gone, or housed on Google Cloud

### [Facebook API](https://developers.facebook.com/apps/)
- Used for requesting data from facebook for our app
  - We have been denied information on page_messaging many times
- Interacts with a webhook hosted on Google Cloud
- Webhook endpoint is under the messnger section, not webhook.
