from flask import Flask, request, redirect
from flask_restful import Resource, Api
from flask_cors import CORS
import os
import requests

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
api = Api(app)
forward_port: int = 5000


class Status(Resource):
    def get(self):
        return requests.get(f"http://localhost:{forward_port}/").json()

    def post(self):
        try:
            value = request.get_json()
            if value:
                return requests.post(
                    f"http://localhost:{forward_port}", data=value
                ).json()

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
                    f"http://localhost:{forward_port}/predict", json=data
                ).json()
            return {"error": "Invalid format."}

        except Exception as error:
            return {"error": str(error)}


api.add_resource(Status, "/")
api.add_resource(GetPredictionOutput, "/predict")

if __name__ == "__main__":
    from waitress import serve

    port = int(os.environ.get("PORT", 3000))
    serve(app, host="0.0.0.0", port=port)
