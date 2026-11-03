"""Create a chat session for promptfoo runs and print shell exports for it."""
from kb_client import KnowledgeBotClient

kb = KnowledgeBotClient()
print(f"export KB_SESSION_ID={kb.session_id}")
print(f"export KB_USER_ID={kb.user_id}")
kb.close()
