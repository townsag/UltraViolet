from flask import Flask, request, redirect
from flask_restful import Resource, Api
from flask_cors import CORS
import os
import requests
from gevent import pywsgi

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
api = Api(app)
forward_port: int = 5000


class Status(Resource):
    def get(self):
        return requests.get(f"http://localhost:{forward_port}/ping").json()

    def post(self):
        try:
            value = request.get_json()
            if value:
                return {"received_msg": value}

            return {"error": "Invalid format."}

        except Exception as error:
            return {"error": error}


class GetPredictionOutput(Resource):
    def get(self):
        return {"error": "Invalid Method."}

    def post(self):
        """
        Schema:
        {'text':str}
        Response:
        {'label':bool}
        """
        try:
            data = request.get_json()
            if data:
                return requests.post(
                    f"http://localhost:{forward_port}/predictions/bert", json=data
                ).json()
            return {"error": "Invalid format."}

        except Exception as error:
            return {"error": str(error)}


api.add_resource(Status, "/")
api.add_resource(GetPredictionOutput, "/predictions")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))  # should be 443 for https
    ssl_dir = "/etc/letsencrypt/live/ultraviolettext.tech/"
    http_server = pywsgi.WSGIServer(
        listener=("0.0.0.0", port),
        application=app,
        keyfile=ssl_dir + "privkey.pem",
        certfile=ssl_dir + "fullchain.pem",
    )
    http_server.serve_forever()