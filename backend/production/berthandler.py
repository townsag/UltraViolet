from abc import ABC
import json
import logging
from typing import Dict, List
import os

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ts.torch_handler.base_handler import BaseHandler

logger = logging.getLogger(__name__)


class TransformersClassifierHandler(BaseHandler, ABC):
    """
    Transformers text classifier handler class. This handler takes a text (string) and
    as input and returns the classification text based on the serialized transformers checkpoint.
    """

    def __init__(self):
        super(TransformersClassifierHandler, self).__init__()
        self.initialized = False

    def initialize(self, ctx):
        self.manifest = ctx.manifest

        properties = ctx.system_properties
        model_dir = properties.get("model_dir")
        if torch.cuda.is_available():
            self.device = "cuda"
        elif hasattr(torch, "xpu") and torch.xpu.is_available():
            self.device = "xpu"
        else:
            self.device = "cpu"

        # Read model serialize/pt file
        self.model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)

        self.model.to(self.device)
        self.model.eval()

        logger.debug(
            "Transformer model from path {0} loaded successfully".format(model_dir)
        )

        self.initialized = True

    def preprocess(self, data: List[Dict[str, Dict[str, List[str]]]]):
        """
        Schema:
        Data: [{"body": {"text":List[str]} }, ...]
        """
        logger.info(f"Got {data}")
        sentences = [item["body"]["text"] for item in data]

        logger.info("Received text: '%s'", sentences)

        inputs = [
            self.tokenizer(
                minibatch, return_tensors="pt", truncation=True, padding=True
            )
            for minibatch in sentences
        ]
        return inputs

    def inference(self, inputs):
        """
        Predict the class of a text using a trained transformer model.
        """
        result = []
        with torch.no_grad():
            for inp in inputs:
                prediction = self.model(**inp.to(self.device)).logits.argmax(dim=-1)
                prediction = prediction == 1
                result.append(prediction.cpu().tolist())
        logger.info("Model predicted: '%s'", prediction)

        return result

    def postprocess(self, inference_output):
        return inference_output


_service = TransformersClassifierHandler()


def handle(data, context):
    try:
        if not _service.initialized:
            _service.initialize(context)

        if data is None:
            return None

        data = _service.preprocess(data)
        data = _service.inference(data)
        data = _service.postprocess(data)

        return data
    except Exception as e:
        raise e
