# Task Worker

This project is the bot that will go through facebook to pull profile links.

Prerequisites to running the task-worker bot:
- A worker.env file with all your environment variables in the task-worker directory
- [Docker](https://docs.docker.com/get-docker/) installed on your local machine
- [Python](https://www.python.org/downloads/) installed on your machine. (Currently Running fine on Python 3.9)
  - Technically you don't need this to run the bot, but you need it for pretty much anything else
- [VNC Viewer](https://www.realvnc.com/en/connect/download/viewer/)
  - Not required for the worker, but is used for debugging and seeing the bot at work

## Worker.env file
File to house all the necessary variables used by the task-worker bot. Create the file and populate these fields
```
BUCKET_NAME=
RABBITMQ_URL=
FACEBOOK_USERNAME=
FACEBOOK_PASSWORD=
FACEBOOK_LANGUAGE=
CHURCH_USERNAME=
CHURCH_PASSWORD=
```

- **Bucket Name** is the appspot bucket url found on [Google Cloud](https://console.cloud.google.com/storage/browser?project=eighth-vehicle-287322).
- **RabbitMQ_URL** is the url for the rabbitMQ queue. Found on [CloudAMPQ](https://customer.cloudamqp.com/)
- **Facebook Username and Password** are for your local facebook account that the bot will run on
- **Church Username and Password** are for your personal church account. 
  - Currently required for the bot to run, but is tied to deprecated code, will be taken out eventually

## Docker
Once you have docker installed you may also install the VScode extension called docker. This will make running the worker much easier.

To run the task-worker simply use docker-compose to compose up the docker-compase.yaml file. 
If you have the extension simply right click on the file and click compose up

Once the Docker Container is composed up you can view the logs to make sure your worker is running.
- If you have the Docker extension
  - Click on the Whale icon on the left bar.
  - Right click the task-worker image (The one with the green play button) and hit *view logs*
- Otherwise if you ran docker compose from the terminal you should be able to see the logs running

## VNC Viewer
Before you can view the worker working make sure this line is commented out in task-worker/bot.py

`self.chrome_options.add_argument("--headless")`
- That line will help the bot run faster, but it means we can't see whats going on with VNC Viewer

Once your ready start your docker container, then open up VNC Viewer
- Click *file* > *New Connection*
- The VNC Server is `localhost:5900`
- Choose a name, then hit ok
- Open the connection you just made. If your container is running it should ask you for a password
  - The default password to selenium running on your local machine is `secret`

At this point if your task worker is currently working on a task you should see browser windows working on their task to look for profile links
