from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch
from flask import Flask, request, redirect
from flask_restful import Resource, Api
from flask_cors import CORS
import os

try:
    import intel_extension_for_pytorch as ipex

    has_ipex = True
except ImportError:
    has_ipex = False

# setup device
if torch.cuda.is_available():
    device = "cuda"
elif hasattr(torch, "xpu") and torch.xpu.is_available():
    device = "xpu"
else:
    device = "cpu"

tokenizer = AutoTokenizer.from_pretrained("bert-large-cased")
model = AutoModelForSequenceClassification.from_pretrained(
    "chreh/persuasive_language_detector"
).to(device)

if has_ipex:
    ipex.optimize(model, dtype=torch.bfloat16)

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
api = Api(app)


class Status(Resource):
    def get(self):
        return {"status": "alive"}

    def post(self):
        try:
            value = request.get_json()
            if value:
                return {"posted_values": value}, 201

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
            with torch.no_grad():
                label = torch.argmax(
                    model(
                        **tokenizer(
                            data["text"], return_tensors="pt", truncation=True
                        ).to(device)
                    ).logits,
                    dim=-1,
                )[0]
            label = True if label == 1 else False
            return {"label": label}

        except Exception as error:
            return {"error": str(error)}


api.add_resource(Status, "/")
api.add_resource(GetPredictionOutput, "/predict")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
