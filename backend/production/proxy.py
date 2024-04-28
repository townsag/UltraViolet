from flask import Flask, request
from flask_restful import Resource, Api
from flask_cors import CORS
import os
import requests
from gevent import pywsgi
from typing import List, Union
from collections import OrderedDict


# credit to https://www.geeksforgeeks.org/lru-cache-in-python-using-ordereddict/
class LRUCache:
    # initialising capacity
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity

    # we return the value of the key
    # that is queried in O(1) and return -1 if we
    # don't find the key in out dict / cache.
    # And also move the key to the end
    # to show that it was recently used.
    def get(self, key: str) -> Union[int, bool]:
        if key not in self.cache:
            return -1
        else:
            self.cache.move_to_end(key)
            return self.cache[key]

    # first, we add / update the key by conventional methods.
    # And also move the key to the end to show that it was recently used.
    # But here we will also check whether the length of our
    # ordered dictionary has exceeded our capacity,
    # If so we remove the first key (least recently used)
    def put(self, key: str, value: bool) -> None:
        self.cache[key] = value
        self.cache.move_to_end(key)
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)


app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
api = Api(app)
forward_port: int = 5000

# arbitrary number; can be made larger w/ relatively little memory cost
cache = LRUCache(2**14)


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
        {'text':List[str]}
        Response:
        List[bool]
        """
        try:
            data = request.get_json()

            if data:
                result: List[bool] = list(map(lambda _: -1, range(len(data["text"]))))
                to_fill = []
                outgoing_req = {"text": []}

                # use cached responses
                for idx, item in enumerate(data["text"]):
                    if cache.get(item) != -1:  # item in cache
                        result[idx] = cache.get(item)
                    else:
                        to_fill.append(idx)
                        outgoing_req["text"].append(item)

                # if we need to send new requests, do so
                if len(outgoing_req["text"]) != 0:
                    server_responses: List[bool] = requests.post(
                        f"http://localhost:{forward_port}/predictions/roberta",
                        json=outgoing_req,
                    ).json()

                    # cache all responses
                    for i in range(len(server_responses)):
                        result_idx = to_fill[i]
                        label = server_responses[i]
                        req = data["text"][i]
                        cache.put(req, label)
                        result[result_idx] = label

                return result
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
