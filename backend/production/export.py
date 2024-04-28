# %%
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# %%
tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-base")
model = AutoModelForSequenceClassification.from_pretrained(
    "chreh/persuasive_language_detector", revision="roberta"
)

# %%
model.save_pretrained("roberta_model", safe_serialization=False)

# %%
tokenizer.save_pretrained("roberta_model")

# %%
# !torch-model-archiver --model-name "bert" --version 1.0 --serialized-file ./bert_model/pytorch_model.bin --extra-files "./bert_model/config.json,./bert_model/vocab.txt,./bert_model/tokenizer.json,./bert_model/tokenizer_config.json,./bert_model/special_tokens_map.json" --handler "./berthandler.py"
