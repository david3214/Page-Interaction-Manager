FROM python:3.8.5-alpine

WORKDIR /project

ADD . /project

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD [ "python", "app.py" ]