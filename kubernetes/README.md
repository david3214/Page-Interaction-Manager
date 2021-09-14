# Kubernetes

We use kubernetes to host app on google cloud.

The logs for production can be found [here](https://console.cloud.google.com/kubernetes/deployment/us-central1/backend-cluster/default/app/logs?project=eighth-vehicle-287322)

### Minikube Instances
This has deployments for running a kubernetes cluster locally on your machine using minikube.
You will want to create an env-configmap.yaml with format like

```
kind: ConfigMap
metadata:
  labels:
    app: app-env
  name: env

apiVersion: v1
data:
  # Secrets for task-worker
  BUCKET_NAME:
  FACEBOOK_USERNAME:
  FACEBOOK_PASSWORD:
  FACEBOOK_LANGUAGE:
  RABBITMQ_URL:
  DRIVER_URL: http://localhost:4444/wd/hub

  # Secrets for app
  DATABASE_URL:
  CELERY_BROKER_URL:
  CLIENT_SECRETS_FILE: /keys/missionary_tools_client_secret.json
  PORT: "5000"
  FLASK_CONFIG: testing

  # Secrets for testing app
  TEST_RABBITMQ_URL: amqps://admin:mypass@rabbit/testing
  TEST_DATABASE_URL: mysql+pymysql://root:example@mysql:3306/testing
```

### Prod Examples

These are yaml files pulled from the production files in 7/1/21
