from openai import OpenAI

client = OpenAI(api_key="sk_live_t8gL5Q5LLXdQctKyZBxGpV16DuEL0R-Pz5xZ-Ye8j4E")

try:
    r = client.embeddings.create(
        model="text-embedding-3-small",
        input="Привет"
    )
    print("OK")
    print(len(r.data[0].embedding))
except Exception as e:
    print("ERROR:", repr(e))