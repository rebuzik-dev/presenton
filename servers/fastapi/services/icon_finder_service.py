import asyncio
import json
import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from utils.get_env import get_app_data_directory_env
import os

class IconFinderService:
    def __init__(self):
        self.collection_name = "icons"

        
        app_data_dir = get_app_data_directory_env()
        chroma_path = os.path.join(app_data_dir, "chroma") if app_data_dir else "chroma"
        
        self.client = chromadb.PersistentClient(
            path=chroma_path, settings=Settings(anonymized_telemetry=False)
        )
        print("Initializing icons collection...")
        self._initialize_icons_collection()
        print("Icons collection initialized.")

    def _initialize_icons_collection(self):
        app_data_dir = get_app_data_directory_env()
        chroma_path = os.path.join(app_data_dir, "chroma") if app_data_dir else "chroma"

        self.embedding_function = ONNXMiniLM_L6_V2()
        self.embedding_function.DOWNLOAD_PATH = os.path.join(chroma_path, "models")
        self.embedding_function._download_model_if_not_exists()
        try:
            self.collection = self.client.get_collection(
                self.collection_name, embedding_function=self.embedding_function
            )
        except Exception:
            with open("assets/icons.json", "r") as f:
                icons = json.load(f)

            documents = []
            ids = []

            for i, each in enumerate(icons["icons"]):
                if each["name"].split("-")[-1] == "bold":
                    doc_text = f"{each['name']} {each['tags']}"
                    documents.append(doc_text)
                    ids.append(each["name"])

            if documents:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    embedding_function=self.embedding_function,
                    metadata={"hnsw:space": "cosine"},
                )
                self.collection.add(documents=documents, ids=ids)

    async def search_icons(self, query: str, k: int = 1):
        result = await asyncio.to_thread(
            self.collection.query,
            query_texts=[query],
            n_results=k,
        )
        return [f"/static/icons/bold/{each}.svg" for each in result["ids"][0]]


ICON_FINDER_SERVICE = IconFinderService()
